/**
 * 회사 선택 전역 상태 — 멀티 법인 지원
 */
import { createContext, useContext, useState, useEffect } from 'react'

const CompanyContext = createContext(null)

export function useCompany() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompany는 CompanyProvider 안에서 사용해야 합니다.')
  return ctx
}

export function CompanyProvider({ children }) {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/companies_data.json')
      .then(r => r.json())
      .then(data => { setCompanies(data); setLoading(false) })
      .catch(err => { console.error('회사 데이터 로드 실패:', err); setLoading(false) })
  }, [])

  const subsidiaries = companies.filter(c => c.group === '계열사그룹')
  const affiliates = companies.filter(c => c.group === '관계사그룹')

  const getCompanyById = (slug) => {
    return companies.find(c => slugify(c.name) === slug)
  }

  const value = {
    companies,
    subsidiaries,
    affiliates,
    loading,
    getCompanyById,
  }

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
}

/** 회사명 → URL slug */
export function slugify(name) {
  return encodeURIComponent(name)
}

/** URL slug → 회사명 */
export function unslugify(slug) {
  return decodeURIComponent(slug)
}
