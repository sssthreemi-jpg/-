/**
 * 전체 대화 로그 조회 (다크 테마)
 */
import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

export default function ChatLogs() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [error, setError] = useState('')

  function loadLogs() {
    const params = new URLSearchParams({ page, limit: 30 })
    if (keyword) params.set('keyword', keyword)
    adminFetch(`/logs?${params}`)
      .then((d) => { setLogs(d.logs || []); setTotal(d.total || 0) })
      .catch((e) => setError(e.message))
  }

  useEffect(loadLogs, [page])

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
    loadLogs()
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white/90 mb-6 tracking-tight">대화 로그</h2>

      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="키워드 검색..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-colors"
        />
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs text-white/50 font-medium hover:bg-white/[0.1] transition-colors">
          검색
        </button>
      </form>

      {error && <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="text-[11px] text-white/25 mb-3 uppercase tracking-wider">총 {total}건</div>

      <div className="space-y-1.5">
        {logs.map((log) => (
          <div key={log.id} className="bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden transition-colors hover:border-white/[0.1]">
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
            >
              <span className="text-[11px] text-white/25 w-28 flex-shrink-0 font-mono">
                {new Date(log.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-xs font-medium text-white/50 w-16 flex-shrink-0 truncate">{log.user_name}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide ${
                log.role === 'user' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : 'bg-white/[0.06] text-white/40 border border-white/[0.08]'
              }`}>
                {log.role}
              </span>
              <span className="text-sm text-white/50 truncate flex-1">{log.content?.slice(0, 60)}</span>
              <svg className={`w-3.5 h-3.5 text-white/20 transition-transform duration-200 flex-shrink-0 ${expandedId === log.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            {expandedId === log.id && (
              <div className="px-4 py-3 bg-white/[0.02] border-t border-white/[0.04] text-sm text-white/60 whitespace-pre-wrap leading-relaxed">
                {log.content}
              </div>
            )}
          </div>
        ))}
      </div>

      {total > 30 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/40 disabled:opacity-30 hover:bg-white/[0.08] transition-colors"
          >
            이전
          </button>
          <span className="text-xs text-white/30 font-mono">{page} / {Math.ceil(total / 30)}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / 30)}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/40 disabled:opacity-30 hover:bg-white/[0.08] transition-colors"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
