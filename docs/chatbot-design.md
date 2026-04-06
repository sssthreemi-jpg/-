# AI 챗봇 기능 설계 명세서

> 최종 업데이트: 2026-03-30
> 상태: 설계 완료, 구현 대기

---

## 1. 개요

### 1.1 목적
손익 드릴다운 대시보드에 AI 챗봇을 추가하여, 경영진(본부장~대표이사)이 자연어로 재무 데이터를 질문하고 즉시 분석 결과를 받을 수 있도록 한다.

### 1.2 사용 시나리오
- 성과발표 중 실시간 질문 ("ETC 펙수클루 3개년 매출 추이는?")
- 발표 준비 단계 데이터 확인 ("CH사업부 25년 비용 분석해줘")
- 평시 수시 질문 ("26년 목표 대비 전사 매출 달성률은?")

### 1.3 핵심 요구사항
- Claude Sonnet 4.6 기반 자연어 질의응답
- Tool Use를 통한 정확한 데이터 조회
- 사용자별 대화 이력 1개월 보관
- @daewoong.co.kr 이메일 인증
- 월간 API 비용 상한 설정
- 관리자 페이지

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    클라이언트 (React + Vite)               │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  대시보드      │  │  챗봇 UI      │  │  관리자 페이지  │  │
│  │  (기존 페이지)  │  │  (플로팅)     │  │  (/admin)     │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                   │         │
│  ┌──────┴─────────────────┴───────────────────┴───────┐ │
│  │              Supabase Client SDK                    │ │
│  │         (인증 / 대화 이력 저장·조회)                   │ │
│  └─────────────────────┬──────────────────────────────┘ │
└────────────────────────┼────────────────────────────────┘
                         │
            ┌────────────┼────────────────┐
            ▼            ▼                ▼
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │  Supabase    │ │  Vercel      │ │  Vercel      │
  │  (Auth + DB) │ │  Serverless  │ │  Static      │
  │              │ │  Functions   │ │  Hosting     │
  │  - 사용자 관리│ │              │ │              │
  │  - 대화 이력  │ │  /api/chat   │ │  React SPA   │
  │  - 사용 통계  │ │  /api/admin  │ │  + JSON 데이터│
  │  - 공지사항   │ │              │ │              │
  └──────────────┘ └──────┬───────┘ └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │  Anthropic   │
                   │  Claude API  │
                   │  (Sonnet4.6) │
                   └──────────────┘
```

### 2.2 기술 스택

| 영역 | 기술 | 용도 |
|------|------|------|
| **프론트엔드** | React (Vite) + Tailwind CSS | 기존 유지 |
| **챗봇 UI** | 커스텀 React 컴포넌트 | 플로팅 버튼 + 채팅 패널 |
| **차트 (챗봇 내)** | Recharts | 기존과 동일한 차트 라이브러리 |
| **인증** | Supabase Auth | 이메일/비밀번호 + 도메인 제한 |
| **DB** | Supabase PostgreSQL | 대화 이력, 사용 통계, 공지 |
| **API 서버** | Vercel Serverless Functions | Claude API 프록시 + 도구 실행 |
| **AI 엔진** | Claude Sonnet 4.6 (Tool Use) | 자연어 이해 + 데이터 분석 |
| **데이터** | 정적 JSON (public/data/) | 기존 유지, 서버 함수에서도 로드 |

### 2.3 데이터 흐름 (챗봇 질문 처리)

```
사용자 질문 입력
       │
       ▼
[1] 프론트엔드: 인증 토큰 확인 → API 호출
       │
       ▼
[2] Vercel Function /api/chat:
    ├─ JWT 토큰 검증 (Supabase)
    ├─ 월간 비용 상한 체크
    ├─ 대화 이력 로드 (최근 N턴)
    ├─ Claude API 호출 (system prompt + tools + messages)
    │
    │  [3] Claude 응답: tool_use 요청
    │      │
    │      ▼
    │  [4] 서버: 도구 함수 실행 (JSON 데이터 조회)
    │      │
    │      ▼
    │  [5] Claude에 도구 결과 전달 → 최종 답변 생성
    │
    ├─ 토큰 사용량 기록 (Supabase)
    ├─ 대화 이력 저장 (Supabase)
    │
    ▼
[6] 프론트엔드: 답변 렌더링 (텍스트 + 테이블 + 차트)
```

---

## 3. 인증 시스템

### 3.1 Supabase Auth 설정

```
인증 방식: 이메일 + 비밀번호
도메인 제한: @daewoong.co.kr만 허용
세션 만료: 3시간 (자동 로그아웃)
```

### 3.2 사용자 역할

| 역할 | 권한 |
|------|------|
| `user` | 대시보드 조회, 챗봇 사용, 본인 대화 이력 조회 |
| `admin` | user 권한 + 관리자 페이지 접근 (사용자 관리, 통계, 설정 등) |

### 3.3 회원가입 흐름

```
[관리자]
  │
  ├─ 1. 허용 이메일 목록에 등록 (예: hong@daewoong.co.kr)
  │     → whitelist 테이블에 INSERT
  │
  ├─ 2. (선택) 초대 메일 발송 버튼 클릭
  │     → 해당 이메일로 가입 링크 + 초기 비밀번호 발송
  │
  ▼
