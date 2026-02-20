// api/news.js - 항상 최신 Gemini 요약 (캐시 없음, 실시간 생성)
export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API 키가 설정되지 않았습니다.' });
  }

  try {
    // 한국 시간 설정 및 캐시 방지 헤더 추가
    const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    
    // 프롬프트 보강: '실시간 검색'과 '구체적 타겟팅' 강조
    const prompt = `
당신은 2026년 현재 뉴스 전문 요약가입니다. 
반드시 실시간 검색 결과를 바탕으로, 현재 한국 시간(${currentTime}) 기준 가장 신선한 뉴스만 요약하세요. 

[필수 준수 사항]:
1. 2026년 2월 현재 진행 중인 사건만 다룰 것 (과거 데이터 엄금).
2. 아래 5개 카테고리별로 최근 1~3일 내의 구체적인 수치나 사건을 언급할 것.
3. 헬스/항암신약 분야는 '신장암(RCC)' 관련 신규 임상이나 FDA 승인 등 최신 동향을 우선할 것.
4. AI 분야는 단순 모델 발표를 넘어 'AI 에이전트 시스템' 및 '자율형 워크플로우' 기술에 집중할 것.

카테고리:
1. 국제정세 (분쟁 및 외교적 급변점)
2. 미국 주식시장 및 경제 (금리, 지수 현황)
3. 헬스/항암신약 (특히 신장암 관련 혁신 치료제)
4. IT/AI/에이전트 분야 (Open-source AI 및 Agentic AI)
5. 화제의 영화/소설 (2026년 박스오피스 및 문학계 히트작)

요약 형식:
- "📰 최신 뉴스섬머리 (${currentTime} 기준)"으로 시작.
- 각 카테고리 제목 앞에 적절한 이모지 사용.
- 핵심 사실 위주로 간결한 한국어 구어체(전문적이나 딱딱하지 않게).
- 전체 500~900자 이내, 출처 링크 제외.
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7, // 약간의 창의성 부여 (자연스러운 요약 위해)
            topP: 0.95,
            maxOutputTokens: 1500, // 요약이 잘리지 않게 여유 있게 설정
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '요약 생성 실패';

    const summary = generatedText.trim();

    // 브라우저 캐싱 방지 헤더 설정
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.status(200).json({ summary });
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: '뉴스 엔진 가동 실패: ' + error.message });
  }
}
