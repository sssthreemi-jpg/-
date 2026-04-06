# AI 챗봇 구현 프롬프트 모음

> 아래 프롬프트를 Phase 순서대로 Claude Code 터미널에 붙여넣어 실행합니다.
> 각 Phase가 완료된 후 다음 Phase로 넘어가세요.
> 설계 명세서: `docs/chatbot-design.md`

---

## Phase 1: Supabase DB 스키마 적용

> Supabase 대시보드(SQL Editor)에서 직접 실행하는 SQL입니다.
> Claude Code가 아닌 **Supabase 웹 대시보드 → SQL Editor**에서 실행하세요.

```sql
-- ================================================
-- Phase 1: Supabase DB 스키마
-- Supabase 대시보드 → SQL Editor 에서 실행
-- ================================================

-- 1. 사용자 프로필
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- 2. 이메일 허용 목록
CREATE TABLE public.allowed_emails (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  invited_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id),
  registered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 대화 세션
CREATE TABLE public.chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 대화 메시지
CREATE TABLE public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  chart_data JSONB,
  table_data JSONB,
  token_usage JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. API 사용량 추적
CREATE TABLE public.api_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  estimated_cost NUMERIC(10,6),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 시스템 설정
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 7. 공지사항
CREATE TABLE public.announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- ================================================
-- 초기 데이터
-- ================================================
INSERT INTO public.system_settings (key, value) VALUES
  ('monthly_cost_limit', '{"usd": 50}'),
  ('cost_warning_threshold', '{"percent": 80}'),
  ('system_prompt', '{"content": "당신은 대웅제약 손익분석 AI 비서입니다."}');

-- ================================================
-- RLS 정책
-- ================================================

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- allowed_emails
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can check whitelist" ON public.allowed_emails FOR SELECT USING (true);
CREATE POLICY "Admins can manage whitelist" ON public.allowed_emails FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- chat_sessions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sessions" ON public.chat_sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins can view all sessions" ON public.chat_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all messages" ON public.chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- api_usage
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage" ON public.api_usage FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all usage" ON public.api_usage FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read settings" ON public.system_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update settings" ON public.system_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read announcements" ON public.announcements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ================================================
-- 트리거: 회원가입 시 자동 프로필 생성
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  UPDATE public.allowed_emails SET registered = true WHERE email = NEW.email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- 30일 지난 대화 자동 삭제 (pg_cron)
-- Supabase 대시보드 → Database → Extensions → pg_cron 활성화 후 실행
-- ================================================
-- SELECT cron.schedule(
--   'delete-old-messages',
--   '0 3 * * *',
--   $$DELETE FROM public.chat_messages WHERE created_at < now() - interval '30 days'$$
-- );
-- SELECT cron.schedule(
--   'delete-empty-sessions',
--   '0 4 * * *',
--   $$DELETE FROM public.chat_sessions WHERE id NOT IN (SELECT DISTINCT session_id FROM public.chat_messages)$$
-- );
```

---

## Phase 2: 챗봇 백엔드 (로컬 Express 서버)

아래 프롬프트를 Claude Code 터미널에 붙여넣으세요.

```
docs/chatbot-design.md 설계서를 읽고, 챗봇 백엔드를 로컬 Express 서버로 구현해줘.

## 목표
개발 단계에서 인증 없이 챗봇 기능만 먼저 동작시킨다.
나중에 Vercel Serverless Functions로 전환할 예정이므로, 핵심 로직은 별도 모듈로 분리한다.

## 구조
```
server/
├── index.js                  # Express 서버 진입점 (포트 3001)
├── routes/
│   └── chat.js               # POST /api/chat 라우트
├── tools/
│   ├── definitions.js        # Claude Tool Use 도구 정의 5개
│   ├── queryPLData.js        # pl_monthly.json 조회
│   ├── querySalesCost.js     # sales_cost_summary.json 조회
│   ├── queryExpenseDetail.js # expense_detail.json 조회
│   ├── calculateMetrics.js   # 파생 지표 계산
│   └── executor.js           # 도구 실행 디스패처
├── data/
│   └── loader.js             # JSON 파일 로딩 + 메모리 캐싱
├── prompts/
│   └── system.js             # 시스템 프롬프트 (chatbot-design.md 7장 참고)
└── utils/
    └── tokenCost.js          # 토큰 사용량 → USD 비용 계산