[사용자]
  │
  ├─ 3. 가입 링크 클릭 또는 직접 가입 페이지 접속
  │
  ├─ 4. 이메일 입력 → @daewoong.co.kr 검증 + whitelist 확인
  │     → 미등록 이메일: "관리자에게 등록을 요청하세요" 표시
  │
  ├─ 5. 이메일 인증 링크 발송 → 클릭하여 인증 완료
  │
  ├─ 6. 초기 비밀번호로 로그인 → 비밀번호 변경 화면
  │
  └─ 7. 새 비밀번호 설정 → 대시보드 접근 가능
```

### 3.4 로그인 흐름

```
[로그인 페이지]
  │
  ├─ 이메일 + 비밀번호 입력
  │
  ├─ Supabase Auth 인증
  │   ├─ 성공 → JWT 발급 → 대시보드 이동
  │   └─ 실패 → 에러 메시지 표시
  │
  ├─ "비밀번호를 잊으셨나요?" 클릭
  │   → 이메일 입력 → 재설정 링크 발송
  │
  └─ 세션 유지: 3시간 (이후 자동 로그아웃)
      → 로그아웃 시 로그인 페이지로 리다이렉트
```

### 3.5 보안 설정

- **RLS (Row Level Security)**: 사용자는 자기 대화 이력만 조회 가능
- **도메인 검증**: 서버 측에서도 이메일 도메인 이중 검증
- **비밀번호 정책**: 최소 8자, 영문+숫자 조합
- **로그인 실패 제한**: 5회 실패 시 15분 잠금

---

## 4. 데이터베이스 스키마 (Supabase PostgreSQL)

### 4.1 테이블 설계

```sql
-- 1. 사용자 프로필 (Supabase Auth의 auth.users 확장)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,            -- 표시 이름 (예: 홍길동)
  role TEXT DEFAULT 'user',     -- 'user' | 'admin'
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- 2. 이메일 허용 목록 (화이트리스트)
CREATE TABLE public.allowed_emails (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,       -- 허용된 이메일
  invited_at TIMESTAMPTZ,           -- 초대 메일 발송 시각
  invited_by UUID REFERENCES auth.users(id),
  registered BOOLEAN DEFAULT false, -- 실제 가입 완료 여부
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 대화 세션
CREATE TABLE public.chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT,                     -- 자동 생성 (첫 질문 요약)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 대화 메시지
CREATE TABLE public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT NOT NULL,              -- 'user' | 'assistant'
  content TEXT NOT NULL,           -- 메시지 내용 (마크다운)
  chart_data JSONB,               -- 차트 렌더링 데이터 (있는 경우)
  table_data JSONB,               -- 테이블 렌더링 데이터 (있는 경우)
  token_usage JSONB,              -- { input_tokens, output_tokens }
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. API 사용량 추적
CREATE TABLE public.api_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  estimated_cost NUMERIC(10,6),   -- USD 기준
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 시스템 설정
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
-- 초기 설정 예시:
-- { key: 'monthly_cost_limit', value: { usd: 50 } }
-- { key: 'system_prompt', value: { content: '...' } }

-- 7. 공지사항
CREATE TABLE public.announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ           -- null이면 수동 비활성화까지 유지
);

-- ================================================
-- RLS 정책
-- ================================================

-- 대화 메시지: 본인 것만 조회 가능
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages"
  ON public.chat_messages FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 대화 세션: 본인 것만
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions"
  ON public.chat_sessions FOR SELECT
  USING (user_id = auth.uid());

-- 프로필: 본인 것만 조회, admin은 전체 조회
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 공지사항: 모든 로그인 사용자 조회 가능
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can view active announcements"
  ON public.announcements FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- ================================================
