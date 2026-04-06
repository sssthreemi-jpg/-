/**
 * 공지사항 관리 (다크 테마)
 */
import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

export default function Announcements() {
  const [list, setList] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function loadList() {
    adminFetch('/announcements')
      .then(setList)
      .catch((e) => setError(e.message))
  }

  useEffect(loadList, [])

  async function handleCreate(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await adminFetch('/announcements', {
        method: 'POST',
        body: { title, content, expires_at: expiresAt || null },
      })
      setTitle('')
      setContent('')
      setExpiresAt('')
      loadList()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleToggle(id, currentActive) {
    try {
      await adminFetch('/announcements', {
        method: 'PUT',
        body: { id, is_active: !currentActive },
      })
      loadList()
    } catch (err) { setError(err.message) }
  }

  async function handleDelete(id) {
    if (!confirm('공지를 삭제하시겠습니까?')) return
    try {
      await adminFetch('/announcements', { method: 'DELETE', body: { id } })
      loadList()
    } catch (err) { setError(err.message) }
  }

  const inputCls = 'w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-colors'

  return (
    <div>
      <h2 className="text-xl font-bold text-white/90 mb-6 tracking-tight">공지사항 관리</h2>

      {error && <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {/* ═══ 새 공지 작성 ═══ */}
      <form onSubmit={handleCreate} className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5 mb-5 space-y-3">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="공지 제목" required className={inputCls} />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="공지 내용" required rows={3} className={`${inputCls} resize-y`} />
        <div className="flex items-center gap-3">
          <label className="text-[11px] text-white/25 uppercase tracking-wider flex-shrink-0">만료일</label>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white/50 focus:outline-none focus:border-amber-500/40" />
          <button type="submit" disabled={loading}
            className="ml-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20">
            {loading ? '게시 중...' : '게시'}
          </button>
        </div>
      </form>

      {/* ═══ 공지 목록 ═══ */}
      <div className="space-y-2">
        {list.map((a) => (
          <div key={a.id} className={`bg-white/[0.03] rounded-2xl border p-4 transition-all ${
            a.is_active ? 'border-emerald-500/15' : 'border-white/[0.06] opacity-50'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide border ${
                    a.is_active ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-white/[0.06] text-white/35 border-white/[0.08]'
                  }`}>
                    {a.is_active ? '활성' : '비활성'}
                  </span>
                  <h3 className="text-sm font-semibold text-white/80 truncate">{a.title}</h3>
                </div>
                <p className="text-sm text-white/45 leading-relaxed">{a.content}</p>
                <p className="text-[11px] text-white/20 mt-2">
                  {new Date(a.created_at).toLocaleDateString('ko-KR')}
                  {a.expires_at && ` ~ ${new Date(a.expires_at).toLocaleDateString('ko-KR')}`}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => handleToggle(a.id, a.is_active)} className="text-xs text-amber-400/60 hover:text-amber-400 transition-colors">
                  {a.is_active ? '비활성화' : '활성화'}
                </button>
                <button onClick={() => handleDelete(a.id)} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
