/**
 * 시스템 프롬프트 편집기 (다크 테마)
 */
import { useState, useEffect } from 'react'
import { adminFetch } from './adminApi'

export default function PromptEditor() {
  const [prompt, setPrompt] = useState('')
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetch('/settings')
      .then((settings) => {
        if (settings.system_prompt) {
          setPrompt(settings.system_prompt.value?.content || '')
          setMeta(settings.system_prompt)
        }
      })
      .catch((e) => setError(e.message))
  }, [])

  async function handleSave() {
    setLoading(true)
    setSaved(false)
    setError('')
    try {
      await adminFetch('/settings', {
        method: 'PUT',
        body: { key: 'system_prompt', value: { content: prompt } },
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  function handleReset() {
    if (!confirm('기본 프롬프트로 초기화하시겠습니까?')) return
    setPrompt(`당신은 대웅제약 손익분석 AI 비서입니다.
경영진(본부장~대표이사)이 사용하므로 격식체 보고서 톤으로 답변합니다.

## 역할
- 사업부별 손익 데이터를 정확하게 조회하여 보고합니다.
- 데이터에 기반한 간결한 해석을 덧붙입니다.
- 시각화가 도움되는 경우 적절한 차트를 함께 제공합니다.

## 응답 규칙
1. 금액 단위는 억원, 소수점 1자리까지 표시합니다.
2. 전년동기비 증감을 항상 함께 언급합니다.
3. 증가는 ▲, 감소는 ▼으로 표시합니다.
4. 추이/비교 질문에는 차트를 함께 제공합니다.
5. 3개 이상 데이터 포인트는 표 형태로 정리합니다.`)
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white/90 mb-6 tracking-tight">시스템 프롬프트</h2>

      {error && <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {saved && <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">프롬프트가 저장되었습니다.</div>}

      <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={18}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 font-mono leading-relaxed resize-y focus:outline-none focus:border-amber-500/40 transition-colors"
        />

        {meta?.updated_at && (
          <p className="text-[11px] text-white/20 mt-3">
            마지막 수정: {new Date(meta.updated_at).toLocaleString('ko-KR')}
          </p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs text-white/40 font-medium hover:bg-white/[0.08] transition-colors"
          >
            초기화
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