-- 자동 삭제 (1개월 경과 대화)
-- ================================================
-- Supabase pg_cron 확장 사용
SELECT cron.schedule(
  'delete-old-messages',
  '0 3 * * *',  -- 매일 새벽 3시
  $$DELETE FROM public.chat_messages
    WHERE created_at < now() - interval '30 days'$$
);
SELECT cron.schedule(
  'delete-empty-sessions',
  '0 4 * * *',
  $$DELETE FROM public.chat_sessions
    WHERE id NOT IN (SELECT DISTINCT session_id FROM public.chat_messages)$$
);
```

---

## 5. API 서버 (Vercel Serverless Functions)

### 5.1 엔드포인트 목록

```
api/
├── chat.js                POST /api/chat          챗봇 메시지 처리
├── chat-history.js        GET  /api/chat-history   대화 이력 조회
├── admin/
│   ├── users.js           GET/POST/DELETE          사용자 관리
│   ├── usage.js           GET                      API 사용량 조회
│   ├── settings.js        GET/PUT                  시스템 설정
│   ├── invite.js          POST                     초대 메일 발송
│   ├── logs.js            GET                      대화 로그 조회
│   ├── announcements.js   GET/POST/PUT/DELETE      공지사항 관리
│   └── stats.js           GET                      사용자별 질문 통계
```

### 5.2 /api/chat 핵심 로직

```javascript
// api/chat.js (Vercel Serverless Function)

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // ─── 1. 인증 확인 ───
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const token = req.headers.authorization?.split('Bearer ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: '인증 필요' });

  // ─── 2. 월간 비용 상한 체크 ───
  const monthlyUsage = await getMonthlyUsage(supabase);
  const costLimit = await getCostLimit(supabase);
  if (monthlyUsage >= costLimit) {
    return res.status(429).json({
      error: '이번 달 API 사용 한도에 도달했습니다. 관리자에게 문의하세요.'
    });
  }

  // ─── 3. 대화 이력 로드 ───
  const { sessionId, message } = req.body;
  const history = await loadChatHistory(supabase, sessionId, user.id);

  // ─── 4. Claude API 호출 (Tool Use 루프) ───
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const systemPrompt = await getSystemPrompt(supabase);

  let messages = [
    ...history,     // 이전 대화 (최근 20턴)
    { role: 'user', content: message }
  ];

  let response;
  let totalTokens = { input: 0, output: 0 };

  // Tool Use 루프: Claude가 도구 호출을 멈출 때까지 반복
  while (true) {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOL_DEFINITIONS,
      messages: messages
    });

    totalTokens.input += response.usage.input_tokens;
    totalTokens.output += response.usage.output_tokens;

    // 도구 호출이 없으면 최종 답변
    if (response.stop_reason === 'end_turn') break;

    // 도구 호출 처리
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    if (toolUseBlocks.length === 0) break;

    // 어시스턴트 메시지 추가
    messages.push({ role: 'assistant', content: response.content });

    // 각 도구 실행 결과를 tool_result로 추가
    const toolResults = [];
    for (const toolUse of toolUseBlocks) {
      const result = await executeTool(toolUse.name, toolUse.input);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result)
      });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  // ─── 5. 응답 파싱 (텍스트 + 차트/테이블 데이터 분리) ───
  const parsedResponse = parseAssistantResponse(response.content);

  // ─── 6. 대화 이력 & 사용량 저장 ───
  await saveChatMessage(supabase, sessionId, user.id, 'user', message);
  await saveChatMessage(supabase, sessionId, user.id, 'assistant',
    parsedResponse.text, parsedResponse.chartData, parsedResponse.tableData);
  await recordUsage(supabase, user.id, totalTokens);

  // ─── 7. 응답 반환 ───
  return res.status(200).json({
    message: parsedResponse.text,
    chartData: parsedResponse.chartData,
    tableData: parsedResponse.tableData,
    tokenUsage: totalTokens
  });
}
```

### 5.3 데이터 로딩 전략

```javascript
// 서버 함수에서 JSON 데이터 로딩
// Vercel Serverless는 /tmp 또는 메모리에 캐싱 가능

let cachedData = {};

async function loadJsonData(filename) {
  if (cachedData[filename]) return cachedData[filename];

  // Vercel에서는 빌드 시 public/data/를 포함
  // 또는 fetch로 자체 호스팅 URL에서 로드
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(process.cwd(), 'public', 'data', filename);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  cachedData[filename] = data;
  return data;
}

