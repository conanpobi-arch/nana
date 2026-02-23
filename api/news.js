// api/news.js - Gemini 2.0 Flash + Google Search Grounding 완전체
export default async function handler(req, res) {
  // CORS 및 헤더 설정 (모바일 안정성 위해 캐시 제어 단순화)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키 누락' });

  const currentTime = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  // [프롬프트 지침] 멘트 생략, 기호 금지, 모바일 최적화 분량 설정
  const prompt = `당신은 최고 수준의 뉴스 분석가입니다. 현재 시각은 ${currentTime}입니다.
Google Search를 사용하여 아래 5개 카테고리의 최신 소식을 요약하되, 다음 규칙을 절대 준수하세요.

[필수 규칙]
1. 도입부 설명(예: "알겠습니다", "요약해 드립니다")은 절대 출력하지 말고 본론부터 시작할 것.
2. ## 또는 ### 등 마크다운 헤더 기호는 절대 사용하지 말 것.
3. 각 카테고리당 최소 5줄 이상의 풍부한 내용을 작성할 것. 전체 약 1,500자 내외.
4. 전문적인 분석이 담긴 한국어 구어체로 작성할 것.

[카테고리]
1. 🌐 국제정세: 최근 48시간 내 분쟁·외교 급변점 및 전망
2. 📈 미국 주식/경제: 오늘 지수 변동 수치와 주요 기업 실적, Fed 동향
3. 💊 헬스/항암신약: 신장암(RCC) 관련 임상 결과나 FDA 소식 최우선
4. 🤖 IT/AI/에이전트: 오픈소스 모델 및 Agentic AI 업데이트 기능 중심
5. 🎬 영화/소설: 박스오피스 수치와 주요 문학계 이슈`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: {
            temperature: 0.3, // 정확도 우선
            maxOutputTokens: 3072, // 모바일 502 에러 방지를 위한 최적화 용량
            topP: 0.95
          },
        }),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('응답 후보 없음');

    const summary = (candidate.content?.parts ?? [])
      .map(p => p.text || '')
      .join('')
      .trim();

    return res.status(200).json({
      summary,
      generatedAt: currentTime
    });

  } catch (error) {
    console.error('[news.js Error]:', error.message);
    return res.status(502).json({ error: 'GATEWAY_ERROR', detail: error.message });
  }
}
