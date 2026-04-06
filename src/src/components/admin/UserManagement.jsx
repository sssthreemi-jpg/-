/**
 * 사용자 관리 — 목록, 초대, 역할변경, 삭제 (다크 테마)
 */
import { useState, useEffect, useCallback } from 'react'
import { adminFetch } from './adminApi'

const ROLE_STYLES = {
  admin: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  user: 'bg-white/[0.06] text-white/50 border-white/[0.08]',
}

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [pending, setPending] = useState([])
  const [pendingSignups, setPendingSignups] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadUsers = useCallback(() => {
    setLoading(true)
    adminFetch('/users')
      .then((d) => {
        setUsers(d.users || [])
        setPending(d.pending || [])
        setPendingSignups(d.pendingSignups || [])
        setLoading(false)
      })
      .catch((e) => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(loadUsers, [loadUsers])

  function flash(msg) { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  async function handleInvite(e) {
    e.preventDefault()
    setInviteLoading(true)
    setError('')
    try {
      await adminFetch('/users', { method: 'POST', body: { action: 'invite', email: inviteEmail } })
      setInviteEmail('')
      setShowInvite(false)
      flash(`${inviteEmail} 초대 완료`)
      loadUsers()
    } catch (err) { setError(err.message) }
    finally { setInviteLoading(false) }
  }

  async function handleRoleChange(userId, newRole) {
    setError('')
    try {
      await adminFetch('/users', { method: 'PUT', body: { id: userId, role: newRole } })
      flash('역할이 변경되었습니다')
      loadUsers()
    } catch (err) { setError(err.message) }
  }

  async function handleDelete(userId, email) {
    if (!confirm(`${email} 계정을 삭제하시겠습니까?`)) return
    setError('')
    try {
      await adminFetch('/users', { method: 'DELETE', body: { id: userId } })
      flash(`${email} 삭제 완료`)
      loadUsers()
    } catch (err) { setError(err.message) }
  }

  async function handleSignupAction(email, action) {
    setError('')
    try {
      await adminFetch('/users', { method: 'POST', body: { action, email } })
      flash(`${email} ${action === 'approve' ? '승인' : '거부'} 완료`)
      loadUsers()
    } catch (err) { setError(err.message) }
  }

  async function handleResend(email) {
    setError('')
    try {
      await adminFetch('/users', { method: 'POST', body: { action: 'invite', email } })
      flash(`${email} 재발송 완료`)
    } catch (err) { setError(err.message) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white/90 tracking-tight">사용자 관리</h2>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold hover:brightness-110 transition-all duration-200 shadow-lg shadow-amber-500/20"
        >
          + 사용자 초대
        </button>
      </div>

      {/* 알림 */}
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400/60 hover:text-red-400 ml-2">&times;</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-pulse">
          {success}
        </div>
      )}

      {/* ═══ 초대 폼 ═══ */}
      {showInvite && (
        <form onSubmit={handleInvite} className="mb-5 p-4 bg-white/[0.03] rounded-2xl border border-white/[0.06] flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="name@daewoong.co.kr"
            required
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-colors"
          />
          <button
            type="submit"
            disabled={inviteLoading}
            className="px-5 py-2.5 rounded-xl bg-amber-500/20 text-amber-400 text-sm font-semibold border border-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
          >
            {inviteLoading ? '발송 중...' : '초대'}
          </button>
        </form>
      )}

      {/* ═══ 가입 승인 대기 ═══ */}
      {pendingSignups.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-amber-400/80 mb-2 uppercase tracking-wider">
            가입 승인 대기 ({pendingSignups.length})
          </h3>
          <div className="bg-amber-500/[0.05] rounded-2xl border border-amber-500/10 overflow-hidden divide-y divide-white/[0.04]">
            {pendingSignups.map((s) => (
              <div key={s.email} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm text-white/70">{s.email}</span>
                  <span className="text-xs text-white/25 ml-2">{s.created_at?.slice(0, 10)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSignupAction(s.email, 'approve')}
                    className="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => handleSignupAction(s.email, 'reject')}
                    className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/15 hover:bg-red-500/20 transition-colors"
                  >
                    거부
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 사용자 목록 ═══ */}
      <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden mb-5">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-white/25 mt-3">불러오는 중...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-white/30 font-medium">이메일</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-white/30 font-medium">이름</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-white/30 font-medium">역할</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-white/30 font-medium hidden md:table-cell">가입일</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-white/30 font-medium hidden md:table-cell">마지막 로그인</th>
                  <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-white/30 font-medium">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-xs text-white/60 font-mono">{u.email}</td>
                    <td className="px-4 py-3 text-white/80 font-medium">{u.display_name || '-'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold uppercase tracking-wide cursor-pointer bg-transparent ${ROLE_STYLES[u.role] || ROLE_STYLES.user}`}
                      >
                        <option value="user" className="bg-[#1a1a22] text-white">user</option>
                        <option value="admin" className="bg-[#1a1a22] text-white">admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/30 hidden md:table-cell">{u.created_at?.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-xs text-white/30 hidden md:table-cell">{u.last_login_at?.slice(0, 10) || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(u.id, u.email)}
                        className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ 대기 중 초대 ═══ */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-white/30 mb-2 uppercase tracking-wider">
            대기 중 초대 ({pending.length})
          </h3>
          <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
            {pending.map((p) => (
              <div key={p.email} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-amber-500/50" />
                  <span className="text-sm text-white/60">{p.email}</span>
                  <span className="text-xs text-white/20">{p.invited_at?.slice(0, 10) || '-'}</span>
                </div>
                <button
                  onClick={() => handleResend(p.email)}
                  className="text-xs text-amber-400/60 hover:text-amber-400 transition-colors"
                >
                  재발송
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
