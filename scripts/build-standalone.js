/**
 * 독립 실행 가능한 단일 HTML 파일 생성 스크립트
 *
 * 사용법: node scripts/build-standalone.js
 *
 * 1. main.jsx를 HashRouter로 임시 변경 (file:// 프로토콜 대응)
 * 2. 코드 분할 없이 Vite 빌드
 * 3. JS/CSS를 HTML에 인라인
 * 4. JSON 데이터를 HTML에 임베딩 + fetch 인터셉터 추가
 * 5. dist/standalone.html 출력
 * 6. 원본 파일 복원
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const DATA_DIR = path.join(ROOT, 'public', 'data');

// ── 임베딩할 JSON 파일 (sales_cost_raw.json은 71MB라 제외) ──
const DATA_FILES = {
  '/data/pl_monthly.json': 'pl_monthly.json',           // 1.4MB - 전사/사업부 손익
  '/data/expense_detail.json': 'expense_detail.json',     // 1.8MB - 비용 전표 상세
  '/data/sales_cost_summary.json': 'sales_cost_summary.json', // 13MB - 품목별 매출/원가
};

// sales_cost_raw.json은 너무 커서 빈 응답 반환 (품목코드 상세 기능만 제한)
const SKIPPED_FILES = {
  '/data/sales_cost_raw.json': true,
};

console.log('=== 독립 실행 HTML 빌드 시작 ===\n');

// ════════════════════════════════════════
// Step 1: main.jsx 임시 패치 (HashRouter)
// ════════════════════════════════════════
const mainPath = path.join(SRC, 'main.jsx');
const mainOriginal = fs.readFileSync(mainPath, 'utf-8');

const mainPatched = mainOriginal
  .replace(
    "import { BrowserRouter } from 'react-router-dom'",
    "import { HashRouter } from 'react-router-dom'"
  )
  .replace('<BrowserRouter>', '<HashRouter>')
  .replace('</BrowserRouter>', '</HashRouter>');

fs.writeFileSync(mainPath, mainPatched);
console.log('[1/6] main.jsx → HashRouter 임시 패치 완료');

// ════════════════════════════════════════
// Step 2: 코드 분할 없는 Vite 빌드 설정
// ════════════════════════════════════════
const standaloneConfigPath = path.join(ROOT, 'vite.config.standalone.js');
const standaloneConfig = `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
    cssCodeSplit: false,
  },
})
`;
fs.writeFileSync(standaloneConfigPath, standaloneConfig);
console.log('[2/6] vite.config.standalone.js 생성');

// ════════════════════════════════════════
// Step 3: Vite 빌드 실행
// ════════════════════════════════════════
try {
  console.log('[3/6] Vite 빌드 중...');
  execSync('npx vite build --config vite.config.standalone.js', {
    cwd: ROOT,
    stdio: 'inherit',
  });
  console.log('[3/6] 빌드 완료');
} catch (e) {
  // 빌드 실패 시 원본 복원 후 종료
  fs.writeFileSync(mainPath, mainOriginal);
  fs.unlinkSync(standaloneConfigPath);
  console.error('빌드 실패:', e.message);
  process.exit(1);
}

// ════════════════════════════════════════
// Step 4: 원본 복원
// ════════════════════════════════════════
fs.writeFileSync(mainPath, mainOriginal);
fs.unlinkSync(standaloneConfigPath);
console.log('[4/6] 원본 파일 복원 완료');

// ════════════════════════════════════════
// Step 5: HTML에 JS/CSS 인라인 + JSON 임베딩
// ════════════════════════════════════════
console.log('[5/6] HTML 인라인 처리 중...');

let html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8');

// CSS 인라인
html = html.replace(
  /<link[^>]+rel="stylesheet"[^>]+href="(\/assets\/[^"]+\.css)"[^>]*\/?>/g,
  (match, href) => {
    const cssPath = path.join(DIST, href);
    if (fs.existsSync(cssPath)) {
      let css = fs.readFileSync(cssPath, 'utf-8');
      return `<style>${css}</style>`;
    }
    return match;
  }
);

// JS 인라인 (type="module" 유지)
html = html.replace(
  /<script\s+type="module"[^>]*\s+src="(\/assets\/[^"]+\.js)"[^>]*><\/script>/g,
  (match, src) => {
    const jsPath = path.join(DIST, src);
    if (fs.existsSync(jsPath)) {
      let js = fs.readFileSync(jsPath, 'utf-8');
      return `<script type="module">${js}</script>`;
    }
    return match;
  }
);

// crossorigin 속성이 있는 경우도 처리
html = html.replace(
  /<script\s+[^>]*src="(\/assets\/[^"]+\.js)"[^>]*><\/script>/g,
  (match, src) => {
    const jsPath = path.join(DIST, src);
    if (fs.existsSync(jsPath)) {
      let js = fs.readFileSync(jsPath, 'utf-8');
      return `<script type="module">${js}</script>`;
    }
    return match;
  }
);

// link preload 제거 (인라인되었으므로 불필요)
html = html.replace(/<link[^>]+rel="modulepreload"[^>]*\/?>/g, '');

// ── JSON 데이터 임베딩 ──
let dataScripts = '\n<!-- ══ 임베딩된 JSON 데이터 ══ -->\n';

for (const [urlPath, filename] of Object.entries(DATA_FILES)) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`  경고: ${filename} 파일 없음, 건너뜀`);
    continue;
  }
  let json = fs.readFileSync(filePath, 'utf-8');
  // <script> 태그 내부에서 </script>가 나타나면 깨지므로 이스케이프
  json = json.replace(/<\/script>/gi, '<\\/script>');
  const id = 'embedded-' + filename.replace(/[^a-zA-Z0-9]/g, '_');
  dataScripts += `<script type="application/json" id="${id}" data-path="${urlPath}">${json}</script>\n`;
  const sizeMB = (Buffer.byteLength(json, 'utf-8') / 1024 / 1024).toFixed(1);
  console.log(`  임베딩: ${filename} (${sizeMB} MB)`);
}

// ── fetch 인터셉터 ──
const interceptor = `
<script>
(function() {
  // 임베딩된 JSON 데이터 매핑
  var dataMap = {};
  document.querySelectorAll('script[type="application/json"][data-path]').forEach(function(el) {
    dataMap[el.getAttribute('data-path')] = el.textContent;
  });

  var _origFetch = window.fetch;
  window.fetch = function(url) {
    var path = typeof url === 'string' ? url : url.toString();
    // 해시 라우터로 인한 상대경로 보정
    if (path.startsWith('./data/')) path = '/data/' + path.slice(7);

    if (dataMap[path]) {
      return Promise.resolve(new Response(dataMap[path], {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    // sales_cost_raw.json은 크기가 너무 커서 제외됨
    if (path.indexOf('sales_cost_raw') !== -1) {
      return Promise.resolve(new Response(
        JSON.stringify({ data: [], _notice: '독립실행 파일에서는 품목코드 상세 데이터가 제외되었습니다.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }
    return _origFetch.apply(this, arguments);
  };
})();
</script>`;

// head 태그 뒤에 인터셉터와 데이터 삽입
html = html.replace('</head>', dataScripts + interceptor + '\n</head>');

// ════════════════════════════════════════
// Step 6: 출력
// ════════════════════════════════════════
const outputPath = path.join(DIST, 'standalone.html');
fs.writeFileSync(outputPath, html, 'utf-8');

const fileSize = fs.statSync(outputPath).size;
const sizeMB = (fileSize / 1024 / 1024).toFixed(1);

console.log(`[6/6] 생성 완료!\n`);
console.log(`  파일: dist/standalone.html`);
console.log(`  크기: ${sizeMB} MB`);
console.log(`\n  사용법: 브라우저에서 standalone.html을 직접 열면 됩니다.`);
console.log(`  참고: 품목코드 상세보기 기능은 데이터 크기(71MB) 문제로 제외됨\n`);
