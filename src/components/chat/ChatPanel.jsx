/**
 * 채팅 패널 — SSE 스트리밍 + Tool 상태 + 대화 이력
 * 데스크탑: 드래그 가능, 모바일: 풀스크린
 */
import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatSuggestions from './ChatSuggestions';
import ToolStatus from './ToolStatus';
import ChatSidebar from './ChatSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useDraggable } from '../../hooks/useDraggable';
import { conversationStorage } from '../../utils/conversationStorage';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const MAX_MESSAGES = 100;

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: '안녕하십니까. 대웅제약 손익분석 AI 비서 **D-체크**입니다.\n\n다음과 같은 질문에 답변드릴 수 있습니다.\n- **사업부별 매출·원가·영업이익** 조회 및 전년비교\n- **품목별 매출/원가** 드릴다운 분석\n- **비용 항목별** 상세 내역 (2022~2025년)\n- **원가율·성장률·목표달성률** 등 파생 지표\n\n아래 추천 질문을 선택하시거나, 직접 질문을 입력해 주십시오.',
};

function useMediaQuery(query) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * SSE 스트림 파서 — fetch ReadableStream에서 SSE 이벤트 추출
 */
async function* parseSSEStream(reader, decoder) {
  let buffer = '';
  let currentEvent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          yield { event: currentEvent, data };
        } catch { /* 파싱 실패 무시 */ }
        currentEvent = '';
      }
    }
  }
}

/** 대화 제목 자동 생성 — 첫 사용자 질문에서 추출 */
function generateTitle(messages) {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser) return '새 대화';
  const text = firstUser.content || '';
  return text.length > 30 ? text.slice(0, 30) + '...' : text;
}