// 주의: sales_cost_raw.json은 310MB로 매우 큼
// → 서버 메모리 제한(Vercel 기본 1024MB)을 고려하여
//    필요할 때만 로드하고, 가능하면 스트리밍 파싱 사용
```

---

## 6. Claude Tool Use 설계

### 6.1 도구 정의

```javascript
const TOOL_DEFINITIONS = [
  // ─── 도구 1: 손익 데이터 조회 ───
  {
    name: "query_pl_data",
    description: `전사 또는 사업부별 손익계산서 데이터를 조회합니다.
조회 가능 항목: 매출, 매출원가, 매출원가율, 매출총이익, 영업판관비, 판매대행수수료,
매출변동비, 영업관리비, 일반관리비, 비효율비경상비용, R&D비용, R&D차감전이익, 영업이익 등 44개 항목.
조회 가능 연도: 2020~2026 (목표 데이터는 2026만 존재).
데이터 단위: 억원.
이 도구의 결과는 pl_monthly.json 기반으로 가장 신뢰도가 높습니다.`,
    input_schema: {
      type: "object",
      properties: {
        division: {
          type: "string",
          description: "사업부명. '전사', 'ETC', 'CH', '건기식', '나보타', '글로벌', '수탁', '기타' 중 하나",
          enum: ["전사", "ETC", "CH", "건기식", "나보타", "글로벌", "수탁", "기타"]
        },
        years: {
          type: "array",
          items: { type: "integer" },
          description: "조회할 연도 목록 (예: [2024, 2025, 2026])"
        },
        quarters: {
          type: "array",
          items: { type: "integer" },
          description: "특정 분기만 조회 시 (예: [1, 2]). 생략하면 전체 분기"
        },
        months: {
          type: "array",
          items: { type: "integer" },
          description: "특정 월만 조회 시 (예: [1, 2, 3]). 생략하면 전체 월"
        },
        items: {
          type: "array",
          items: { type: "string" },
          description: "조회할 손익 항목명 목록. 생략하면 주요 항목(매출, 매출원가, 매출총이익, 영업이익) 반환"
        },
        data_type: {
          type: "string",
          enum: ["실적", "목표", "both"],
          description: "실적/목표/둘다. 기본값 '실적'. 목표는 2026년만 존재"
        },
        aggregation: {
          type: "string",
          enum: ["monthly", "quarterly", "yearly"],
          description: "집계 단위. 기본값 'yearly'"
        }
      },
      required: ["division", "years"]
    }
  },

  // ─── 도구 2: 매출/원가 품목별 조회 ───
  {
    name: "query_sales_cost",
    description: `사업부별 품목 단위 매출·원가 데이터를 조회합니다.
드릴다운 계층:
- ETC: productType → category → profitTier → productGroup → productName
- CH/건기식: category → productGroup → productName
- 나보타: category(국내/수출) → productGroup → productName
- 글로벌: category(국가/채널) → productGroup → productName
- 수탁: category(수탁구분) → productGroup → productName
원본 단위: 원 (억원 변환은 서버에서 자동 처리).
특정 품목의 상세 매출/원가/원가율을 확인할 때 사용합니다.`,
    input_schema: {
      type: "object",
      properties: {
        division: {
          type: "string",
          enum: ["ETC", "CH", "건기식", "나보타", "글로벌", "수탁"]
        },
        years: {
          type: "array",
          items: { type: "integer" },
          description: "조회 연도 목록"
        },
        productType: {
          type: "string",
          description: "ETC 전용. 제품유형 필터"
        },
        category: {
          type: "string",
          description: "중분류 필터 (예: '기타품목', '수출')"
        },
        profitTier: {
          type: "string",
          description: "ETC 전용. 수익군 필터"
        },
        productGroup: {
          type: "string",
          description: "품목군 필터 (예: '펙수클루', '나보타')"
        },
        productName: {
          type: "string",
          description: "개별 품목명 필터"
        },
        aggregation: {
          type: "string",
          enum: ["monthly", "quarterly", "yearly"],
          description: "집계 단위. 기본값 'yearly'"
        },
        top_n: {
          type: "integer",
          description: "매출 상위 N개 품목만 반환. 기본값: 전체"
        }
      },
      required: ["division", "years"]
    }
  },

  // ─── 도구 3: 비용 상세 조회 ───
  {
    name: "query_expense_detail",
    description: `비용 전표 상세 데이터를 조회합니다.
조회 가능 연도: 2022~2025만 (2020~2021, 2026은 없음).
계층: category2(대분류) → category3(세부항목) → bizUnit(사업구분: 직접/공통).
대분류 예시: 영업판관비, 판매대행수수료, 매출변동비, 영업관리비, 일반관리비, 비효율비경상비용, R&D비용.
금액 단위: 원 (억원 변환은 서버에서 자동 처리).`,
    input_schema: {
      type: "object",
      properties: {
        years: {
          type: "array",
          items: { type: "integer" },
          description: "조회 연도 (2022~2025만 가능)"
        },
        category2: {
          type: "string",
          description: "비용 대분류 필터"
        },
        category3: {
          type: "string",
          description: "비용 세부항목 필터"
        },
        bizUnit: {
          type: "string",
          description: "사업구분 필터 (ETC, CH, 건기식, 나보타, 글로벌, 수탁, 공통)"
        },
        aggregation: {
          type: "string",
          enum: ["monthly", "quarterly", "yearly"],
          description: "집계 단위. 기본값 'yearly'"
        }
      },
      required: ["years"]
    }
  },

  // ─── 도구 4: 지표 계산 ───
  {
    name: "calculate_metrics",
    description: `파생 지표를 계산합니다. 원가율, 성장률, 목표 달성률, 비용 비율 등.
복합 계산이 필요할 때 사용합니다.`,
    input_schema: {
      type: "object",
      properties: {
        metric_type: {
          type: "string",
          enum: [
            "cost_rate",          // 원가율 = 매출원가/매출
            "growth_rate",        // 성장률 = (당기-전기)/전기
            "target_achievement", // 목표달성률 = 실적/목표
            "expense_ratio",      // 비용비율 = 특정비용/매출
            "gross_margin",       // 매출총이익률 = 매출총이익/매출
            "operating_margin"    // 영업이익률 = 영업이익/매출
          ],
          description: "계산할 지표 유형"
        },
        division: {
          type: "string",
          description: "사업부명"
        },
        productGroup: {
          type: "string",
          description: "품목군 (원가율 계산 시)"
        },
        years: {
          type: "array",
          items: { type: "integer" }
        },
        period: {
          type: "string",
          enum: ["monthly", "quarterly", "yearly", "ytd"],
          description: "집계 기간. ytd = 연초~현재월 누적"
        }
      },
      required: ["metric_type", "years"]
    }
  },

  // ─── 도구 5: 차트 데이터 생성 ───
  {
    name: "generate_chart",
    description: `데이터를 시각화할 차트 데이터를 생성합니다.
사용자가 추이, 비교, 구성비 등을 물어볼 때 적절한 차트를 함께 제공합니다.
차트 종류는 데이터 특성에 맞게 자동 선택합니다.`,
    input_schema: {
      type: "object",
      properties: {
        chart_type: {
          type: "string",
          enum: ["line", "bar", "stacked_bar", "pie", "composed"],
          description: "차트 유형. line=추이, bar=비교, stacked_bar=구성, pie=비율, composed=복합"
        },
        title: {
          type: "string",
          description: "차트 제목"
        },
        data: {
          type: "array",
          description: "차트 데이터 배열. 각 항목은 { name, ...values } 형태"
        },
        x_key: {
          type: "string",
          description: "X축 데이터 키"
        },
        y_keys: {
          type: "array",
          items: { type: "string" },
          description: "Y축 데이터 키 목록"
        },
        y_label: {
          type: "string",
          description: "Y축 레이블 (예: '억원', '%')"
        }
      },
      required: ["chart_type", "title", "data", "x_key", "y_keys"]
    }
  }
];
```

### 6.2 도구 실행 함수

```javascript
async function executeTool(toolName, input) {
  switch (toolName) {
    case 'query_pl_data':
      return await queryPLData(input);
    case 'query_sales_cost':
      return await querySalesCost(input);
    case 'query_expense_detail':
      return await queryExpenseDetail(input);
    case 'calculate_metrics':
      return await calculateMetrics(input);
    case 'generate_chart':
      // 차트 데이터는 그대로 프론트엔드에 전달
      return { chartData: input };
    default:
      return { error: `알 수 없는 도구: ${toolName}` };
  }
}

