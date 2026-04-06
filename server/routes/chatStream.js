/**
 * POST /api/chat/stream — SSE 스트리밍 챗봇 핸들러
 * Claude Sonnet 4.6 + Extended Thinking + Prompt Caching + Tool Use
 *
 * SSE 이벤트 프로토콜:
 *   conversation_id  — { id }
 *   thinking_start   — {}
 *   thinking_end     — {}
 *   text_delta       — { delta }
 *   tool_start       — { name, label }
 *   tool_end         — { name }
 *   chart            — { chartData }
 *   suggestions      — { suggestions: string[] }
 *   done             — { tokenUsage }
 *   error            — { message }
 */

const Anthropic = require('@anthropic-ai/sdk').default;
const { createClient } = require('@supabase/supabase-js');
const TOOL_DEFINITIONS = require('../tools/definitions');
const executeTool = require('../tools/executor');
const DEFAULT_SYSTEM_PROMPT = require('../prompts/system');
const { estimateCost } = require('../utils/tokenCost');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Supabase 서비스 클라이언트
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ─── 시스템 프롬프트 캐시 (5분) ───
let cachedPrompt = null;
let promptCachedAt = 0;
const PROMPT_CACHE_TTL = 5 * 60 * 1000;

async function getSystemPrompt() {
  if (cachedPrompt && Date.now() - promptCachedAt < PROMPT_CACHE_TTL) {
    return cachedPrompt;
  }
  if (supabase) {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'system_prompt')
        .single();
      if (data?.value?.content) {
        cachedPrompt = data.value.content;
        promptCachedAt = Date.now();
        return cachedPrompt;
      }
    } catch (err) {
      console.warn('시스템 프롬프트 DB 조회 실패, 기본값 사용:', err.message);
    }
  }
  cachedPrompt = DEFAULT_SYSTEM_PROMPT;
  promptCachedAt = Date.now();
  return cachedPrompt;
}

// ─── Tool 한국어 레이블 ───
const TOOL_LABELS = {
  query_pl_data: '손익 데이터를 조회하고 있습니다',
  query_sales_cost: '품목별 매출/원가를 분석하고 있습니다',
  query_expense_detail: '비용 상세 내역을 확인하고 있습니다',
  calculate_metrics: '지표를 계산하고 있습니다',
  generate_chart: '차트를 생성하고 있습니다',
};

// ─── Prompt Caching이 적용된 Tool Definitions ───
// 마지막 도구에 cache_control을 부여하면 전체 tools 배열이 캐시됨
const cachedToolDefs = TOOL_DEFINITIONS.map((tool, i, arr) =>
  i === arr.length - 1
    ? { ...tool, cache_control: { type: 'ephemeral' } }
    : tool
);

// ─── 오래된 Tool 결과 압축 (컨텍스트 효율화) ───
function compressOldToolResults(messages, keepRecentTurns = 3) {
  const boundary = messages.length - keepRecentTurns * 2;
  if (boundary <= 0) return messages;

  return messages.map((msg, i) => {
    if (i >= boundary) return msg;
    if (msg.role !== 'user' || !Array.isArray(msg.content)) return msg;
    return {
      ...msg,
      content: msg.content.map(block => {
        if (block.type !== 'tool_result') return block;
        try {
          const p = JSON.parse(block.content);
          return {
            ...block,
            content: JSON.stringify({
              _compressed: true,
              division: p.division || '',
              unit: p.unit || '',
              count: p.count || 0,
              summary: p._note || `${p.count || '?'}건 조회됨`,
            }),
          };
        } catch {
          return block;
        }
      }),
    };
  });
}

/**
 * Express SSE 스트리밍 핸들러
 */
