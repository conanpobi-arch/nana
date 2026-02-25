// api/config.js
// Vercel 환경변수에서 Supabase 키를 안전하게 프론트엔드에 전달합니다.
// Vercel 대시보드 → Settings → Environment Variables 에서 아래 두 값을 설정하세요:
//   SUPABASE_URL        예) https://xxxxxxxx.supabase.co
//   SUPABASE_ANON_KEY   예) eyJhbGci...

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase 환경변수가 설정되지 않았습니다.' });
  }

  return res.status(200).json({
    supabaseUrl,
    supabaseKey
  });
}
