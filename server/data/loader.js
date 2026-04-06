/**
 * JSON 데이터 로더 — 메모리 캐싱
 * public/data/ 폴더의 JSON 파일을 읽어서 캐싱한다.
 * sales_cost_raw.json은 310MB로 매우 크므로 사전 로딩하지 않는다.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'public', 'data');

// 메모리 캐시
const cache = {};

/** JSON 파일 로드 (캐싱) */
function loadJson(filename) {
  if (cache[filename]) return cache[filename];

  const filePath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  cache[filename] = data;
  return data;
}

/** 서버 시작 시 주요 파일 사전 로딩 (raw 제외) */
function preload() {
  const files = [
    'pl_monthly.json',
    'sales_cost_summary.json',
    'expense_detail.json',
  ];
  for (const f of files) {
    try {
      loadJson(f);
      console.log(`  ✓ ${f} 로딩 완료`);
    } catch (err) {
      console.error(`  ✗ ${f} 로딩 실패:`, err.message);
    }
  }
}

module.exports = { loadJson, preload };
