import { Agent } from 'https';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL 없음' });

  const COBALT_INSTANCES = [
    'https://cobalt-production-aa95.up.railway.app',
    'https://co.wuk.sh',
    'https://kityune.imput.net'
  ];

  const agent = new Agent({ keepAlive: true, timeout: 30000 });

  for (const instance of COBALT_INSTANCES) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[${instance}] Attempt ${attempt}: POST 시작 - URL: ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 40000);

        const response = await fetch(instance, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            url: url,  // 필수
            vQuality: 'max',  // 옵션
            isAudioOnly: false,
            filenamePattern: 'classic'  // 옵션, classic 추천
          }),
          signal: controller.signal,
          agent
        });

        clearTimeout(timeoutId);

        console.log(`[${instance}] Attempt ${attempt}: 상태 ${response.status}`);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'No body');
          console.error(`[${instance}] Attempt ${attempt} 실패 - Status: ${response.status}, Body: ${errorBody}`);
          continue;
        }

        const data = await response.json();

        if (data.status === 'stream' || data.status === 'redirect') {
          return res.status(200).json({
            success: true,
            type: data.status,
            url: data.url,
            filename: data.filename || 'video.mp4'
          });
        }

        if (data.status === 'picker') {
          return res.status(200).json({
            success: true,
            type: 'picker',
            picks: data.picks || data.picker || [],
            filename: data.filename || 'video.mp4'
          });
        }

        if (data.status === 'error' || data.error) {
          return res.status(200).json({
            success: false,
            error: data.error || data.text || '다운로드 실패'
          });
        }

        return res.status(200).json({ success: false, error: '알 수 없는 응답' });

      } catch (e) {
        console.error(`[${instance}] Attempt ${attempt} 예외: ${e.message} (code: ${e.code || 'unknown'})`);
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  return res.status(502).json({ error: '모든 서버 연결 실패. 잠시 후 다시 시도해주세요.' });
}
