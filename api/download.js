import { Agent } from 'https';  // Node.js https Agent import (Vercel/Node 런타임에서 동작)

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

  // 인스턴스 목록: 당신의 Railway 메인 + 안정 공용 fallback
 const COBALT_INSTANCES = ['https://co.wuk.sh'];
  ];


  
  const agent = new Agent({ keepAlive: true, timeout: 30000 });  // 연결 재사용 + 30초 연결 타임아웃

  for (const instance of COBALT_INSTANCES) {
    for (let attempt = 1; attempt <= 3; attempt++) {  // 각 인스턴스당 3회 재시도
      try {
        console.log(`[${instance}] Attempt ${attempt}: 시작 - URL: ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 40000);  // 40초 전체 타임아웃

        const response = await fetch(instance, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            url: url,
            vQuality: 'max',
            filenamePattern: 'classic',
            isAudioOnly: false,
          }),
          signal: controller.signal,
          agent: agent,  // 연결 풀링
        });

        clearTimeout(timeoutId);

        console.log(`[${instance}] Attempt ${attempt}: 응답 상태 ${response.status}, OK: ${response.ok}`);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'no body');
          console.error(`[${instance}] Attempt ${attempt}: 에러 body: ${errorText}`);
          continue;
        }

        const data = await response.json();

        // 성공 응답 처리
        if (data.status === 'stream' || data.status === 'redirect') {
          console.log(`[${instance}] 성공: stream/redirect`);
          return res.status(200).json({
            success: true,
            type: data.status,
            url: data.url,
            filename: data.filename || 'video.mp4',
          });
        }

        if (data.status === 'picker') {
          console.log(`[${instance}] 성공: picker`);
          return res.status(200).json({
            success: true,
            type: 'picker',
            picks: data.picks || data.picker || [],
            filename: data.filename || 'video.mp4',
          });
        }

        if (data.status === 'error' || data.error) {
          console.log(`[${instance}] 에러 응답: ${data.error || data.text}`);
          return res.status(200).json({
            success: false,
            error: data.error || data.text || '다운로드 실패',
          });
        }

        // 예상치 못한 응답
        console.log(`[${instance}] 예상치 못한 응답`);
        return res.status(200).json({ success: false, error: '알 수 없는 응답 형식' });

      } catch (e) {
        console.error(`[${instance}] Attempt ${attempt} 실패: ${e.message} (code: ${e.code || 'unknown'})`);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 2000));  // 2초 대기 후 재시도
        }
      }
    }
  }

  console.error('모든 인스턴스/시도 실패');
  return res.status(502).json({ error: '모든 서버 연결 실패. 잠시 후 다시 시도해주세요.' });
}
