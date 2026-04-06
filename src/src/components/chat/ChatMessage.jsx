/**
 * 개별 메시지 렌더링 — 마크다운 + 차트 + 테이블
 */
import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import ChatChart from './ChatChart';
import ChatTable from './ChatTable';

function colorizeArrows(text) {
  if (!text) return text;
  const html = text
    .replace(/▲/g, '<span class="text-increase font-semibold">▲</span>')
    .replace(/▼/g, '<span class="text-decrease font-semibold">▼</span>');
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['span'], ALLOWED_ATTR: ['class'] });
}

const mdComponents = {
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs whitespace-nowrap">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-highlight">{children}</thead>,
  th: ({ children }) => <th className="px-2.5 py-1.5 text-left font-semibold border-b border-border">{children}</th>,
  td: ({ children }) => {
    const text = String(children ?? '');
    let cls = 'px-2.5 py-1.5 border-b border-border-light';
    if (text.includes('▲') || text.includes('+')) cls += ' text-increase';
    else if (text.includes('▼')) cls += ' text-decrease';
    return <td className={cls}>{children}</td>;
  },
  p: ({ children }) => {
    if (typeof children === 'string') {
      return <p className="mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: colorizeArrows(children) }} />;
    }
    return <p className="mb-2 leading-relaxed">{children}</p>;
  },
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xs font-bold mt-2 mb-1">{children}</h3>,
};

export default memo(function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  const hasData = !isUser && (msg.chartData || msg.tableData);

  // 빈 AI 메시지는 렌더링하지 않음 (슬롯만 잡아둔 상태)
  if (!isUser && !msg.content && !msg.chartData) return null;

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-msg-in`}
    >
      {/* AI 아바타 */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-dark
          flex items-center justify-center mr-2 mt-0.5 shadow-sm">
          <span className="text-white text-[10px] font-bold">D</span>
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm transition-all duration-200 break-words overflow-hidden
          ${isUser
            ? 'bg-gradient-to-br from-primary to-primary-dark text-white rounded-br-md shadow-md shadow-primary/20'
            : msg.isError
              ? 'bg-red-50 text-decrease rounded-bl-md border border-decrease/30 animate-error-shake'
              : hasData
                ? 'bg-white text-gray-800 rounded-bl-md border-l-3 border-l-primary border border-border shadow-sm'
                : 'bg-white text-gray-800 rounded-bl-md border border-border shadow-sm'
          }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="chat-markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={mdComponents}
              allowedElements={undefined}
              unwrapDisallowed={false}
            >
              {msg.content || ''}
            </ReactMarkdown>

            {/* 차트 */}
            {msg.chartData && (
              <div className="animate-chart-reveal">
                <ChatChart chartData={msg.chartData} />
              </div>
            )}

            {msg.tableData && <ChatTable tableData={msg.tableData} />}
          </div>
        )}
      </div>
    </div>
  );
});
