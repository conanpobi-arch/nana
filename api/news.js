// api/news.js - Gemini 2.0 Flash + Google Search Grounding (최대 분량 & 심층 분석)
export default async function handler(req, res) {
  // ── 0. CORS & 보안 헤더 ──────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET 요청만 허용됩니다.' });

  // ── 1. 환경변수 확인 ────────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API 키가 설정되지 않았습니다.' });
  }

  // ── 2. 한국 시간 (KST) ──────────────────────────────────────────────────────
  const currentTime = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  // ── 3. 프롬프트 (분량 및 깊이 대폭 강화) ────────────────────────────────────────
  const prompt = `
당신은 전 세계의 핵심 동향을 분석하는 최고 수준의 뉴스 정보 요약가입니다.
현재 한국 시간(${currentTime})을 기준으로 Google Search를 통해 '가장 최신의, 신뢰할 수 있는' 뉴스를 검색하고 요약하세요.

[카테고리별 요약 지침 - 분량 확보 필수]
1. 🌐 국제정세: 최근 48시간 내의 주요 갈등, 외교 협상, 지정학적 변화를 기술하되, 단순 사실을 넘어 그 사건이 가진 함의까지 포함하여 5문장 이상 상세히 작성하세요.
2. 📈 미국 주식/경제: 오늘 시장의 핵심 지수(S&P 500, Nasdaq 등) 수치와 변동 원인, 주요 빅테크 기업의 실적 및 Fed의 정책 방향을 구체적인 데이터와 함께 서술하세요.
3. 💊 헬스/항암신약: 신장암(RCC) 분야의 최신 임상 3상 결과, FDA 승인 현황, 혹은 차세대 면역 항암제 소식을 전문적으로 깊이 있게 다루세요. (가장 최신 정보를 우선함)
4. 🤖 IT/AI/에이전트: 오픈소스 LLM의 최신 벤치마크, Agentic AI의 실제 산업 적용 사례, 그리고 포비님이 관심 있는 자율형 AI 시스템의 기술적 진보를 상세히 다루세요.
5. 🎬 화제의 영화/소설: 현재 글로벌 박스오피스 순위와 화제작의 흥행 수치, 문학계의 주요 수상 소식이나 베스트셀러 트렌드를 풍부하게 서술하세요.

[출력 형식 규칙]
- 첫 줄: "📰 최신 뉴스 섬머리 (${currentTime} 기준)"
- 각 항목은 제목 뒤에 이모지를 붙이고, 최소 5~8줄 이상의 풍부한 텍스트로 구성하세요.
- 전체 분량은 한국어 기준 1,200자~1,800자 사이의 '리포트 형태'로 작성하세요.
- 전문적이고 유려한 한국어 구어체를 사용하며, 본문 내 출처 URL은 생략하세요.
`;

  // ── 4. Gemini API 요청 (google_search 활성화) ───────────────────────────
  const GEMINI_MODEL = 'gemini-2.0-flash';
  const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.5, // 창의성과 정확성의 황금 밸런스
          topP: 0.95,
          maxOutputTokens: 4096, // 분량이 잘리지 않도록 넉넉하게 설정
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('응답 후보(candidate)를 찾을 수 없습니다.');

    // ── 5. 텍스트 추출 (안정적인 병합) ──────────────────────────────────────────
    const summary = (candidate.content?.parts ?? [])
      .filter((p) => typeof p.text === 'string')
      .map((p) => p.text)
      .join('')
      .trim();

    if (!summary) throw new Error('요약 결과가 비어 있습니다.');

    // ── 6. groundingMetadata 파싱 ─────────────────────────────────────────────
    const groundingMeta = candidate.groundingMetadata ?? {};
    const sources = (groundingMeta.groundingChunks ?? [])
      .map((chunk) => chunk.web)
      .filter(Boolean)
      .map(({ uri, title }) => ({ url: uri, title: title || '관련 기사 원문' }))
      .filter((src, idx, arr) => arr.findIndex((s) => s.url === src.url) === idx)
      .slice(0, 10);

    // ── 7. 최종 응답 반환 ──────────────────────────────────────────────────────
    return res.status(200).json({
      summary,
      sources,
      searchQueries: groundingMeta.webSearchQueries ?? [],
      searchEntryPointHtml: groundingMeta.searchEntryPoint?.renderedContent ?? null,
      generatedAt: currentTime,
      model: GEMINI_MODEL,
    });

  } catch (error) {
    console.error('[news.js Error]:', error.message);
    return res.status(502).json({
      error: '실시간 뉴스 엔진 가동 실패',
      detail: error.message
    });
  }
}
