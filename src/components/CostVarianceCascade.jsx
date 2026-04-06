import { useState, useMemo } from 'react'
import { DIVISIONS, DIVISION_COLORS } from '../utils/constants'
import { fmtBillion, fmtPercent } from '../utils/formatters'

/* ── 유의미 판단 임계치 ── */
const SIG_SUB = 0.20    // 세부계정: 대분류 증감의 20% 이상
const SIG_DIV = 0.25    // 사업부: 세부계정 증감의 25% 이상
const MIN_DELTA = 0.5   // 최소 증감 0.5억 이하는 무시

const HIDDEN_DIVS = new Set(['기타'])

/* ── 대분류별 차트 색상 ── */
const CAT_COLORS = {
  '영업판관비': '#F5A623',
  '판매대행수수료': '#FFA726',
  '매출변동비': '#FFCA28',
  '영업관리비': '#66BB6A',
  '일반관리비': '#42A5F5',
  '비효율비경상비용': '#AB47BC',
  'R&D비용': '#26A69A',
}

export default function CostVarianceCascade({
  categories, current, previous, totalSales, prevTotalSales, periodLabel, isMobile,
}) {
  const [expandedKeys, setExpandedKeys] = useState(new Set(['영업판관비']))

  /* ── 최대 금액 (바 스케일링 기준) ── */
  const maxAmount = useMemo(() =>
    Math.max(...categories.map(({ key }) => Math.abs(current['전사'][key] ?? 0)), 1),
    [categories, current],
  )

  /* ── 행별 데이터 계산 ── */
  const rows = useMemo(() => {
    return categories.map(({ key, label, subs }, idx) => {
      const cur = current['전사'][key] ?? 0
      const prev = previous?.['전사']?.[key] ?? 0
      const delta = cur - prev
      const curRatio = totalSales ? cur / totalSales : null
      const prevRatio = prevTotalSales ? prev / prevTotalSales : null
      const ratioDelta = curRatio != null && prevRatio != null ? curRatio - prevRatio : null

      const subRows = subs.map(({ key: sk, label: sl }) => {
        const sc = current['전사'][sk] ?? 0
        const sp = previous?.['전사']?.[sk] ?? 0
        const sd = sc - sp

        // 영업판관비만 사업부별 분해
        let divs = []
        if (key === '영업판관비' && Math.abs(sd) > MIN_DELTA) {
          divs = DIVISIONS
            .filter(d => !HIDDEN_DIVS.has(d))
            .map(d => ({
              name: d,
              delta: (current[d]?.[sk] ?? 0) - (previous?.[d]?.[sk] ?? 0),
              color: DIVISION_COLORS[d],
            }))
            .filter(d => Math.abs(d.delta) >= Math.abs(sd) * SIG_DIV)
            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        }

        return { key: sk, label: sl, cur: sc, prev: sp, delta: sd, divs }
      })

      // 유의미 세부계정 필터링
      const sigSubs = subRows.filter(s =>
        Math.abs(delta) > MIN_DELTA && Math.abs(s.delta) >= Math.abs(delta) * SIG_SUB,
      )

      return {
        key, label, cur, prev, delta, curRatio, ratioDelta,
        allSubs: subRows, sigSubs,
        hiddenCount: subRows.length - sigSubs.length,
        color: CAT_COLORS[key] || '#F5A623',
        idx,
      }
    })
  }, [categories, current, previous, totalSales, prevTotalSales])

  function toggle(key) {
    setExpandedKeys(p => {
      const n = new Set(p)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  }

  return (
    <div className="card-section p-4 lg:p-6 mb-6">
      <h3 className="text-sm lg:text-base font-semibold text-gray-800 mb-5">
        비용 증감 분석 ({periodLabel}, 전년동기 대비)
      </h3>

      <div className="space-y-2 lg:space-y-3">
        {rows.map(row => {
          const isExpanded = expandedKeys.has(row.key)
          const barPct = (Math.abs(row.cur) / maxAmount) * 100
          const prevPct = (Math.abs(row.prev) / maxAmount) * 100
          const subsToShow = row.key === '영업판관비' ? row.allSubs : row.sigSubs
          const maxSubDelta = Math.max(...row.allSubs.map(s => Math.abs(s.delta)), 1)

          return (
            <div
              key={row.key}
              className="cascade-row"
              style={{ animationDelay: `${row.idx * 0.07}s` }}
            >
              {/* ── 대분류 헤더 ── */}
              <button
                className="w-full text-left group rounded-lg px-2 lg:px-3 py-2 -mx-2 lg:-mx-3 hover:bg-gray-50/80 transition-colors"
                onClick={() => toggle(row.key)}
                aria-expanded={isExpanded}
              >
                {/* 정보 라인: 항목명 + 매출비 + 금액 + 증감 */}
                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block text-xs transition-transform duration-200"
                      style={{ color: row.color, transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)' }}
                    >
                      ▸
                    </span>
                    <span className="font-semibold text-sm lg:text-[15px] text-gray-800">{row.label}</span>
                    {row.curRatio != null && (
                      <span className="text-[10px] lg:text-[11px] text-gray-400 ml-0.5">
                        매출대비 {fmtPercent(row.curRatio)}
                        {row.ratioDelta != null && Math.abs(row.ratioDelta) > 0.001 && (
                          <span className={`ml-0.5 font-medium ${row.ratioDelta > 0 ? 'text-decrease' : 'text-increase'}`}>
                            ({row.ratioDelta > 0 ? '▲' : '▽'}{Math.abs(row.ratioDelta * 100).toFixed(1)}%p)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 lg:gap-3">
                    <span className="text-sm text-gray-600 tabular-nums">
                      {fmtBillion(row.cur)}
                      <span className="text-[10px] text-gray-400 ml-0.5">억</span>
                    </span>
                    {Math.abs(row.delta) > 0.05 && (
                      <span
                        className={`cascade-delta text-sm lg:text-[15px] font-bold tabular-nums ${
                          row.delta > 0 ? 'text-decrease' : 'text-increase'
                        }`}
                        style={{ animationDelay: `${row.idx * 0.07 + 0.3}s` }}
                      >
                        {row.delta > 0 ? '+' : ''}{fmtBillion(row.delta)}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── 바 ── */}
                <div className="relative h-5 lg:h-6 bg-gray-100/80 rounded-md overflow-hidden">
                  {/* 현재 금액 바 */}
                  <div
                    className="cascade-bar absolute inset-y-0 left-0 rounded-md"
                    style={{
                      '--bar-target': `${barPct}%`,
                      background: `linear-gradient(90deg, ${row.color}30 0%, ${row.color}50 100%)`,
                      animationDelay: `${row.idx * 0.07 + 0.08}s`,
                    }}
                  />

                  {/* 전년 기준선 마커 */}
                  {row.prev > 0 && (
                    <div
                      className="absolute top-0 bottom-0 z-10 cascade-fade-in"
                      style={{ left: `${prevPct}%`, animationDelay: `${row.idx * 0.07 + 0.5}s` }}
                    >
                      <div className="absolute -left-px top-0 bottom-0 w-0.5 bg-gray-800/30" />
                      <div className="absolute -left-[3px] top-0 w-[7px] h-[3px] bg-gray-800/30 rounded-b-sm" />
                      <div className="absolute -left-[3px] bottom-0 w-[7px] h-[3px] bg-gray-800/30 rounded-t-sm" />
                    </div>
                  )}

                  {/* 증감 하이라이트 영역 */}
                  {Math.abs(row.delta) > 0.05 && row.prev > 0 && (
                    <div
                      className="cascade-bar absolute inset-y-0 rounded-sm"
                      style={{
                        '--bar-target': `${(Math.abs(row.delta) / maxAmount) * 100}%`,
                        left: row.delta > 0 ? `${prevPct}%` : `${barPct}%`,
                        background: row.delta > 0
                          ? 'repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(211,47,47,0.12) 2px, rgba(211,47,47,0.12) 4px)'
                          : 'repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(21,101,192,0.12) 2px, rgba(21,101,192,0.12) 4px)',
                        animationDelay: `${row.idx * 0.07 + 0.2}s`,
                      }}
                    />
                  )}
                </div>
              </button>

              {/* ── 확장된 세부계정 ── */}
              {isExpanded && subsToShow.length > 0 && (
                <div className="cascade-subs-container mt-1.5 ml-4 lg:ml-6">
                  {subsToShow.map((sub, si) => {
                    const isSig = Math.abs(sub.delta) >= Math.abs(row.delta) * SIG_SUB
                      && Math.abs(sub.delta) > MIN_DELTA
                    const subBarPct = maxSubDelta > 0 ? (Math.abs(sub.delta) / maxSubDelta) * 100 : 0

                    return (
                      <div
                        key={sub.key}
                        className="cascade-sub"
                        style={{ animationDelay: `${si * 0.05}s` }}
                      >
                        {/* 세부계정 정보 */}
                        <div className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1 h-1 rounded-full flex-shrink-0 ${isSig ? '' : 'opacity-30'}`}
                              style={{ backgroundColor: row.color }}
                            />
                            <span className={`text-xs lg:text-[13px] ${
                              isSig ? 'text-gray-700 font-medium' : 'text-gray-400'
                            }`}>
                              {sub.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 tabular-nums">
                            <span className={`text-[11px] ${isSig ? 'text-gray-500' : 'text-gray-300'}`}>
                              {fmtBillion(sub.cur)}억
                            </span>
                            {Math.abs(sub.delta) > 0.05 && (
                              <span className={`text-xs font-semibold ${
                                !isSig ? 'opacity-40' : ''
                              } ${sub.delta > 0 ? 'text-decrease' : 'text-increase'}`}>
                                {sub.delta > 0 ? '+' : ''}{fmtBillion(sub.delta)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 세부계정 증감 바 (유의미한 항목만) */}
                        {isSig && Math.abs(sub.delta) > MIN_DELTA && (
                          <div className="h-[5px] bg-gray-100 rounded-full overflow-hidden mb-1">
                            <div
                              className="cascade-bar h-full rounded-full"
                              style={{
                                '--bar-target': `${subBarPct}%`,
                                backgroundColor: sub.delta > 0 ? '#D32F2F' : '#1565C0',
                                opacity: 0.45,
                                animationDelay: `${si * 0.05 + 0.1}s`,
                              }}
                            />
                          </div>
                        )}

                        {/* 사업부 칩 (영업판관비의 유의미 항목만) */}
                        {sub.divs.length > 0 && isSig && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {sub.divs.map((d, di) => (
                              <span
                                key={d.name}
                                className="cascade-chip inline-flex items-center gap-0.5 pl-1 pr-1.5 py-[2px] rounded-sm text-[10px] lg:text-[11px]"
                                style={{
                                  backgroundColor: `${d.color}10`,
                                  borderLeft: `2px solid ${d.color}`,
                                  animationDelay: `${si * 0.05 + di * 0.04 + 0.15}s`,
                                }}
                              >
                                <span style={{ color: d.color }} className="font-medium">{d.name}</span>
                                <span className={`font-bold ${d.delta > 0 ? 'text-decrease' : 'text-increase'}`}>
                                  {d.delta > 0 ? '+' : ''}{fmtBillion(d.delta)}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* 미표시 항목 수 (영업판관비가 아닌 경우) */}
                  {row.key !== '영업판관비' && row.hiddenCount > 0 && (
                    <p className="text-[10px] text-gray-400 py-1 pl-3">
                      {row.hiddenCount}개 항목: 증감 미미
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── 범례 ── */}
      <div className="flex flex-wrap items-center gap-3 lg:gap-5 mt-5 pt-3 border-t border-border/40">
        <div className="flex items-center gap-1.5 text-[10px] lg:text-[11px] text-gray-400">
          <div className="w-0.5 h-3 bg-gray-800/30 rounded-full" />
          <span>전년 기준선</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] lg:text-[11px] text-gray-400">
          <div className="w-4 h-3 rounded-sm" style={{
            background: 'repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(211,47,47,0.2) 2px, rgba(211,47,47,0.2) 4px)',
          }} />
          <span>비용 증가</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] lg:text-[11px] text-gray-400">
          <div className="w-4 h-3 rounded-sm" style={{
            background: 'repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(21,101,192,0.2) 2px, rgba(21,101,192,0.2) 4px)',
          }} />
          <span>비용 감소</span>
        </div>
      </div>
    </div>
  )
}