// ─── 도구 실행 예시: query_sales_cost ───
async function querySalesCost(input) {
  const data = await loadJsonData('sales_cost_summary.json');

  let filtered = data.data.filter(row => {
    if (input.division && row.division !== input.division) return false;
    if (input.years && !input.years.includes(row.year)) return false;
    if (input.productType && row.productType !== input.productType) return false;
    if (input.category && row.category !== input.category) return false;
    if (input.profitTier && row.profitTier !== input.profitTier) return false;
    if (input.productGroup && !row.productGroup?.includes(input.productGroup)) return false;
    if (input.productName && !row.productName?.includes(input.productName)) return false;
    return true;
  });

  // 집계
  const aggregation = input.aggregation || 'yearly';
  const grouped = {};

  filtered.forEach(row => {
    let key;
    if (aggregation === 'monthly') key = `${row.year}-${String(row.month).padStart(2, '0')}`;
    else if (aggregation === 'quarterly') key = `${row.year}-Q${row.quarter}`;
    else key = `${row.year}`;

    if (!grouped[key]) grouped[key] = { period: key, sales: 0, cost: 0 };
    grouped[key].sales += row.sales;
    grouped[key].cost += row.cost;
  });

  // 원 → 억원 변환 + 원가율 계산
  const result = Object.values(grouped)
    .sort((a, b) => a.period.localeCompare(b.period))
    .map(g => ({
      period: g.period,
      sales_억원: +(g.sales / 1e8).toFixed(1),
      cost_억원: +(g.cost / 1e8).toFixed(1),
      cost_rate: g.sales > 0 ? +((g.cost / g.sales) * 100).toFixed(1) : 0
    }));

  // 상위 N개 필터
  if (input.top_n) {
    return result.slice(0, input.top_n);
  }

  return {
    division: input.division,
    filters: { productGroup: input.productGroup, category: input.category },
    count: result.length,
    data: result
  };
}
```

---

## 7. 시스템 프롬프트

```javascript
const DEFAULT_SYSTEM_PROMPT = `
당신은 대웅제약 손익분석 AI 비서입니다.
경영진(본부장~대표이사)이 사용하므로 격식체 보고서 톤으로 답변합니다.

## 역할
- 사업부별 손익 데이터를 정확하게 조회하여 보고합니다.
- 데이터에 기반한 간결한 해석을 덧붙입니다.
- 시각화가 도움되는 경우 적절한 차트를 함께 제공합니다.

## 사업부 목록
ETC, CH, 건기식, 나보타, 글로벌, 수탁, 기타 (전사 = 전체 합산)

## 손익 구조
매출 → 매출원가 → 매출총이익 → 비용(7종) → R&D차감전이익 → R&D비용 → 영업이익
비용 7종: 영업판관비, 판매대행수수료, 매출변동비, 영업관리비, 일반관리비, 비효율/비경상비용, R&D비용

## 데이터 범위
- 손익 데이터 (pl_monthly): 2020~2026년 실적, 2026년 목표
- 품목별 매출/원가 (sales_cost_summary): 2020~2026년
- 비용 상세 (expense_detail): 2022~2025년만 존재
- 데이터 갱신: 매월 15일 이전

## 응답 규칙
1. 금액 단위는 억원, 소수점 1자리까지 표시합니다.
2. 전년동기비 증감을 항상 함께 언급합니다.
3. 증가는 **파란색(▲)**, 감소는 **빨간색(▼)**으로 표시합니다.
4. 데이터가 없는 범위 요청 시: "해당 기간의 데이터가 존재하지 않습니다. [가용 범위]를 안내드립니다."
5. 업무 외 질문 시: "손익 데이터와 관련된 질문에 답변드리고 있습니다."
6. 추이/비교 질문에는 차트(generate_chart 도구)를 함께 제공합니다.
7. 3개 이상의 데이터 포인트가 있으면 표 형태로 정리합니다.
8. 데이터 해석은 1~2문장으로 간결하게 덧붙입니다.

## 데이터 우선순위
- 매출/원가 총액 비교 시: pl_monthly.json 값을 우선합니다.
- 품목별 상세는: sales_cost_summary.json을 사용합니다.

## 답변 형식
답변 시 다음 구조를 따릅니다:
1. 핵심 수치 요약 (1~2줄)
2. 상세 데이터 (표 또는 목록)
3. 차트 (해당되는 경우)
4. 간결한 해석 (1~2문장)
`;
```

---

## 8. 프론트엔드 설계

### 8.1 새로 추가되는 컴포넌트

```
src/
├── components/
│   ├── chat/
│   │   ├── ChatButton.jsx         # 플로팅 버튼 (우측 하단)
│   │   ├── ChatPanel.jsx          # 채팅 패널 (슬라이드 인)
│   │   ├── ChatMessage.jsx        # 개별 메시지 렌더링
│   │   ├── ChatChart.jsx          # 메시지 내 차트 렌더링
│   │   ├── ChatTable.jsx          # 메시지 내 테이블 렌더링
│   │   ├── ChatInput.jsx          # 입력창 + 전송 버튼
│   │   ├── ChatSuggestions.jsx    # 추천 질문 버튼들
│   │   └── ChatSessionList.jsx    # 이전 대화 세션 목록
│   ├── auth/
│   │   ├── LoginPage.jsx          # 로그인 화면
│   │   ├── SignupPage.jsx         # 회원가입 화면
│   │   ├── ResetPassword.jsx      # 비밀번호 재설정
│   │   ├── ChangePassword.jsx     # 비밀번호 변경 (최초 로그인)
│   │   └── AuthGuard.jsx          # 인증 상태 체크 래퍼
│   └── admin/
│       ├── AdminLayout.jsx        # 관리자 페이지 레이아웃
│       ├── UserManagement.jsx     # 사용자 목록/추가/삭제/역할변경
│       ├── UsageDashboard.jsx     # API 사용량 대시보드
│       ├── CostSettings.jsx       # 비용 상한 설정
│       ├── ChatLogs.jsx           # 전체 대화 로그 조회
│       ├── PromptEditor.jsx       # 시스템 프롬프트 편집기
│       ├── Announcements.jsx      # 공지사항 관리
│       └── UserStats.jsx          # 사용자별 질문 통계
├── contexts/
│   └── AuthContext.jsx            # 인증 상태 전역 관리
├── lib/
│   └── supabase.js                # Supabase 클라이언트 초기화
```

### 8.2 챗봇 UI 상세

```
[데스크탑 - 플로팅 버튼 상태]
──────────────────────────────────────
│                                    │
│        (대시보드 내용)               │
│                                    │
│                         ┌────────┐ │
│                         │ 💬 AI  │ │  ← 우측 하단 고정
│                         │  비서   │ │     56x56px 원형 버튼
│                         └────────┘ │
──────────────────────────────────────

