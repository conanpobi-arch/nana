import { Agent } from 'https';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL 없음' });
  }

  // 인스턴스 (현재 당신의 Railway만 사용 – 성공 확인됨)
  const COBALT_INSTANCES = ['https://cobalt-production-aa95.up.railway.app'];

  // 인증 필요 시 Vercel 환경 변수에 COBALT_API_KEY 추가
  const API_KEY = process.env.COBALT_API_KEY || '';

  const agent = new Agent({ keepAlive: true, timeout: 30000 });

  for (const instance of COBALT_INSTANCES) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[${instance}] Attempt ${attempt}: POST 시작 - url=${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 50000);

        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Referer': 'https://cobalt.tools/',
          'Origin': 'https://cobalt.tools'
        };

        if (API_KEY) {
          headers['Authorization'] = `Api-Key ${API_KEY}`;
          console.log(`[${instance}] Authorization 추가됨`);
        }

        const response = await fetch(instance, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: url  // 최소 body만 → 기본 최고 화질 / 기본 파일명으로 성공 확인됨
            // 필요 시 추가: videoQuality: 'max', filenameStyle: 'classic', isAudioOnly: false
          }),
          signal: controller.signal,
          agent
        });

        clearTimeout(timeoutId);

        console.log(`[${instance}] 상태: ${response.status}`);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'No body');
          console.error(`[${instance}] 실패 - Status: ${response.status}, Full Body: ${errorBody}`);
          continue;
        }

        const data = await response.json();

        console.log(`[${instance}] 성공 응답 데이터: ${JSON.stringify(data)}`);

        // tunnel / stream / redirect 모두 단일 다운로드 링크로 처리
        if (data.status === 'tunnel' || data.status === 'stream' || data.status === 'redirect') {
          return res.status(200).json({
            success: true,
            type: data.status,
            url: data.url,
            filename: data.filename || 'video.mp4'
          });
        }

        // 여러 화질 선택 (picker)
        if (data.status === 'picker') {
          return res.status(200).json({
            success: true,
            type: 'picker',
            picks: data.picks || data.picker || [],
            filename: data.filename || 'video.mp4'
          });
        }

        // 에러 응답
        if (data.status === 'error' || data.error) {
          return res.status(200).json({
            success: false,
            error: data.error?.message || data.error?.code || data.text || JSON.stringify(data.error) || '다운로드 실패'
          });
        }

        // 예상치 못한 응답
        return res.status(200).json({
          success: false,
          error: '알 수 없는 응답 형식: ' + (data.status || 'no status')
        });

      } catch (e) {
        console.error(`[${instance}] Attempt ${attempt} 예외: ${e.message} (code: ${e.code || 'unknown'})`);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 4000));
        }
      }
    }
  }

  return res.status(502).json({ error: '모든 서버 연결 실패. 잠시 후 다시 시도해주세요.' });
}
