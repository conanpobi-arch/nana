export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키 누락' });

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '텍스트 누락' });

  const prompt = `다음 영어 소설 텍스트를 자연스러운 한국어로 번역해주세요.
번역 규칙:
- 원문의 문체와 분위기를 최대한 살려주세요
- 대화체는 한국어 대화체로 자연스럽게
- 번역문만 출력하고 설명이나 주석은 제외

원문:
${text}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4096, topP: 0.95 }
        })
      }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!result) throw new Error('번역 결과 없음');
    return res.status(200).json({ result });
  } catch(e) {
    return res.status(502).json({ error: e.message });
  }
}