[데스크탑 - 채팅 패널 열린 상태]
──────────────────────────────────────
│                    │ AI 비서     ✕ │
│                    │───────────────│
│   (대시보드 내용)   │ 📢 3월 데이터 │  ← 공지사항 배너
│                    │   갱신 완료   │
│                    │───────────────│
│                    │ 🤖 안녕하세요 │
│                    │ 무엇을 도와   │
│                    │ 드릴까요?     │
│                    │               │
│                    │ [ETC 매출 현황]│  ← 추천 질문
│                    │ [비용 분석]   │
│                    │ [원가율 추이] │
│                    │───────────────│
│                    │ 메시지 입력... │
│                    │          [▶] │
──────────────────────────────────────
                      ↑ 폭: 420px
                        우측에서 슬라이드 인

[모바일 - 채팅 열린 상태]
──────────────────
│ ← AI 비서      │  ← 풀스크린
│────────────────│
│ 📢 공지사항    │
│────────────────│
│                │
│ 🤖 안녕하세요  │
│                │
│ 👤 ETC 펙수클루│
│    3개년 매출? │
│                │
│ 🤖 조회 결과:  │
│ ┌────────────┐│
│ │ 2024: 972억││  ← HTML 테이블
│ │ 2025: 942억││
│ └────────────┘│
│ ┌────────────┐│
│ │ ╱‾‾‾╲      ││  ← Recharts 차트
│ │╱     ╲     ││
│ └────────────┘│
│────────────────│
│ 메시지 입력... │
│           [▶] │
──────────────────
```

### 8.3 추천 질문 목록

```javascript
const SUGGESTED_QUESTIONS = [
  // 매출 관련
  "전사 26년 1분기 매출 실적을 알려주세요",
  "ETC 사업부 주요 품목별 매출 현황을 보여주세요",
  "나보타 수출 매출 추이를 알려주세요",

  // 원가 관련
  "ETC 펙수클루 3개년 원가율 추이를 알려주세요",
  "사업부별 원가율 비교를 해주세요",

  // 비용 관련
  "CH사업부 25년 비용 분석을 해주세요",
  "전사 영업판관비 전년 대비 증감을 알려주세요",

  // 종합 분석
  "26년 목표 대비 전사 매출 달성률은 어떤가요?",
  "전사 25년 영업이익률을 알려주세요"
];
```

### 8.4 메시지 렌더링 규칙

```
Claude 답변 → 파싱:

1. 일반 텍스트 → 마크다운 렌더링 (react-markdown)
   - ▲ → <span class="text-blue-600">▲</span>
   - ▼ → <span class="text-red-600">▼</span>
   - **볼드** → <strong>

2. 차트 데이터 (chartData) → <ChatChart /> 컴포넌트
   - Recharts로 렌더링
   - 차트 종류: line, bar, stacked_bar, pie, composed
   - 기존 대시보드와 동일한 색상 체계 적용

3. 테이블 데이터 (tableData) → <ChatTable /> 컴포넌트
   - HTML 테이블로 렌더링
   - 기존 대시보드 테이블 스타일과 동일 (주황 헤더, 증감 색상)
   - 모바일에서는 가로 스크롤