export default function ChatPanel({ isOpen, onClose }) {
  const { session } = useAuth();
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const isMd = useMediaQuery('(min-width: 768px)');
  const { handlers: dragHandlers } = useDraggable(
    { x: typeof window !== 'undefined' ? window.innerWidth - 440 : 400, y: 40 },
    { handleSelector: '[data-drag-handle]', minRight: 420 },
  );
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);
  const [toolStatus, setToolStatus] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // ─── 대화 이력 상태 ───
  const [activeConvId, setActiveConvId] = useState(null);
  const [conversations, setConversations] = useState(() => conversationStorage.list());
  const [showHistory, setShowHistory] = useState(false);

  const bodyRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // 새 메시지 시 자동 스크롤
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading, toolStatus, isThinking]);

  // 모바일 뒤로가기 — 챗봇만 닫기 (앱 종료 방지)
  const historyPushedRef = useRef(false);
  useEffect(() => {
    if (!isOpen || isMd) {
      // 패널이 닫힐 때 (X 버튼 등) pushState한 항목 정리
      if (historyPushedRef.current) {
        historyPushedRef.current = false;
        history.back(); // pushState한 것을 되돌림
      }
      return;
    }
    // 패널이 열릴 때 히스토리 항목 추가
    history.pushState({ chatOpen: true }, '');
    historyPushedRef.current = true;

    const handlePop = (e) => {
      // 뒤로가기로 왔으면 챗봇만 닫기
      historyPushedRef.current = false;
      onClose();
    };
    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
    };
  }, [isOpen, isMd, onClose]);

  // ─── 대화 자동 저장 (메시지 변경 시마다) ───
  useEffect(() => {
    // 환영 메시지만 있으면 저장 안 함
    const hasUserMsg = messages.some(m => m.role === 'user');
    if (!hasUserMsg) return;
    // 스트리밍 중이면 저장 보류
    if (messages.some(m => m.isStreaming)) return;

    const convId = activeConvId || crypto.randomUUID();
    const conv = {
      id: convId,
      title: generateTitle(messages),
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        chartData: m.chartData || null,
        tableData: m.tableData || null,
        isError: m.isError || false,
      })),
      updatedAt: new Date().toISOString(),
      messageCount: messages.filter(m => m.role === 'user').length,
    };

    if (!activeConvId) setActiveConvId(convId);
    conversationStorage.save(conv);
    setConversations(conversationStorage.list());
  }, [messages, activeConvId]);

  // 새 대화 시작 (대화 진행 중이면 확인)
  const handleNewChat = useCallback(() => {
    if (hasStarted && !window.confirm('현재 대화는 자동 저장됩니다.\n새 대화를 시작하시겠습니까?')) {
      return;
    }
    setMessages([WELCOME_MESSAGE]);
    setActiveConvId(null);
    setHasStarted(false);
    setLastFailedMessage(null);
    setSuggestions([]);
    setToolStatus(null);
    setIsThinking(false);
    setIsGenerating(false);
    setShowHistory(false);
  }, [hasStarted]);

  // 이전 대화 불러오기
  const loadConversation = useCallback((convId) => {
    const conv = conversationStorage.get(convId);
    if (!conv) return;
    setMessages(conv.messages);
    setActiveConvId(convId);
    setHasStarted(true);
    setShowHistory(false);
    setSuggestions([]);
    setLastFailedMessage(null);
  }, []);

  // 대화 삭제
  const deleteConversation = useCallback((convId) => {
    conversationStorage.delete(convId);
    setConversations(conversationStorage.list());
    if (convId === activeConvId) handleNewChat();
  }, [activeConvId, handleNewChat]);

  // ─── SSE 스트리밍 메시지 전송 ───
  const handleSend = useCallback(async (text) => {
    setHasStarted(true);
    setLastFailedMessage(null);
    setSuggestions([]);
    setToolStatus(null);
    setIsThinking(false);
    setIsGenerating(false);
    setShowHistory(false);

    const userMsg = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantMsgId = crypto.randomUUID();

    // 사용자 메시지 추가
    setMessages(prev => {
      const next = [...prev, userMsg];
      if (next.length > MAX_MESSAGES) return [next[0], ...next.slice(next.length - MAX_MESSAGES + 1)];
      return next;
    });
    setLoading(true);

    // AI 메시지 슬롯 추가 — 초반 텍스트("~조회해 보겠습니다")를 바로 표시하기 위함
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
    }]);

    try {
      const history = messagesRef.current
        .filter(m => m.id !== 'welcome' && !m.isError && m.id !== assistantMsgId)
        .map(m => ({ role: m.role, content: m.content }))
        .slice(-40);

      const headers = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);

      const response = await fetch(`${API_BASE}/api/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, history, conversationId: activeConvId }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || '서버 오류가 발생했습니다.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let introText = '';       // Tool 호출 전 텍스트 ("~조회해 보겠습니다")
      let answerText = '';      // Tool 호출 후 텍스트 (최종 답변)
      let chartData = null;
      let toolCalled = false;

      for await (const { event, data } of parseSSEStream(reader, decoder)) {
        switch (event) {
          case 'thinking_start':
            setIsThinking(true);
            break;

          case 'thinking_end':
            setIsThinking(false);
            break;

          case 'text_delta':
            // 모든 텍스트는 버퍼에만 누적 (UI 업데이트 없음)
            if (toolCalled) {
              answerText += data.delta;
            } else {
              introText += data.delta;
            }
            break;

          case 'tool_start':
            if (!toolCalled) {
              // 첫 Tool 호출 시점 → 버퍼에 쌓인 초반 텍스트를 한 번에 표시
              toolCalled = true;
              if (introText.trim()) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId ? { ...m, content: introText.trim() } : m
                ));
              }
            }
            setIsGenerating(false);
            setToolStatus({ name: data.name, label: data.label });
            break;

          case 'tool_end':
            setToolStatus(null);
            setIsGenerating(true);  // Tool 완료 → "보고서 작성 중" 단계
            break;

          case 'chart':
            chartData = data.chartData;
            break;

          case 'suggestions':
            setSuggestions(data.suggestions || []);
            break;

          case 'conversation_id':
            if (!activeConvId && data.id) setActiveConvId(data.id);
            break;

          case 'error':
            throw new Error(data.message);

          case 'done': {
            const rawText = toolCalled ? answerText : introText;
            const cleanText = rawText.replace(/<!--suggestions:.*?-->/g, '').trim();

            if (toolCalled && cleanText) {
              // Tool을 거친 경우: 초반 안내 유지 + 최종 답변을 새 메시지로 추가
              setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: cleanText,
                chartData,
                tokenUsage: data.tokenUsage,
              }]);
            } else {
              // Tool 없이 바로 답변한 경우: 슬롯에 한 번에 채움
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, content: cleanText || m.content, chartData, tokenUsage: data.tokenUsage }
                  : m
              ));
            }
            break;
          }
        }
      }

    } catch (err) {
      let errorMsg;
      if (err.name === 'AbortError') {
        errorMsg = '응답 시간이 초과되었습니다.';
      } else if (!navigator.onLine) {
        errorMsg = '네트워크에 연결되어 있지 않습니다.';
      } else {
        errorMsg = err.message || '알 수 없는 오류가 발생했습니다.';
      }

      setLastFailedMessage(text);
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? { ...m, content: errorMsg, isError: true }
          : m
      ));
    } finally {
      setLoading(false);
      setToolStatus(null);
      setIsThinking(false);
      setIsGenerating(false);
    }
  }, [session, activeConvId]);

  // 재시도
  const handleRetry = useCallback(() => {
    if (!lastFailedMessage) return;
    setMessages(prev => prev.filter(m => !m.isError));
    handleSend(lastFailedMessage);
  }, [lastFailedMessage, handleSend]);

  // 추천 질문 클릭 (초기 + 후속)
  const handleSuggestionClick = useCallback((text) => {
    setSuggestions([]);
    handleSend(text);
  }, [handleSend]);

  return (
    <>
      {/* 배경 오버레이 (모바일) */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} aria-hidden="true" />
      )}

      {/* 패널 */}
      <div
        {...(isMd && isOpen ? dragHandlers : {})}
        className={`fixed z-40 bg-white/95 backdrop-blur-xl flex flex-col
          ${isMd
            ? `rounded-2xl ${isOpen ? 'animate-panel-in' : 'pointer-events-none opacity-0'}`
            : `top-0 right-0 w-full h-full transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`
          }`}
        style={isMd && isOpen ? {
          ...dragHandlers.style,
          width: 440,
          height: 640,
          minWidth: 340,
          minHeight: 400,
          maxWidth: '90vw',
          maxHeight: '90vh',
          resize: 'both',
          overflow: 'hidden',
          boxShadow: '0 12px 48px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        } : undefined}
      >
        {/* ─── 헤더 ─── */}
        <div
          data-drag-handle
          className={`flex items-center justify-between px-4 py-3 border-b border-white/10
            bg-gradient-to-r from-primary via-primary to-primary-dark text-white flex-shrink-0
            ${isMd ? 'cursor-grab active:cursor-grabbing rounded-t-2xl' : ''}`}
        >
          <div className="flex items-center gap-2">
            {/* 이력 토글 버튼 */}
            <button
              onClick={() => setShowHistory(prev => !prev)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
              title="대화 기록"
              aria-label="대화 기록 보기"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h2 className="font-bold text-base select-none">D-체크</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              + 새 대화
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
              aria-label="채팅 창 닫기"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* 대화 이력 사이드바 */}
        {showHistory && (
          <ChatSidebar
            conversations={conversations}
            activeConvId={activeConvId}
            onSelect={loadConversation}
            onDelete={deleteConversation}
            onNewChat={handleNewChat}
            onClose={() => setShowHistory(false)}
          />
        )}

        {/* ─── 메시지 목록 ─── */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-4 bg-gradient-to-b from-surface/50 to-white">
          {messages.map((msg) => (
            <div key={msg.id} className="chat-message-item">
              <ChatMessage msg={msg} />
            </div>
          ))}

          {/* AI 진행 상태 — 단일 컴포넌트로 3단계 통합 */}
          <ToolStatus status={toolStatus} isThinking={isThinking} isGenerating={isGenerating} />

          {/* 재시도 버튼 */}
          {lastFailedMessage && !loading && (
            <div className="flex justify-center mb-3">
              <button
                onClick={handleRetry}
                className="text-xs px-4 py-2 min-h-[40px] rounded-full border border-primary text-primary-dark
                  hover:bg-highlight transition-colors"
              >
                다시 시도
              </button>
            </div>
          )}

          {/* 후속 질문 추천 */}
          {suggestions.length > 0 && !loading && (
            <div className="px-1 pb-2 animate-msg-in">
              <p className="text-[10px] text-gray-500 mb-1.5 flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                이어서 물어보기
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(q)}
                    className="animate-chip-in text-xs px-3 py-1.5 rounded-full
                      border border-primary/25 text-primary-dark bg-white
                      hover:bg-primary/10 hover:border-primary/40 hover:scale-[1.03]
                      active:scale-[0.97] transition-all duration-200
                      whitespace-nowrap shadow-sm hover:shadow-md hover:shadow-primary/10"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 추천 질문 (대화 시작 전) */}
          {!hasStarted && <ChatSuggestions onSelect={handleSend} />}

          {/* 로딩 중이지만 아무 상태도 표시 안 될 때 — 기본 "처리 중" */}
          {loading && !toolStatus && !isThinking && !isGenerating && (
            <ToolStatus isThinking={true} />
          )}
        </div>

        {/* ─── 하단 입력 ─── */}
        <div className="flex-shrink-0">
          <ChatInput onSend={handleSend} disabled={loading} />
        </div>
      </div>
    </>
  );
}
