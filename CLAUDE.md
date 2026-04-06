# 손익 드릴다운 레포트

## 프로젝트 개요
제약회사 본부장 성과발표용 인터랙티브 웹 대시보드.
기존 PPT(엑셀 표 붙여넣기)를 대체하여 평가자가 발표 중 드릴다운으로 세부 정보를 즉시 확인할 수 있도록 함.

## 설계 문서
| 문서 | 경로 | 설명 |
|------|------|------|
| 설계 명세서 | `docs/손익드릴다운레포트_설계명세서.md` | 전체 설계 (데이터 구조, 드릴다운, UI) |
| 챗봇 설계서 | `docs/chatbot-design.md` | AI 챗봇 아키텍처 + 인증 + 관리자 |
| 챗봇 구현 프롬프트 | `docs/chatbot-prompts.md` | Phase별 구현 가이드 |
| 현재 구현 상태 | `docs/현재구현상태.md` | 영역별 구현 완료/미완료 현황 |

## 아키텍처 (3-Tier)

```
┌─ 프론트엔드 (React SPA) ────────────────────────────┐
│  Vite + Tailwind CSS + Recharts                      │
│  정적 JSON 로드 (public/data/) + Supabase Auth       │
│  페이지: 전사손익, 사업부별손익, 원가분석, 비용분석     │
│  챗봇 UI: ChatButton + ChatPanel (플로팅)             │
│  관리자: /admin/* (사용자관리, 통계, 설정 등)          │
└──────────────────┬───────────────────────────────────┘
                   │ POST /api/chat, /api/admin/*
┌─ 백엔드 (Express) ──────────────────────────────────┐
│  server/index.js (PORT 3001)                         │
│  Claude API Tool Use → JSON 데이터 조회              │
│  JWT 검증 (Supabase) + 관리자 API                    │
└──────────────────┬───────────────────────────────────┘
                   │
┌─ 외부 서비스 ────────────────────────────────────────┐
│  Supabase: Auth + PostgreSQL (프로필, 대화이력, 통계)  │
│  Anthropic Claude API: 챗봇 AI 엔진                   │
└──────────────────────────────────────────────────────┘
```

## 기술 스택
| 영역 | 기술 | 용도 |
|------|------|------|
| 프론트엔드 | React 19 (Vite) + Tailwind CSS 4 + Recharts | UI, 빌드, 차트 |
| 인증 | Supabase Auth | 이메일/비밀번호 + @daewoong.co.kr 제한 |
| 백엔드 | Express 5 | 챗봇 API 프록시 + 관리자 API |
| AI 챗봇 | Claude Sonnet 4.6 (Tool Use) | 자연어 재무 데이터 질의응답 |
| DB | Supabase PostgreSQL | 프로필, 대화이력, 사용통계, 공지 |
| 데이터 | 정적 JSON (엑셀→Python 변환) | 손익/매출원가/비용 데이터 |

## 데이터 소스 (input/ 폴더)
| 파일 | 용도 | 단위 |
|------|------|------|
| 월별손익.xlsx | 사업부별 월별 손익계산서 (44개 항목) | 억원 |
| S_C_raw.xlsx | 품목별 매출/원가 (요약+RAW) | 원 |
| RAW_E__20XX.xlsx | 비용 전표 상세 (2022~2025) | 원 |

## JSON 출력 (public/data/ 폴더)
| JSON | 소스 | 용도 |
|------|------|------|
| pl_monthly.json | 월별손익.xlsx | 전사/사업부별 손익 테이블 |
| sales_cost_summary.json | S_C_raw.xlsx 요약 시트 | 매출/원가 품목별 드릴다운 |
| sales_cost_raw.json | S_C_raw.xlsx RAW 시트 | 품목코드 레벨 드릴다운 (310MB, lazy-load) |
| expense_detail.json | RAW_E__20XX.xlsx | 비용 구분3 세부항목 드릴다운 |
| kpi_*.json | 사업부별 KPI 엑셀 | CH/건기식/나보타 사업부 KPI 카드 |

## 핵심 비즈니스 로직
- 사업부: ETC, CH, 건기식, 나보타, 글로벌, 수탁, 기타
- 손익 흐름: 매출 → 매출원가 → 매출총이익 → 비용(7종) → R&D차감전이익 → R&D → 영업이익
- **매출/원가**는 S_C_raw에 품목별 데이터 있음 → 품목 드릴다운 가능
- **비용**은 RAW(E)에 전표 데이터 있음 → 구분3(세부항목) 레벨까지 드릴다운 가능, 품목별 불가
- **R&D**는 배부 결과 금액(R/D 구분)만 표시

## 드릴다운 구조
1. 매출/원가: 전사 → 사업부 → 중분류/수익군 → 품목구분2 → (품목코드)
2. 비용: 전사 → 구분2(대분류) → 구분3(세부항목) → 사업구분(직접/공통)

## 라우팅
| 경로 | 컴포넌트 | 인증 | 설명 |
|------|----------|------|------|
| `/login` | LoginPage | 불필요 | 로그인 |
| `/signup` | SignupPage | 불필요 | 회원가입 |
| `/` | CompanySummary | AuthGuard | 전사 손익 (메인) |
| `/division` | DivisionPL | AuthGuard | 사업부별 손익 + 품목 드릴다운 |
| `/cost` | CostRateAnalysis | AuthGuard | 원가 분석 |
| `/expense` | ExpenseAnalysis | AuthGuard | 비용 분석 |
| `/rnd` | ExpenseAnalysis | AuthGuard | R&D (비용분석 공유) |
| `/admin/*` | AdminLayout | AdminGuard | 관리자 페이지 (8개 서브라우트) |

## 코딩 규칙
- 한국어 UI (금액 표시: 억원 단위, 콤마 포맷)
- 기존 PPT 성과발표 자료와 유사한 형태 유지 (주황/노란 헤더 톤)
- 전년동기비 비교 필수 (증가: 파랑/검정, 감소: 빨강)
- **모바일 퍼스트 반응형**: Tailwind `md:`, `lg:` 접두사로 하나의 컴포넌트로 데스크탑/모바일 대응
- 데스크탑: 좌측 사이드바 + 넓은 테이블, 모바일: 하단 탭 + 가로 스크롤 테이블

## 개발/배포
```bash
npm run dev       # 프론트엔드 개발 서버 (Vite, :5173)
npm run server    # 백엔드 서버 (Express, :3001)
npm run build     # 정적 빌드 → dist/
```
- 프론트엔드: Vercel/Netlify 정적 배포
- 백엔드: Vercel Serverless Functions 또는 별도 Node.js 호스팅
- 모바일(휴대폰) 접속 지원 필수

## 개발 단계
- Phase 1: ✅ 엑셀→JSON 변환 스크립트
- Phase 2: ✅ 전사 손익 + 매출/원가 드릴다운
- Phase 3: ✅ 비용 분석 + 차트
- Phase 4: ✅ 사업부별 손익 (KPI, 품목 드릴다운)
- Phase 5: 🔧 AI 챗봇 + 인증 + 관리자 (코드 구현 완료, Supabase 연동/테스트 필요)
