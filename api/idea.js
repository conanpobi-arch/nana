export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키 누락' });

  const { field, idea } = req.body;

  const prompt = `당신은 최고 수준의 비즈니스 전략가이자 아이디어 분석가입니다.
분야: ${field}
아이디어: ${idea}

아래 항목으로 전문적으로 분석해주세요. 도입 멘트 없이 바로 본론부터 시작하세요.

✅ 핵심 강점
⚠️ 주요 리스크
🎯 타겟 고객
💡 차별화 전략
📌 실행 첫 단계 3가지`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 2048, topP: 0.95 }
        })
      }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!result) throw new Error('응답 없음');
    return res.status(200).json({ result });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
