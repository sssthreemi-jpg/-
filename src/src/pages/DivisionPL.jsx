import { useState, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../hooks/useData'
import { usePeriod } from '../contexts/PeriodContext'
import { DIVISIONS } from '../utils/constants'
import { buildPeriodCols } from '../utils/periodHelpers'

import DivisionTabs from '../components/division/DivisionTabs'
import KpiCards from '../components/division/KpiCards'
import DivisionChart from '../components/division/DivisionChart'
import PLDetailAccordion from '../components/division/PLDetailAccordion'
import KeyProductsTable from '../components/division/KeyProductsTable'
import SalesDetailAccordion from '../components/division/SalesDetailAccordion'
import TableSkeleton from '../components/skeletons/TableSkeleton'
import { NoDataState } from '../components/EmptyState'

// KPI 데이터 경로 매핑
const KPI_PATHS = {
  CH: '/data/kpi_ch.json',
  건기식: '/data/kpi_health.json',
  나보타: '/data/kpi_nabota.json',
}

export default function DivisionPL() {
  const [searchParams] = useSearchParams()
  const initDivision = searchParams.get('division') || DIVISIONS[0]
  const navigate = useNavigate()

  const { data: plData, year, quarter, loading: plLoading } = usePeriod()
  const { data: scData, loading: scLoading } = useData('/data/sales_cost_summary.json')
  const dataLoading = plLoading || scLoading

  const [division, setDivision] = useState(initDivision)
  const [plOpen, setPlOpen] = useState(false)
  const [salesOpen, setSalesOpen] = useState(false)

  // KPI 추가 데이터 (사업부별 조건부 로딩)
  const kpiPath = useMemo(() => KPI_PATHS[division] || null, [division])
  const { data: kpiData } = useData(kpiPath)

  const switchDivision = useCallback((div) => {
    setDivision(div)
    setPlOpen(false)
    setSalesOpen(false)
    navigate(`/division?division=${encodeURIComponent(div)}`, { replace: true })
  }, [navigate])

  // 기간 열 정의
  const periods = useMemo(() => {
    if (!plData?.data) return null
    return buildPeriodCols(plData.data, year, quarter)
  }, [plData, year, quarter])

  if (dataLoading)
    return <TableSkeleton rows={10} />
  if (!periods?.cur)
    return <NoDataState />

  return (
    <div>
      {/* ════════ 사업부 탭 ════════ */}
      <DivisionTabs division={division} onSelect={switchDivision} />

      <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-5">{division} 사업부 손익</h2>

      {/* ════════ [1] KPI 카드 ════════ */}
      <KpiCards
        division={division}
        year={year}
        quarter={quarter}
        plAgg={periods}
        scData={scData}
        kpiData={kpiData}
      />

      {/* ════════ [2] 복합 차트 ════════ */}
      <DivisionChart
        division={division}
        periodCols={periods.periodCols}
      />

      {/* ════════ 손익세부 아코디언 ════════ */}
      <PLDetailAccordion
        open={plOpen}
        onToggle={() => setPlOpen(!plOpen)}
        division={division}
        periodCols={periods.periodCols}
        yoyPrev={periods.yoyPrev}
        periods={periods}
      />

      {/* ════════ [3] 주요품목 매출 ════════ */}
      <KeyProductsTable
        division={division}
        year={year}
        quarter={quarter}
        scData={scData}
        periodCols={periods.periodCols}
      />

      {/* ════════ [4] 매출세부 아코디언 ════════ */}
      <SalesDetailAccordion
        open={salesOpen}
        onToggle={() => setSalesOpen(!salesOpen)}
        division={division}
        year={year}
        quarter={quarter}
        scData={scData}
      />
    </div>
  )
}
