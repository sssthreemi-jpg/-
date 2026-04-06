/**
 * 토큰 사용량 → USD 비용 추정
 * Claude Sonnet 4.6 기준 가격 (2025-05 기준)
 * Extended Thinking 포함
 */

// Sonnet 4.6 가격 (USD per 1M tokens)
const PRICE = {
  input: 3.0,    // $3 / 1M input tokens
  output: 15.0,  // $15 / 1M output tokens
};

/**
 * 토큰 수로 예상 비용 계산
 * @param {number} inputTokens
 * @param {number} outputTokens - thinking + text 토큰 모두 포함
 * @returns {number} USD 비용
 */
function estimateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1_000_000) * PRICE.input;
  const outputCost = (outputTokens / 1_000_000) * PRICE.output;
  return +(inputCost + outputCost).toFixed(6);
}

module.exports = { estimateCost, PRICE };
