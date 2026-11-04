/**
 * Client service for HTP child art psychology analysis.
 * All Gemini AI processing is securely executed on the server via /api/analyze-psychology.
 */
import { RuleInsights } from '../types';

export async function analyzeDrawingWithGemini(
  imageBase64: string,
  rules: RuleInsights
): Promise<string> {
  const response = await fetch('/api/analyze-psychology', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageData: imageBase64,
      realtimeRules: rules,
    }),
  });

  const data = await response.json();
  if (response.ok && data?.success && data?.html) {
    return data.html;
  }

  throw new Error(data?.message || 'Gemini AI 심리 분석 중 오류가 발생했습니다.');
}