async function chatStreamHandler(req, res) {
  // ─── SSE 헤더 ───
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event, data) => {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  // 클라이언트 연결 해제 감지
  let clientDisconnected = false;
  req.on('close', () => { clientDisconnected = true; });

  // ─── 인증 체크 ───
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    send('error', { message: '인증이 필요합니다. 다시 로그인해주세요.' });
    res.end();
    return;
  }
  if (supabase) {
    // 서버리스 환경에서 getUser(token)은 "Auth session missing!" 에러 발생
    // → JWT payload에서 user id 추출 후 admin API로 검증
    let user = null;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      if (!payload.sub || !payload.exp || payload.exp * 1000 < Date.now()) throw new Error('expired');
      const { data, error } = await supabase.auth.admin.getUserById(payload.sub);
      if (!error && data?.user) user = data.user;
    } catch {}
    if (!user) {
      send('error', { message: '인증이 필요합니다. 다시 로그인해주세요.' });
      res.end();
      return;
    }
    req.userId = user.id;
  }

  try {
    const { message, conversationId, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      send('error', { message: '메시지가 필요합니다.' });
      res.end();
      return;
    }
    if (message.length > 2000) {
      send('error', { message: '메시지가 너무 깁니다. (최대 2000자)' });
      res.end();
      return;
    }

    // conversationId 전달
    const convId = conversationId || null;
    if (convId) send('conversation_id', { id: convId });

    // 시스템 프롬프트
    const systemPrompt = await getSystemPrompt();

    // 대화 이력 구성 (최근 20턴) + 오래된 Tool 결과 압축
    const recentHistory = history.slice(-40);
    const compressedHistory = compressOldToolResults(recentHistory);
    const messages = [
      ...compressedHistory,
      { role: 'user', content: message },
    ];

    const totalTokens = { input: 0, output: 0 };
    let chartData = null;
    let fullText = '';

    // ─── Tool Use 루프 (최대 10회, 60초/호출 타임아웃) ───
    const MAX_ITERATIONS = 10;
    const TIMEOUT_MS = 60000;

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      if (clientDisconnected) break;

      // AbortController 타임아웃
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const stream = anthropic.messages.stream(
          {
            model: 'claude-sonnet-4-6',
            max_tokens: 16000,
            thinking: {
              type: 'enabled',
              budget_tokens: 8000,
            },
            system: [
              {
                type: 'text',
                text: systemPrompt,
                cache_control: { type: 'ephemeral' },
              },
            ],
            tools: cachedToolDefs,
            messages,
          },
          { signal: controller.signal },
        );

        // ─── 스트리밍 이벤트 수신 ───
        let isThinking = false;

        stream.on('contentBlockStart', (event) => {
          const block = event.content_block;
          if (block.type === 'thinking') {
            isThinking = true;
            send('thinking_start', {});
          }
          if (block.type === 'text') {
            if (isThinking) {
              isThinking = false;
              send('thinking_end', {});
            }
          }
          if (block.type === 'tool_use') {
            if (isThinking) {
              isThinking = false;
              send('thinking_end', {});
            }
            send('tool_start', {
              name: block.name,
              label: TOOL_LABELS[block.name] || block.name,
            });
          }
        });

        stream.on('text', (text) => {
          fullText += text;
          send('text_delta', { delta: text });
        });

        // 최종 메시지 대기
        const finalMessage = await stream.finalMessage();
        clearTimeout(timer);

        totalTokens.input += finalMessage.usage.input_tokens;
        totalTokens.output += finalMessage.usage.output_tokens;

        // thinking 종료 이벤트 (마지막에 thinking이 남아 있을 경우)
        if (isThinking) send('thinking_end', {});

        // Tool Use 블록 추출
        const toolBlocks = finalMessage.content.filter(b => b.type === 'tool_use');

        if (toolBlocks.length === 0 || finalMessage.stop_reason === 'end_turn') {
          // 최종 응답 — Tool 없음
          break;
        }

        // ─── Tool 실행 (Promise.all 병렬) ───
        messages.push({ role: 'assistant', content: finalMessage.content });

        const toolResults = await Promise.all(
          toolBlocks.map(async (toolUse) => {
            console.log(`  🔧 도구 호출: ${toolUse.name}`, JSON.stringify(toolUse.input).slice(0, 200));
            const result = executeTool(toolUse.name, toolUse.input);
            send('tool_end', { name: toolUse.name });

            if (toolUse.name === 'generate_chart' && result.chartData) {
              chartData = result.chartData;
              send('chart', { chartData: result.chartData });
            }

            return {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(result),
            };
          })
        );

        messages.push({ role: 'user', content: toolResults });

        // 다음 루프에서 텍스트를 초기화 (Tool 후 새 응답)
        fullText = '';

      } catch (streamErr) {
        clearTimeout(timer);
        throw streamErr;
      }
    }

    // ─── 후속 질문 추출 ───
    const sugMatch = fullText.match(/<!--suggestions:(\[.*?\])-->/);
    if (sugMatch) {
      try {
        const suggestions = JSON.parse(sugMatch[1]);
        send('suggestions', { suggestions });
      } catch { /* 파싱 실패 무시 */ }
    }

    // ─── 완료 ───
    const cost = estimateCost(totalTokens.input, totalTokens.output);
    send('done', {
      tokenUsage: {
        input: totalTokens.input,
        output: totalTokens.output,
        estimatedCost: cost,
      },
      conversationId: convId,
    });

  } catch (err) {
    console.error('Chat Stream 오류:', err.name, err.status, err.message);
    if (err.stack) console.error(err.stack);

    let errorMsg = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    if (err.name === 'APIUserAbortError' || err.name === 'AbortError') {
      errorMsg = '응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
    } else if (err.status === 429) {
      errorMsg = 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    } else if (err.status === 529) {
      errorMsg = 'AI 서비스가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.';
    } else if (err.status === 401 || err.message?.includes('API key')) {
      errorMsg = 'AI 서비스 인증에 실패했습니다. 관리자에게 문의해주세요.';
    }

    send('error', { message: errorMsg });
  } finally {
    if (!res.writableEnded) res.end();
  }
}

module.exports = chatStreamHandler;
