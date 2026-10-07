// 피드백 랩 — 모델 단가표 (대략적 비용 표기용)
// 기준: Google 공표 단가 2026-10 확인분, 요청당 20만 토큰 이하 구간. 변경 시 이 파일만 갱신.
// 환율은 고정 근사치(1 USD ≈ 1,400원)로 "약" 표기에만 사용한다.

export interface ModelPrice {
  inPerM: number; // USD / 1M 입력 토큰
  outPerM: number; // USD / 1M 출력 토큰 (thinking 포함)
}

export const MODEL_PRICING: Record<string, ModelPrice> = {
  'gemini-2.5-flash': { inPerM: 0.3, outPerM: 2.5 },
  'gemini-2.5-pro': { inPerM: 1.25, outPerM: 10.0 },
};

const USD_KRW = 1400;

export interface TokenUsage {
  prompt: number;
  output: number;
  total: number;
}

export function estimateCost(model: string | undefined, tokens: TokenUsage) {
  const p = MODEL_PRICING[model ?? 'gemini-2.5-flash'];
  if (!p) return null;
  const usd = (tokens.prompt / 1e6) * p.inPerM + (tokens.output / 1e6) * p.outPerM;
  const krw = Math.round(usd * USD_KRW / 10) * 10;
  return {
    usd,
    krw,
    // "토큰수 × 토큰당 가격 = 최종 가격" 설명용 수식 문자열
    formula: `입력 ${tokens.prompt.toLocaleString('ko-KR')} × $${p.inPerM}/1M + 출력 ${tokens.output.toLocaleString('ko-KR')} × $${p.outPerM}/1M = $${usd.toFixed(2)}`,
  };
}