```

## 핵심 요구사항

### 1. Express 서버 (server/index.js)
- 포트 3001, CORS 허용 (localhost:5173)
- JSON body parsing
- 라우트: POST /api/chat

### 2. Chat 라우트 (server/routes/chat.js)
- @anthropic-ai/sdk 사용
- 모델: claude-sonnet-4-6-20250514
- max_tokens: 4096
- Tool Use 루프 구현: Claude가 tool_use를 반환하면 도구 실행 → tool_result 전달 → 반복 → end_turn이면 종료
- 요청 body: { message: string, sessionId?: string, history?: array }
- 응답: { message: string, chartData?: object, tableData?: object, tokenUsage: { input, output } }
- 개발 단계이므로 인증 체크는 건너뛰되, 주석으로 // TODO: 인증 체크 표시

### 3. 도구 정의 (server/tools/definitions.js)
- chatbot-design.md 6.1장의 5개 도구 정의를 그대로 사용
- query_pl_data, query_sales_cost, query_expense_detail, calculate_metrics, generate_chart

### 4. 도구 구현
- queryPLData.js: pl_monthly.json에서 사업부/연도/분기/월/항목별 필터링 + 집계(monthly/quarterly/yearly)
- querySalesCost.js: sales_cost_summary.json에서 필터링, 원→억원 변환(÷1e8), 원가율 계산
- queryExpenseDetail.js: expense_detail.json에서 필터링, 원→억원 변환
- calculateMetrics.js: 원가율, 성장률, 목표달성률, 비용비율, 매출총이익률, 영업이익률 계산
  - pl_monthly.json 데이터를 우선 사용
- executor.js: toolName으로 분기하여 적절한 함수 호출

### 5. 데이터 로더 (server/data/loader.js)
- public/data/ 폴더의 JSON 파일을 읽어서 메모리에 캐싱
- sales_cost_raw.json은 310MB로 매우 크므로 초기 로딩하지 말고, 필요할 때만 로드
- 나머지 3개 파일은 서버 시작 시 사전 로딩

### 6. 시스템 프롬프트 (server/prompts/system.js)
- chatbot-design.md 7장의 DEFAULT_SYSTEM_PROMPT를 그대로 사용
- export default로 내보내기

### 7. 차트 데이터 처리
- generate_chart 도구가 반환하는 데이터는 그대로 chartData 필드에 넣어서 프론트에 전달
- Claude가 차트 없이 텍스트만 답변할 수도 있으므로, chartData는 optional

## 환경변수
- .env 파일에서 ANTHROPIC_API_KEY 로드 (dotenv 사용)

## 패키지 설치
- express, cors, dotenv, @anthropic-ai/sdk 설치 (devDependencies)
- package.json의 scripts에 "server": "node server/index.js" 추가

## 주의사항
- 기존 프론트엔드 코드는 절대 수정하지 마.
- public/data/ JSON 파일을 수정하지 마.
- .env 파일을 수정하지 마.
- 서버 코드는 전부 server/ 폴더 안에 작성해.
- 한국어 주석 사용.
```

---

## Phase 3: 챗봇 프론트엔드 UI

