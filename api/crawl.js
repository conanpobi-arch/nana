// api/crawl.js
// Vercel 서버사이드에서 직접 URL을 fetch → CORS 완전 우회
// 프론트에서 { url } 을 POST하면 { text } 로 추출된 본문 텍스트 반환

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL 누락' });

  // 여러 User-Agent 로테이션 (차단 우회)
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0',
  ];
  const agent = agents[Math.floor(Math.random() * agents.length)];

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': agent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Referer': new URL(url).origin + '/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000), // 15초 타임아웃
    });

    if (!response.ok) {
      return res.status(502).json({ error: `사이트 응답 오류: HTTP ${response.status}` });
    }

    const html = await response.text();
    if (!html || html.length < 100) {
      return res.status(502).json({ error: '빈 응답' });
    }

    // 서버사이드 텍스트 추출 (정규식 기반 — DOMParser 없음)
    const text = extractText(html);
    if (!text || text.length < 50) {
      return res.status(502).json({ error: '본문 추출 실패 (내용이 너무 짧음)' });
    }

    return res.status(200).json({ text, length: text.length });

  } catch(e) {
    const msg = e.name === 'TimeoutError' ? '타임아웃 (15초 초과)' : e.message;
    return res.status(502).json({ error: msg });
  }
}

function extractText(html) {
  // 1단계: 불필요한 태그 블록 제거 (script, style, nav, header, footer 등)
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // 2단계: 소설 본문 컨테이너 우선 추출 시도
  // ixdzs.tw 사이트: <div class="content"> 또는 <div id="content"> 에 본문 있음
  const contentPatterns = [
    // ixdzs 계열 사이트
    /<div[^>]+class=["'][^"']*(?:readcontent|read-content|chapter-content|article-content|bookcontent|novel-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
    /<div[^>]+id=["']?(?:chaptercontent|readcontent|chapter-content|bookcontent|novel-content|article-content|read-content|content)[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    // 범용
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    // p 태그 집합 (소설 사이트는 대부분 <p> 단락으로 구성)
  ];

  let body = '';
  for (const pattern of contentPatterns) {
    const match = clean.match(pattern);
    if (match && match[1] && match[1].length > 200) {
      body = match[1];
      break;
    }
  }
  if (!body) body = clean; // 못 찾으면 전체 사용

  // 3단계: 태그 → 줄바꿈 변환 후 태그 제거
  body = body
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  // 4단계: HTML 엔티티 디코딩
  body = body
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '\u201c')
    .replace(/&rdquo;/g, '\u201d')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));

  // 5단계: 공백 정리
  return body
    .replace(/\t/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}
