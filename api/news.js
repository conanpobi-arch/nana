// api/news.js - 항상 최신 Gemini 요약 (캐시 없음)
export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API 키가 설정되지 않았습니다.' });
  }

  try {
    const prompt = `
당신은 2026년 현재 뉴스 전문 요약가입니다.
지금 이 순간(현재 한국 시간)에서 가장 최신 뉴스만 기반으로 아래 5개 카테고리를 요약해주세요.
과거 뉴스(2025년 이전)는 절대 포함시키지 마세요. 2026년 2월 이후 뉴스만 사용하세요.
오래된 정보는 무시하고, 오늘 또는 최근 며칠 내 발생한 최신 동향만 반영하세요.

카테고리:
1. 국제정세
2. 미국 주식시장 및 경제
3. 헬스/항암신약 (특히 신장암 관련)
4. IT/AI/에이전트 분야
5. 화제의 영화/소설 (매출·평론 기반 진짜 히트작만)

요약 형식:
- 각 카테고리 제목 아래에 2~4줄 요약
- 핵심 사실 + 최근 동향 위주
- 한국어로 자연스럽고 간결하게
- 전체 500~900자 이내
- 출처나 링크는 넣지 말고 내용만
- "최신 뉴스섬머리 (현재 시간 기준)"으로 시작

지금 시점에서 가장 최신 정보를 바탕으로 작성하세요.
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini 오류: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '요약 생성 실패';

    const summary = generatedText.trim();

    res.status(200).json({ summary });
  } catch (error) {
    console.error('Gemini 오류:', error);
    res.status(500).json({ error: '뉴스 요약 생성 중 오류: ' + error.message });
  }
}
