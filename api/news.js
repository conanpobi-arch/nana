export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, max-age=0'); // 헤더 단순화

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키 누락' });

  const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  // 모바일 응답 속도를 위해 프롬프트를 명확하고 타이트하게 수정
  const prompt = `현재 한국시간 ${currentTime}. Google Search로 최신 소식을 카테고리별로 상세 요약하라.
  1. 🌐 국제정세 (배경/전망 포함)
  2. 📈 미국 주식/경제 (주요 수치/Fed 동향)
  3. 💊 헬스/항암신약 (신장암 RCC 중심)
  4. 🤖 IT/AI/에이전트 (Agentic AI/기술 업데이트)
  5. 🎬 영화/소설 (박스오피스/이슈)
  항목별 5줄 이상 전문적 구어체로 작성. 전체 1,500자 내외. 출처URL 본문 포함 금지.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 3072 } // 모바일 안정성을 위해 약간 하향
        }),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('No Candidate');

    const summary = (candidate.content?.parts ?? []).map(p => p.text || '').join('').trim();
    const groundingMeta = candidate.groundingMetadata || {};
    
    // 모바일 전송량 최적화: 필요한 데이터만 선별 전송
    return res.status(200).json({
      summary,
      generatedAt: currentTime
    });

  } catch (error) {
    console.error('Mobile Connection Error:', error);
    return res.status(502).json({ error: 'MOBILE_GATEWAY_TIMEOUT', detail: '연결 속도가 느립니다. 잠시 후 시도하세요.' });
  }
}