4. 로딩 상태 → 타이핑 인디케이터 (점 3개 애니메이션)
```

---

## 9. 관리자 페이지

### 9.1 라우팅

```
/admin              → 관리자 대시보드 (요약)
/admin/users        → 사용자 관리
/admin/usage        → API 사용량
/admin/settings     → 시스템 설정 (비용 상한, 프롬프트)
/admin/logs         → 대화 로그
/admin/announcements → 공지사항 관리
/admin/stats        → 사용자별 통계
```

### 9.2 기능 상세

#### A. 사용자 관리 (/admin/users)

```
┌─────────────────────────────────────────────────────┐
│ 사용자 관리                          [+ 사용자 초대] │
│─────────────────────────────────────────────────────│
│ 이메일              │ 이름  │ 역할   │ 가입일  │ 작업 │
│─────────────────────────────────────────────────────│
│ hong@daewoong.co.kr │ 홍길동│ admin  │ 03-15  │ [···]│
│ kim@daewoong.co.kr  │ 김철수│ user   │ 03-20  │ [···]│
│ (대기) lee@daewoong │  -   │  -     │  -     │ [재발송]│
│─────────────────────────────────────────────────────│
│                                                     │
│ [+ 사용자 초대] 클릭 시:                              │
│ ┌─────────────────────────────────────┐              │
│ │ 이메일: [           @daewoong.co.kr]│              │
│ │ 역할:  ○ 일반 사용자  ○ 관리자      │              │
│ │                    [초대 메일 발송]  │              │
│ └─────────────────────────────────────┘              │
└─────────────────────────────────────────────────────┘

[···] 메뉴:
- 역할 변경 (user ↔ admin)
- 계정 비활성화
- 계정 삭제
```

#### B. API 사용량 대시보드 (/admin/usage)

```
┌─────────────────────────────────────────────────┐
│ API 사용량                     2026년 3월        │
│─────────────────────────────────────────────────│
│                                                 │
│  이번 달 비용          상한 설정                  │
│  ┌──────────┐         ┌──────────┐              │
│  │  $12.40  │         │  $50.00  │              │
│  │  (24.8%) │         │  [변경]   │              │
│  └──────────┘         └──────────┘              │
│                                                 │
│  ████████░░░░░░░░░░░░░░░░░░░  24.8%            │
│                                                 │
│  일별 사용량 차트                                 │
│  ┌─────────────────────────────────────────┐    │
│  │     ╱╲                                  │    │
│  │    ╱  ╲    ╱╲                           │    │
│  │───╱────╲──╱──╲─────────────────────     │    │
│  │  1일  5일  10일  15일  20일  25일  30일  │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  총 요청 수: 423회 │ 평균 비용/질문: $0.029      │
│  입력 토큰: 847K   │ 출력 토큰: 211K             │
└─────────────────────────────────────────────────┘
```

#### C. 비용 상한 설정 (/admin/settings)

```
- 월간 비용 상한 (USD): [     50.00    ]
- 상한 도달 시 동작:
  ○ 챗봇 비활성화 + 안내 메시지 표시
  ○ 관리자에게 이메일 알림만 (계속 사용 가능)
- 경고 임계값: [  80  ]% 도달 시 관리자 알림
```

#### D. 대화 로그 (/admin/logs)

```
┌───────────────────────────────────────────────────┐
│ 대화 로그                                          │
│───────────────────────────────────────────────────│
│ 필터: [사용자 ▼] [기간 ▼] [키워드 검색...]         │
│───────────────────────────────────────────────────│
│ 시각       │ 사용자 │ 질문 요약          │ 토큰   │
│───────────────────────────────────────────────────│
│ 03-30 14:22│ 홍길동 │ ETC 펙수클루 매출..│ 2,340  │
│ 03-30 14:18│ 김철수 │ CH사업부 비용분석..│ 3,120  │
│ 03-30 13:55│ 홍길동 │ 전사 영업이익률.. │ 1,890  │
│───────────────────────────────────────────────────│
│ [클릭 시 전체 대화 내용 펼침]                       │
└───────────────────────────────────────────────────┘
```

#### E. 시스템 프롬프트 편집 (/admin/settings)

```
┌───────────────────────────────────────────────────┐
│ 시스템 프롬프트 설정                                │
│───────────────────────────────────────────────────│
│ ┌───────────────────────────────────────────────┐ │
│ │ 당신은 대웅제약 손익분석 AI 비서입니다.          │ │
│ │ 경영진(본부장~대표이사)이 사용하므로...          │ │
│ │                                               │ │
│ │ (편집 가능한 텍스트 에어리어)                    │ │
│ │                                               │ │
│ └───────────────────────────────────────────────┘ │
│                                                   │
│ 마지막 수정: 2026-03-30 홍길동                     │
│                        [초기화] [미리보기] [저장]   │
└───────────────────────────────────────────────────┘
```

#### F. 시스템 상태 (/admin 메인)

```
┌───────────────────────────────────────────────┐
│ 시스템 상태                                    │
│───────────────────────────────────────────────│
│ Claude API    ● 정상    평균 응답: 2.3초       │
│ Supabase      ● 정상    DB 사용량: 12MB/500MB │
│ 데이터 갱신   2026-03-14 (16일 전)             │
│ 에러율        0.8% (최근 7일)                  │
└───────────────────────────────────────────────┘
```

#### G. 공지사항 관리 (/admin/announcements)

```
- 제목: [                              ]
- 내용: [                              ]
- 만료일: [2026-04-30] (선택사항)
- [게시] [미리보기]

활성 공지:
  ✅ "3월 데이터가 갱신되었습니다" (03-15 ~ 04-14)
  ✅ "25년 결산 데이터가 반영되었습니다" (03-01 ~ 03-31)
