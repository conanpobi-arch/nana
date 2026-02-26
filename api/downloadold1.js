export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL 없음' });

  // cobalt.tools API - 무료 오픈소스 영상 다운로더
  const COBALT_INSTANCES = [
    'https://api.cobalt.tools',
    'https://cobalt.api.timelessnesses.me',
    'https://cobalt.synzr.space'
  ];

  for (const instance of COBALT_INSTANCES) {
    try {
      const response = await fetch(instance + '/api/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          vQuality: 'max',
          filenamePattern: 'basic',
          isAudioOnly: false
        })
      });

      if (!response.ok) continue;
      const data = await response.json();

      // cobalt 응답 타입별 처리
      if (data.status === 'stream' || data.status === 'redirect') {
        return res.status(200).json({
          success: true,
          type: data.status,
          url: data.url,
          filename: data.filename || 'video.mp4'
        });
      }

      if (data.status === 'picker') {
        // 여러 품질 선택지 있을 때
        return res.status(200).json({
          success: true,
          type: 'picker',
          picks: data.picker,
          filename: data.filename || 'video.mp4'
        });
      }

      if (data.status === 'error') {
        return res.status(200).json({ success: false, error: data.text || '다운로드 실패' });
      }

    } catch (e) {
      continue; // 다음 인스턴스 시도
    }
  }

  return res.status(502).json({ error: '모든 서버 연결 실패. 잠시 후 다시 시도해주세요.' });
}
