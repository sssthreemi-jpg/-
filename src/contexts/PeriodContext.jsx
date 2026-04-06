import { createContext, useContext, useState, useMemo } from 'react'
import { useData } from '../hooks/useData'

const PeriodContext = createContext(null)

export function usePeriod() {
  const ctx = useContext(PeriodContext)
  if (!ctx) throw new Error('usePeriod는 PeriodProvider 안에서 사용해야 합니다.')
  return ctx
}

export function PeriodProvider({ children }) {
  const { data, loading, error } = useData('/data/pl_monthly.json')
  const [year, setYear] = useState(null)
  const [quarter, setQuarter] = useState(null)

  const years = useMemo(() => {
    if (!data?.data) return []
    return [...new Set(data.data.filter((e) => e.type === '실적').map((e) => e.year))].sort()
  }, [data])

  const effectiveYear = year ?? years[years.length - 1]

  const effectiveQuarter = useMemo(() => {
    if (quarter !== null) return quarter
    if (!data?.data || !effectiveYear) return 1
    return Math.max(
      ...data.data
        .filter((e) => e.type === '실적' && e.year === effectiveYear)
        .map((e) => e.quarter),
    )
  }, [data, effectiveYear, quarter])

  const value = useMemo(() => ({
    data,
    loading,
    error,
    year: effectiveYear,
    quarter: effectiveQuarter,
    years,
    setYear,
    setQuarter,
  }), [data, loading, error, effectiveYear, effectiveQuarter, years])

  return (
    <PeriodContext.Provider value={value}>
      {children}
    </PeriodContext.Provider>
  )
}