```

#### H. 사용자별 통계 (/admin/stats)

```
┌───────────────────────────────────────────────┐
│ 사용자별 통계              2026년 3월          │
│───────────────────────────────────────────────│
│ 사용자  │ 질문수 │ 토큰사용량 │ 비용    │ 마지막│
│───────────────────────────────────────────────│
│ 홍길동  │  156  │  312K    │ $4.68  │ 오늘  │
│ 김철수  │   89  │  178K    │ $2.67  │ 어제  │
│ 이영희  │   45  │   90K    │ $1.35  │ 3일전 │
│───────────────────────────────────────────────│
│ 합계    │  290  │  580K    │ $8.70  │       │
└───────────────────────────────────────────────┘
```

---

## 10. 라우팅 변경

### 10.1 전체 라우트 구조

```javascript
// App.jsx 변경
<BrowserRouter>
  <Routes>
    {/* 공개 라우트 (인증 불필요) */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/change-password" element={<ChangePassword />} />

    {/* 보호 라우트 (인증 필요) */}
    <Route element={<AuthGuard />}>
      <Route element={<Layout />}>
        <Route path="/" element={<CompanySummary />} />
        <Route path="/division" element={<DivisionPL />} />
        <Route path="/cost" element={<CostRateAnalysis />} />
        <Route path="/expense" element={<ExpenseAnalysis />} />
        <Route path="/rnd" element={<ExpenseAnalysis />} />
      </Route>

      {/* 관리자 라우트 (admin 역할 필요) */}
      <Route element={<AdminGuard />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="usage" element={<UsageDashboard />} />
          <Route path="settings" element={<CostSettings />} />
          <Route path="logs" element={<ChatLogs />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="stats" element={<UserStats />} />
        </Route>
      </Route>
    </Route>
  </Routes>

  {/* 챗봇: 인증된 사용자에게만 표시 (모든 페이지에서 접근) */}
  <ChatButton />
</BrowserRouter>
```

---

## 11. 추가 패키지

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@supabase/supabase-js": "^2.49.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0"
  }
}
```

---

## 12. 환경변수

```env
# 프론트엔드 (.env - Vite)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# 서버 (Vercel 환경변수 - 대시보드에서 설정)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...    # 관리자용 키 (프론트에 노출 금지)
ANTHROPIC_API_KEY=sk-ant-...              # Claude API 키 (프론트에 노출 금지)
```

---

## 13. 보안 체크리스트

| 항목 | 대응 |
|------|------|
| API 키 보호 | Vercel 서버 환경변수에만 저장, 프론트에 노출하지 않음 |
| 인증 | Supabase Auth + JWT + @daewoong.co.kr 도메인 제한 |
| 데이터 격리 | RLS로 사용자별 대화 분리 |
| 세션 관리 | 3시간 자동 만료 |
| 비용 제어 | 월간 상한 설정 + 초과 시 자동 차단 |
| 대화 보관 | 30일 후 자동 삭제 (pg_cron) |
| 입력 검증 | 서버 측에서 이메일 도메인 이중 검증 |
| 프롬프트 인젝션 | 시스템 프롬프트에 역할 고정 + 업무 외 질문 거부 규칙 |
| HTTPS | Vercel 기본 HTTPS 적용 |

---

## 14. 구현 순서

### Phase 1: 기반 인프라
1. Supabase 프로젝트 생성 + DB 스키마 적용
2. Anthropic API 키 발급
3. Vercel 프로젝트 설정 + 환경변수

### Phase 2: 인증 시스템
4. Supabase Auth 설정 (이메일/비밀번호)
5. 로그인/회원가입/비밀번호 재설정 페이지
6. AuthGuard + AuthContext 구현
7. 이메일 도메인 제한 + 화이트리스트

### Phase 3: 챗봇 백엔드
8. Vercel Serverless Function: /api/chat
9. Tool Use 도구 함수 4개 구현 (PL, 매출원가, 비용, 지표계산)
10. 차트 데이터 생성 도구
11. 대화 이력 저장/조회 API
12. 비용 추적 + 상한 체크

### Phase 4: 챗봇 프론트엔드
13. ChatButton (플로팅 버튼)
14. ChatPanel (채팅 패널)
15. ChatMessage (마크다운 + 차트 + 테이블 렌더링)
16. ChatInput + ChatSuggestions
17. ChatSessionList (이전 대화 목록)
18. 모바일 반응형 대응

### Phase 5: 관리자 페이지
19. AdminLayout + 라우팅
20. 사용자 관리 (목록/초대/역할변경/삭제)
21. API 사용량 대시보드
22. 비용 상한 설정
23. 대화 로그 조회
24. 시스템 프롬프트 편집기
25. 공지사항 관리
26. 사용자별 통계

### Phase 6: 테스트 & 튜닝
27. 시스템 프롬프트 최적화 (실제 질문으로 테스트)
28. 엣지 케이스 처리 (데이터 없는 기간, 복합 질문 등)
29. 성능 최적화 (JSON 캐싱, 응답 시간)
30. 보안 점검

---

## 15. 비용 예측 (월간)

| 항목 | 예상 비용 |
|------|----------|
| Claude API (Sonnet 4.6) | $5~30/월 (사용량에 따라) |
| Supabase Free Plan | $0 (20명 사용자, 500MB DB 충분) |
| Vercel Hobby/Pro | $0~20/월 |
| **총 예상** | **$5~50/월** |