```
docs/chatbot-design.md 설계서 8장을 읽고, 챗봇 프론트엔드 UI를 구현해줘.

## 목표
플로팅 버튼 + 슬라이드 채팅 패널을 모든 페이지에 추가한다.
개발 단계이므로 인증 없이 동작하며, 로컬 Express 서버(localhost:3001)와 통신한다.

## 새로 생성할 파일
```
src/components/chat/
├── ChatButton.jsx         # 플로팅 버튼 (우측 하단)
├── ChatPanel.jsx          # 채팅 패널 컨테이너
├── ChatMessage.jsx        # 개별 메시지 렌더링 (마크다운 + 차트 + 테이블)
├── ChatChart.jsx          # Recharts 기반 차트 렌더링
├── ChatTable.jsx          # HTML 테이블 렌더링
├── ChatInput.jsx          # 입력창 + 전송 버튼
└── ChatSuggestions.jsx    # 추천 질문 버튼
```

## 수정할 파일
- src/App.jsx: ChatButton 컴포넌트를 라우터 내부, Routes 바깥에 추가
- package.json: react-markdown, remark-gfm 추가

## 상세 요구사항

### 1. ChatButton.jsx
- 우측 하단 고정 (fixed bottom-6 right-6)
- 56x56px 원형 버튼, 배경색 #F5A623 (기존 대시보드 테마 색상)
- 아이콘: 말풍선 형태 SVG (외부 라이브러리 없이 인라인 SVG)
- 클릭 시 ChatPanel 토글
- 패널이 열려있을 때는 X 아이콘으로 변경
- z-index: 50

### 2. ChatPanel.jsx
- 데스크탑: 우측에서 슬라이드 인, 폭 420px, 높이 100vh, fixed
- 모바일(md 미만): 풀스크린 (100vw, 100vh)
- 헤더: "AI 비서" 제목 + 닫기(X) 버튼 + 새 대화 버튼
- 바디: 메시지 목록 (스크롤)
- 초기 상태: 환영 메시지 + 추천 질문 표시
- 새 메시지 도착 시 자동 스크롤
- 로딩 중: 타이핑 인디케이터 (점 3개 애니메이션)
- API 주소: 개발 시 http://localhost:3001/api/chat

### 3. ChatMessage.jsx
- role별 스타일 분리:
  - user: 우측 정렬, 배경 #F5A623 + 흰색 텍스트
  - assistant: 좌측 정렬, 배경 gray-100
- assistant 메시지 내용:
  - 텍스트: react-markdown + remark-gfm 으로 렌더링
  - ▲ 기호 → 파란색(text-blue-600), ▼ 기호 → 빨간색(text-red-600)
  - chartData가 있으면 → ChatChart 렌더링
  - tableData가 있으면 → ChatTable 렌더링

### 4. ChatChart.jsx
- Recharts 사용 (이미 설치됨)
- chartData 구조에 따라 자동으로 차트 종류 선택:
  - chart_type: "line" → LineChart
  - chart_type: "bar" → BarChart
  - chart_type: "stacked_bar" → BarChart (stacked)
  - chart_type: "pie" → PieChart
  - chart_type: "composed" → ComposedChart
- 기존 대시보드와 동일한 색상 체계 사용 (constants.js의 DIVISION_COLORS 참조)
- 반응형: 부모 너비에 맞춤 (ResponsiveContainer)
- 차트 높이: 250px

### 5. ChatTable.jsx
- tableData 배열을 HTML 테이블로 렌더링
- 기존 대시보드 테이블 스타일과 유사:
  - 헤더: bg-orange-50, 텍스트 bold
  - 숫자: 우측 정렬, 콤마 포맷
  - 증가: text-blue-600, 감소: text-red-600
- 모바일에서 가로 스크롤 (overflow-x-auto)
- 최대 높이 300px, 넘으면 세로 스크롤

### 6. ChatInput.jsx
- 하단 고정 입력 영역
- textarea (자동 높이 조절, 최대 4줄)
- 전송 버튼 (우측, #F5A623 색상)
- Enter로 전송, Shift+Enter로 줄바꿈
- 전송 중에는 입력 비활성화 + 버튼 로딩 상태

### 7. ChatSuggestions.jsx
- 추천 질문 버튼 목록 (가로 스크롤 또는 wrap)
- 버튼 스타일: border rounded-full, 클릭 시 해당 텍스트로 자동 질문
- 추천 질문 (chatbot-design.md 8.3장 참고):
  - "전사 26년 1분기 매출 실적"
  - "ETC 주요 품목별 매출 현황"
  - "사업부별 원가율 비교"
  - "전사 25년 비용 분석"
  - "26년 목표 대비 매출 달성률"
- 첫 메시지 전에만 표시, 대화 시작 후 숨김

### 8. App.jsx 수정
- ChatButton을 Routes와 동일 레벨에 추가 (Routes 바깥, BrowserRouter 안쪽)
- 기존 라우트는 변경하지 않음

## 스타일 규칙
- Tailwind CSS만 사용 (기존 프로젝트 규칙 준수)
- 기존 대시보드의 주황/노란 헤더 톤과 일관된 디자인
- 다크모드 없음
- 애니메이션: Tailwind transition 클래스 사용 (transform, opacity)

## 주의사항
- 기존 페이지 컴포넌트(CompanySummary, DivisionPL 등)는 절대 수정하지 마.
- Layout.jsx도 이 단계에서는 수정하지 마.
- 기존 hooks/useData.js, utils/ 파일은 수정하지 마.
- 챗봇 상태(메시지 목록, 열림/닫힘)는 ChatPanel 내부 state로 관리.
```

