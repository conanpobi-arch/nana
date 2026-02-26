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

  // 당신의 Railway Cobalt 인스턴스 (메인으로 사용)
  const COBALT_INSTANCES = [
    'https://cobalt-production-aa95.up.railway.app',
    // 필요시 fallback 추가 (현재는 이 하나만으로 충분할 가능성 높음)
    // 'https://co.wuk.sh',
    // 'https://kityune.imput.net'
  ];

  for (const instance of COBALT_INSTANCES) {
    try {
      // 타임아웃 설정 (20초)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(instance, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          vQuality: 'max',
          filenamePattern: 'classic', // classic 추천 (더 읽기 쉬운 파일명)
          isAudioOnly: false,
          // isNoTTWatermark: true, // TikTok 등에서 필요하면 주석 해제
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`[${instance}] HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();

      // 성공 케이스 처리
      if (data.status === 'stream' || data.status === 'redirect') {
        return res.status(200).json({
          success: true,
          type: data.status,
          url: data.url,
          filename: data.filename || 'video.mp4',
        });
      }

      if (data.status === 'picker') {
        return res.status(200).json({
          success: true,
          type: 'picker',
          picks: data.picks || data.picker || [],
          filename: data.filename || 'video.mp4',
        });
      }

      if (data.status === 'error' || data.error) {
        return res.status(200).json({
          success: false,
          error: data.error || data.text || '다운로드 실패',
        });
      }

      // 예상치 못한 응답
      return res.status(200).json({
        success: false,
        error: '알 수 없는 응답 형식',
      });

    } catch (e) {
      console.error(`[${instance}] 오류:`, e.message);
      continue;
    }
  }

  return res.status(502).json({
    error: '모든 서버 연결 실패. 잠시 후 다시 시도해주세요.',
  });
}
