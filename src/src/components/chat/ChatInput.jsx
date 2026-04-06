/**
 * 채팅 입력창 + 전송 버튼
 */
import { useState, useRef, useEffect } from 'react';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 96) + 'px';
  }, [text]);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setJustSent(true);
    setTimeout(() => setJustSent(false), 300);
    onSend(trimmed);
    setText('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className={`border-t px-4 py-2 transition-colors duration-200 ${focused ? 'border-primary/40 bg-primary/[0.02]' : 'border-border bg-white'}`}>
      <div className={`flex items-end gap-2 rounded-xl border transition-all duration-200
        ${focused
          ? 'border-primary/50 shadow-[0_0_0_3px_rgba(245,166,35,0.1)]'
          : 'border-border'
        }
        ${focused ? 'animate-input-glow' : ''}
        bg-white px-3 py-1.5`}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder="메시지를 입력하세요..."
          aria-label="챗봇 메시지 입력"
          rows={1}
          className="flex-1 resize-none text-sm py-1
            focus:outline-none
            disabled:opacity-50 disabled:bg-transparent
            placeholder:text-gray-500
            bg-transparent"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          aria-label="메시지 전송"
          className={`flex-shrink-0 w-10 h-10 rounded-full
            flex items-center justify-center
            transition-all duration-200
            ${text.trim() && !disabled
              ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95'
              : 'bg-surface text-gray-500'
            }
            ${justSent ? 'animate-send-ripple' : ''}
            disabled:cursor-not-allowed`}
        >
          {disabled ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
      {focused && (
        <p className="text-[10px] text-gray-500 mt-1 ml-1 animate-fade-in">
          Enter 전송 · Shift+Enter 줄바꿈
        </p>
      )}
    </div>
  );
}
