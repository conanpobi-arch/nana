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

  const prompt = `당신은 코난포비님의 전담 소설 전문 번역가이자 엄격한 감독관입니다. 다음 [감독관 지침]을 철저히 준수하십시오.

[감독관 지침]:
1. [No Omission]: 단 하나의 문장도 누락하거나 요약하지 마십시오. 원문 문장 개수와 번역문 개수를 정확히 맞추십시오.
2. [Authentic Style]: 제미나이 특유의 유려하고 풍부한 문학적 표현력을 발휘하십시오.
3. [Cultural Context]: 현대어를 남발하지 말고 소설 당대의 문화와 언어적 색채를 살리십시오. 존댓말과 반말은 가족관계, 친분정도, 남녀관계, 고대중국의 예법에 따라 일관되게 적용하십시오.
4. [Anti-China]: 중국 발음을 절대 사용하지 마십시오. 모든 한자는 대한민국 한자음(한국식 읽기)으로만 표기하십시오.
5. [Crucial Structure]: 문단 사이에는 반드시 빈 줄(\n\n)을 삽입하여 문단을 명확히 구분하십시오. 단락 구분을 절대 생략하지 마십시오.
6. 본문 텍스트만 번역하십시오.

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
          generationConfig: { temperature: 0.25, topP: 0.95, maxOutputTokens: 8192 }
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
