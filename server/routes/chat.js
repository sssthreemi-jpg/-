/**
 * POST /api/chat — 챗봇 메시지 처리 라우트
 * Claude Sonnet 4.6 + Tool Use 루프
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

// Supabase 서비스 클라이언트 (JWT 검증용 — 미설정 시 null)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// 시스템 프롬프트 캐시 (5분간 유효)
let cachedPrompt = null;
let promptCachedAt = 0;
const PROMPT_CACHE_TTL = 5 * 60 * 1000;

/**
 * 시스템 프롬프트 로드 — DB 우선, fallback은 파일
 */
async function getSystemPrompt() {
  // 캐시 유효하면 반환
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

/**
 * Claude 응답에서 텍스트, 차트, 테이블 데이터를 분리
 */
function parseAssistantResponse(content) {
  let text = '';
  let chartData = null;
  let tableData = null;

  for (const block of content) {
    if (block.type === 'text') {
      text += block.text;
    }
  }

  return { text, chartData, tableData };
}

/**
 * AbortController 기반 타임아웃 — 실제 HTTP 요청을 취소
 */
function createTimeoutSignal(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

/**
 * Express 라우트 핸들러
 */
async function chatHandler(req, res) {
  // ─── 인증 체크 (Supabase JWT 검증) ───
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: '인증이 필요합니다. 다시 로그인해주세요.' });
  }
  if (supabase) {
    let user = null;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      if (payload.sub && payload.exp && payload.exp * 1000 > Date.now()) {
        const { data, error } = await supabase.auth.admin.getUserById(payload.sub);
        if (!error && data?.user) user = data.user;
      }
    } catch {}
    if (!user) {
      return res.status(401).json({ error: '인증이 필요합니다. 다시 로그인해주세요.' });
    }
    req.userId = user.id;
  }

  try {
    const { message, sessionId, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '메시지가 필요합니다.' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: '메시지가 너무 깁니다. (최대 2000자)' });
    }

    // 시스템 프롬프트 로드 (DB 우선, fallback 파일)
    const systemPrompt = await getSystemPrompt();

    // 대화 이력 검증 + 구성 (프롬프트 인젝션 방지)
    const sanitizedHistory = Array.isArray(history)
      ? history
          .filter(m => m && ['user', 'assistant'].includes(m.role))
          .map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content.slice(0, 2000) : '',
          }))
          .slice(-20)
      : [];
    const messages = [
      ...sanitizedHistory,
      { role: 'user', content: message },
    ];

    let totalTokens = { input: 0, output: 0 };
    let chartData = null;

    // ─── Tool Use 루프 (타임아웃 60초/호출, AbortController 기반) ───
    const TIMEOUT_MS = 60000;
    let maxIterations = 10;

    while (maxIterations-- > 0) {
      const { signal, clear } = createTimeoutSignal(TIMEOUT_MS);
      let response;
      try {
        response = await anthropic.messages.create(
          {
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: systemPrompt,
            tools: TOOL_DEFINITIONS,
            messages,
          },
          { signal },
        );
      } finally {
        clear();
      }

      totalTokens.input += response.usage.input_tokens;
      totalTokens.output += response.usage.output_tokens;

      // 도구 호출이 없으면 최종 답변
      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');

      if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
        const parsed = parseAssistantResponse(response.content);
        const cost = estimateCost(totalTokens.input, totalTokens.output);

        // 빈 응답 처리
        if (!parsed.text && !chartData) {
          return res.json({
            message: '요청을 처리했으나 결과가 없습니다. 질문을 다시 한 번 말씀해주세요.',
            chartData: null,
            tableData: null,
            tokenUsage: { input: totalTokens.input, output: totalTokens.output, estimatedCost: cost },
          });
        }

        return res.json({
          message: parsed.text,
          chartData: chartData || parsed.chartData,
          tableData: parsed.tableData,
          tokenUsage: { input: totalTokens.input, output: totalTokens.output, estimatedCost: cost },
        });
      }

      // ─── 도구 실행 ───
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = toolUseBlocks.map((toolUse) => {
        console.log(`  🔧 도구 호출: ${toolUse.name}`, JSON.stringify(toolUse.input).slice(0, 200));
        const result = executeTool(toolUse.name, toolUse.input);

        if (toolUse.name === 'generate_chart' && result.chartData) {
          chartData = result.chartData;
        }

        return {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        };
      });
      messages.push({ role: 'user', content: toolResults });
    }

    return res.status(500).json({ error: '처리 시간이 초과되었습니다. 질문을 간결하게 다시 시도해주세요.' });

  } catch (err) {
    console.error('Chat API 오류:', err.message);

    // 타임아웃 (AbortController 기반)
    if (err.name === 'APIUserAbortError' || err.name === 'AbortError' || err.message === 'TIMEOUT') {
      return res.status(504).json({ error: '응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.' });
    }
    // Anthropic API 오류
    if (err.status === 429) {
      return res.status(429).json({ error: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' });
    }
    if (err.status === 401) {
      return res.status(500).json({ error: 'AI 서비스 연결에 문제가 발생했습니다.' });
    }
    if (err.status === 529) {
      return res.status(503).json({ error: 'AI 서비스가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.' });
    }

    // 그 외 — 내부 에러 정보 노출 금지
    return res.status(500).json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
}

module.exports = chatHandler;