---

## Phase 4: 인증 시스템

```
docs/chatbot-design.md 설계서 3장을 읽고, Supabase Auth 기반 인증 시스템을 구현해줘.

## 목표
@daewoong.co.kr 이메일만 허용하는 이메일/비밀번호 인증을 추가한다.
로그인하지 않으면 대시보드와 챗봇 모두 접근할 수 없도록 한다.

## 사전 조건
- Supabase 프로젝트가 생성되어 있고, Phase 1의 DB 스키마가 적용되어 있음
- .env 파일에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY가 설정되어 있음

## 새로 생성할 파일
```
src/
├── lib/
│   └── supabase.js            # Supabase 클라이언트 초기화
├── contexts/
│   └── AuthContext.jsx         # 인증 상태 전역 관리 (Context + Provider)
├── components/auth/
│   ├── LoginPage.jsx           # 로그인 화면
│   ├── SignupPage.jsx          # 회원가입 화면
│   ├── ResetPassword.jsx       # 비밀번호 재설정 요청
│   ├── ChangePassword.jsx      # 비밀번호 변경 (최초 로그인 또는 재설정)
│   └── AuthGuard.jsx           # 인증 상태 체크 래퍼 (Outlet 사용)
```

## 수정할 파일
- src/App.jsx: AuthGuard로 보호 라우트 감싸기 + 인증 라우트 추가
- src/main.jsx: AuthProvider로 전체 앱 감싸기
- src/components/Layout.jsx: 헤더에 사용자 이름 + 로그아웃 버튼 추가
- src/components/chat/ChatPanel.jsx: API 호출 시 인증 토큰 헤더 추가
- server/routes/chat.js: JWT 토큰 검증 로직 추가 (Supabase로 검증)

## 상세 요구사항

### 1. Supabase 클라이언트 (src/lib/supabase.js)
- createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- export로 내보내기

### 2. AuthContext (src/contexts/AuthContext.jsx)
- 상태: user, session, loading, profile(display_name, role)
- supabase.auth.onAuthStateChange로 세션 변화 감지
- 로그인 시 profiles 테이블에서 role 정보 로드
- 세션 만료(3시간) 처리: 자동 로그아웃 → 로그인 페이지 리다이렉트
- 제공 함수: signIn, signUp, signOut, resetPassword, updatePassword

### 3. LoginPage.jsx
- 중앙 정렬 카드 형태
- 상단: 로고/제목 ("손익 드릴다운 레포트")
- 입력: 이메일, 비밀번호
- 버튼: "로그인"
- 링크: "회원가입" → /signup, "비밀번호를 잊으셨나요?" → /reset-password
- 에러 표시: 잘못된 이메일/비밀번호 등
- 로그인 성공 시 / (대시보드)로 이동
- 스타일: 기존 대시보드와 동일한 주황색 톤

### 4. SignupPage.jsx
- 입력: 이메일(@daewoong.co.kr만), 이름, 비밀번호, 비밀번호 확인
- 이메일 도메인 검증 (프론트 + 서버 양쪽)
- allowed_emails 테이블에 등록된 이메일인지 확인
  - 미등록: "관리자에게 등록을 요청하세요" 메시지
- 비밀번호 규칙: 8자 이상, 영문+숫자 조합
- 가입 성공 시: 이메일 인증 안내 화면 표시 (Supabase가 인증 메일 자동 발송)
- Supabase signUp 호출 시 options.data에 display_name 전달

### 5. ResetPassword.jsx
- 이메일 입력 → Supabase resetPasswordForEmail 호출
- "재설정 링크가 이메일로 발송되었습니다" 안내

### 6. ChangePassword.jsx
- 새 비밀번호 + 확인 입력
- Supabase updateUser({ password }) 호출
- URL에 토큰이 포함된 상태에서 접근 (Supabase가 리다이렉트)

### 7. AuthGuard.jsx
- useAuth()로 인증 상태 확인
- loading 중: 스피너 표시
- 미인증: /login으로 리다이렉트
- 인증됨: <Outlet /> 렌더링

### 8. App.jsx 변경
```jsx
<BrowserRouter>
  <Routes>
    {/* 공개 라우트 */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/change-password" element={<ChangePassword />} />

    {/* 보호 라우트 */}
    <Route element={<AuthGuard />}>
      <Route element={<Layout />}>
        <Route path="/" element={<CompanySummary />} />
        <Route path="/division" element={<DivisionPL />} />
        <Route path="/cost" element={<CostRateAnalysis />} />
        <Route path="/expense" element={<ExpenseAnalysis />} />
        <Route path="/rnd" element={<ExpenseAnalysis />} />
      </Route>
    </Route>
  </Routes>
  <ChatButton />
</BrowserRouter>
```

### 9. main.jsx 변경
- AuthProvider로 BrowserRouter 감싸기

### 10. Layout.jsx 변경
- 데스크탑 사이드바 상단 또는 하단에: 사용자 이름(display_name) 표시 + 로그아웃 버튼
- 모바일: 상단 헤더에 사용자 이름 + 로그아웃 아이콘 버튼

### 11. ChatPanel.jsx 변경
- API 호출 시 Authorization: Bearer {session.access_token} 헤더 추가
- useAuth()에서 session 가져오기

### 12. server/routes/chat.js 변경
- 요청 헤더에서 Authorization Bearer 토큰 추출
- Supabase createClient(url, service_role_key)로 토큰 검증
  - supabase.auth.getUser(token)
  - 실패 시 401 반환
- .env에서 SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL 로드

## Supabase 대시보드 설정 (수동)
프롬프트 실행 후 아래를 Supabase 대시보드에서 직접 설정하세요:
1. Authentication → Settings → Site URL: http://localhost:5173
2. Authentication → Settings → Redirect URLs: http://localhost:5173/change-password
3. Authentication → Settings → JWT expiry: 10800 (3시간 = 10800초)
4. Authentication → Email Templates → 한국어로 커스터마이즈 (선택)

## 주의사항
- 기존 페이지 컴포넌트(CompanySummary, DivisionPL 등)는 절대 수정하지 마.
- 기존 hooks/useData.js, utils/ 파일은 수정하지 마.
- .env 파일은 수정하지 마.
```

---

## Phase 5: 관리자 페이지

```
docs/chatbot-design.md 설계서 9장을 읽고, 관리자 페이지를 구현해줘.

## 목표
admin 역할 사용자만 접근 가능한 관리자 페이지를 만든다.
사용자 관리, API 사용량, 비용 상한, 대화 로그, 시스템 프롬프트 편집, 공지사항, 사용자별 통계 기능을 포함한다.

## 새로 생성할 파일
```
src/components/admin/
├── AdminLayout.jsx        # 관리자 페이지 레이아웃 (사이드 메뉴)
├── AdminGuard.jsx         # admin 역할 체크
├── AdminDashboard.jsx     # 요약 대시보드 (시스템 상태)
├── UserManagement.jsx     # 사용자 목록/초대/역할변경/삭제
├── UsageDashboard.jsx     # API 사용량 차트
├── CostSettings.jsx       # 비용 상한 설정
├── ChatLogs.jsx           # 전체 대화 로그 조회
├── PromptEditor.jsx       # 시스템 프롬프트 편집기
├── Announcements.jsx      # 공지사항 관리
└── UserStats.jsx          # 사용자별 질문 통계
```

## 수정할 파일
- src/App.jsx: /admin 라우트 그룹 추가 (AdminGuard로 보호)
- src/components/Layout.jsx: admin 사용자에게 "관리자" 링크 표시
- server/routes/ 에 admin 관련 API 추가

## 서버 API 추가 (server/routes/)
```
server/routes/
├── admin/
│   ├── users.js           # GET /api/admin/users - 사용자 목록
│   │                      # POST /api/admin/users/invite - 초대 메일 발송
│   │                      # PUT /api/admin/users/:id/role - 역할 변경
│   │                      # DELETE /api/admin/users/:id - 계정 삭제
│   ├── usage.js           # GET /api/admin/usage - 월간 사용량 조회
│   │                      # GET /api/admin/usage/daily - 일별 사용량
│   ├── settings.js        # GET /api/admin/settings - 설정 조회
│   │                      # PUT /api/admin/settings - 설정 변경
│   ├── logs.js            # GET /api/admin/logs - 대화 로그 조회
│   ├── announcements.js   # CRUD /api/admin/announcements
│   └── stats.js           # GET /api/admin/stats - 사용자별 통계
```

## 상세 요구사항

### 1. AdminGuard.jsx
- useAuth()에서 profile.role 확인
- role !== 'admin'이면 / (대시보드)로 리다이렉트

### 2. AdminLayout.jsx
- 좌측 사이드 메뉴: 대시보드, 사용자, 사용량, 설정, 로그, 공지, 통계
- 우측: 선택된 페이지 콘텐츠 (Outlet)
- 상단: "관리자 페이지" 제목 + 대시보드로 돌아가기 링크
- 모바일: 상단 탭 또는 햄버거 메뉴

### 3. AdminDashboard.jsx (chatbot-design.md 9.2 F항 참고)
- 시스템 상태 카드: Claude API 상태, Supabase 상태, 마지막 데이터 갱신일
- 이번 달 요약: 총 질문 수, 총 비용, 활성 사용자 수
- 최근 에러 목록 (있는 경우)

### 4. UserManagement.jsx (chatbot-design.md 9.2 A항 참고)
- 사용자 목록 테이블: 이메일, 이름, 역할, 가입일, 마지막 로그인, 작업 버튼
- 대기 중 초대 목록 (allowed_emails에서 registered=false)
- [+ 사용자 초대] 버튼: 모달에서 이메일 입력 → allowed_emails INSERT + 초대 메일 발송
- 역할 변경: 드롭다운 (user ↔ admin)
- 계정 삭제: 확인 모달 후 삭제
- 초대 메일 재발송 버튼

### 5. UsageDashboard.jsx (chatbot-design.md 9.2 B항 참고)
- 이번 달 총 비용 카드 + 상한 대비 % 프로그레스 바
- 일별 사용량 차트 (Recharts BarChart)
- 총 요청 수, 평균 비용/질문, 입력/출력 토큰 합계

### 6. CostSettings.jsx (chatbot-design.md 9.2 C항 참고)
- 월간 비용 상한 (USD) 입력 필드
- 경고 임계값 (%) 입력 필드
- 상한 도달 시 동작 선택 (챗봇 비활성화 / 알림만)
- system_settings 테이블에 저장

### 7. ChatLogs.jsx (chatbot-design.md 9.2 D항 참고)
- 필터: 사용자, 기간, 키워드 검색
- 목록: 시각, 사용자, 질문 요약, 토큰
- 클릭 시 전체 대화 내용 펼침 (아코디언)

### 8. PromptEditor.jsx (chatbot-design.md 9.2 E항 참고)
- 큰 textarea에 현재 시스템 프롬프트 표시
- 수정 → 저장 시 system_settings 테이블 업데이트
- [초기화] 버튼: 기본 프롬프트로 복원
- 마지막 수정자, 수정 시각 표시

### 9. Announcements.jsx (chatbot-design.md 9.2 G항 참고)
- 활성 공지 목록 + 새 공지 작성 폼
- 제목, 내용, 만료일(선택) 입력
- 게시/비활성화/삭제 기능

### 10. UserStats.jsx (chatbot-design.md 9.2 H항 참고)
- 사용자별 테이블: 이름, 질문 수, 토큰 사용량, 비용, 마지막 사용일
- 월 선택 드롭다운
- 합계 행

### 11. server/routes/admin/*.js
- 모든 admin API에 admin 역할 검증 미들웨어 적용
- Supabase service_role_key로 사용자 관리 (auth.admin API 사용)
- 초대 메일: Supabase의 inviteUserByEmail 사용 또는 signUp 후 비밀번호 재설정 메일 발송

### 12. App.jsx 라우트 추가
```jsx
<Route element={<AdminGuard />}>
  <Route path="/admin" element={<AdminLayout />}>
    <Route index element={<AdminDashboard />} />
    <Route path="users" element={<UserManagement />} />
    <Route path="usage" element={<UsageDashboard />} />
    <Route path="settings" element={<CostSettings />} />
    <Route path="logs" element={<ChatLogs />} />
    <Route path="prompt" element={<PromptEditor />} />
    <Route path="announcements" element={<Announcements />} />
    <Route path="stats" element={<UserStats />} />
  </Route>
</Route>
```

### 13. Layout.jsx 변경
- admin 역할 사용자에게 사이드바/탭에 "관리자" 링크 추가 → /admin으로 이동

### 14. ChatPanel.jsx 변경
- 활성 공지사항 표시: 채팅 패널 상단에 announcements 테이블에서 is_active=true인 공지 배너
- Supabase에서 직접 조회 (API 불필요)

### 15. server/routes/chat.js 변경
- 시스템 프롬프트를 하드코딩이 아닌 system_settings 테이블에서 조회
- 월간 비용 상한 체크: api_usage 테이블에서 이번 달 합계 조회 → system_settings의 monthly_cost_limit과 비교
- 상한 초과 시 429 에러 반환

## 주의사항
- 기존 페이지 컴포넌트(CompanySummary, DivisionPL 등)는 절대 수정하지 마.
- 기존 hooks/useData.js, utils/ 파일은 수정하지 마.
- .env 파일은 수정하지 마.
- 관리자 API는 반드시 admin 역할 검증을 거쳐야 해.
```

---

## Phase 6: 통합 테스트 & 최적화

```
챗봇, 인증, 관리자 페이지가 모두 구현된 상태야. 아래 작업을 해줘.

## 1. 통합 점검
- 모든 라우트가 정상 동작하는지 확인 (로그인, 회원가입, 대시보드, 챗봇, 관리자)
- 미인증 상태에서 보호 라우트 접근 시 /login으로 리다이렉트 되는지 확인
- admin이 아닌 사용자가 /admin 접근 시 대시보드로 리다이렉트 되는지 확인
- ChatPanel에서 메시지 전송 → 서버 → Claude API → 응답까지 정상 흐름 확인

## 2. 에러 핸들링 보강
- 네트워크 에러 시 사용자에게 재시도 버튼 표시
- Claude API 타임아웃(30초) 설정 및 타임아웃 안내 메시지
- 서버 에러(500) 시 일반적인 에러 메시지 표시 (내부 에러 정보 노출 금지)
- 빈 응답 처리

## 3. 성능 최적화
- ChatPanel: 메시지 목록이 길어질 때 가상 스크롤 또는 페이지네이션 고려
- 서버: JSON 데이터 캐싱이 제대로 동작하는지 확인
- 서버: Claude API 호출 시 대화 이력은 최근 20턴만 전송 (토큰 절약)

## 4. 대화 이력 기능
- ChatPanel에 "이전 대화" 목록 버튼 추가
- 세션 목록 조회 → 클릭 시 해당 세션 메시지 로드
- 새 대화 시작 버튼
- 대화 이력은 1개월간 보관됨을 UI에 명시 ("대화 이력은 30일간 보관됩니다")

## 5. 시스템 프롬프트 최적화 (server/prompts/system.js)
- 현재 시스템 프롬프트가 system_settings 테이블에서 로드되도록 되어있는지 확인
- 기본 프롬프트(fallback)는 파일에 유지

## 주의사항
- 기존 대시보드 페이지 컴포넌트는 수정하지 마.
- 새 파일 생성이 필요하면 해도 됨.
- 기능 추가보다는 기존 구현의 안정성과 완성도에 집중해줘.
```

---

## 실행 순서 요약

| 순서 | 작업 | 실행 위치 |
|------|------|----------|
| 1 | Phase 1 SQL 실행 | Supabase SQL Editor |
| 2 | Supabase Auth 설정 (Site URL 등) | Supabase 대시보드 |
| 3 | Phase 2 프롬프트 실행 | Claude Code 터미널 |
| 4 | `npm run server`로 테스트 | 터미널 |
| 5 | Phase 3 프롬프트 실행 | Claude Code 터미널 |
| 6 | `npm run dev` + `npm run server`로 챗봇 테스트 | 터미널 2개 |
| 7 | Phase 4 프롬프트 실행 | Claude Code 터미널 |
| 8 | 로그인/회원가입 테스트 | 브라우저 |
| 9 | Phase 5 프롬프트 실행 | Claude Code 터미널 |
| 10 | Phase 6 프롬프트 실행 | Claude Code 터미널 |
