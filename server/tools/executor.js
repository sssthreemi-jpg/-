/**
 * 도구 실행 디스패처 — toolName으로 분기하여 적절한 함수 호출
 */

const queryPLData = require('./queryPLData');
const querySalesCost = require('./querySalesCost');
const queryExpenseDetail = require('./queryExpenseDetail');
const calculateMetrics = require('./calculateMetrics');

/** 도구 결과 캐시 (5분 TTL) — 동일 쿼리 반복 시 즉시 반환 */
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(toolName, input) {
  const key = `${toolName}:${JSON.stringify(input)}`;
  const entry = queryCache.get(key);
  if (entry && Date.now() - entry.time < CACHE_TTL) return entry.result;
  return null;
}

function setCache(toolName, input, result) {
  const key = `${toolName}:${JSON.stringify(input)}`;
  queryCache.set(key, { result, time: Date.now() });
  // 캐시 크기 제한 (최대 100개)
  if (queryCache.size > 100) {
    const oldest = queryCache.keys().next().value;
    queryCache.delete(oldest);
  }
}

/** 결과 크기 제한 — 대량 데이터가 Claude 컨텍스트를 낭비하는 것 방지 */
const MAX_RESULT_ROWS = 30;

function truncateResult(result) {
  if (!result || !result.data || !Array.isArray(result.data)) return result;
  if (result.data.length <= MAX_RESULT_ROWS) return result;

  const totalCount = result.data.length;
  result.data = result.data.slice(0, MAX_RESULT_ROWS);
  result._note = `전체 ${totalCount}건 중 상위 ${MAX_RESULT_ROWS}건 반환. 필터를 추가하면 더 정밀한 결과를 얻을 수 있습니다.`;
  return result;
}

/**
 * 도구 실행
 * @param {string} toolName - 도구 이름
 * @param {object} input - 도구 입력 파라미터
 * @returns {object} 실행 결과
 */
function executeTool(toolName, input) {
  // 캐시 확인 (generate_chart 제외)
  if (toolName !== 'generate_chart') {
    const cached = getCached(toolName, input);
    if (cached) return cached;
  }

  try {
    let result;
    switch (toolName) {
      case 'query_pl_data':
        result = queryPLData(input);
        break;

      case 'query_sales_cost':
        result = querySalesCost(input);
        break;

      case 'query_expense_detail':
        result = queryExpenseDetail(input);
        break;

      case 'calculate_metrics':
        result = calculateMetrics(input);
        break;

      case 'generate_chart':
        // 차트 데이터는 그대로 프론트엔드에 전달
        return { chartData: input };

      default:
        return { error: `알 수 없는 도구: ${toolName}` };
    }

    const truncated = truncateResult(result);
    setCache(toolName, input, truncated);
    return truncated;
  } catch (err) {
    console.error(`도구 실행 오류 [${toolName}]:`, err.message);
    return { error: `도구 실행 중 오류 발생: ${err.message}` };
  }
}

module.exports = executeTool;
