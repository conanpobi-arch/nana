export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300'); // 5분 캐시

  const sources = [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World', cat: 'world' },
    { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', name: 'BBC Tech', cat: 'tech' },
    { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', name: 'BBC Science', cat: 'science' },
    { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', name: 'BBC Business', cat: 'business' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NYT World', cat: 'world' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', name: 'NYT Tech', cat: 'tech' },
  ];

  async function fetchRss(source) {
    try {
      const r = await fetch(source.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const xml = await r.text();
      const items = [];
      const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
      for (const match of itemMatches) {
        const block = match[1];
        const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/) || [])[1] || '';
        const link = (block.match(/<link>(.*?)<\/link>/) || block.match(/<guid>(.*?)<\/guid>/) || [])[1] || '';
        const desc = (block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || block.match(/<description>(.*?)<\/description>/) || [])[1] || '';
        const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
        if (title) items.push({
          title: title.trim(),
          link: link.trim(),
          desc: desc.replace(/<[^>]+>/g, '').slice(0, 150).trim(),
          date: pubDate.trim(),
          source: source.name,
          cat: source.cat
        });
        if (items.length >= 5) break;
      }
      return items;
    } catch(e) { return []; }
  }

  try {
    const results = await Promise.allSettled(sources.map(fetchRss));
    let items = [];
    results.forEach(r => { if (r.status === 'fulfilled') items = items.concat(r.value); });
    return res.status(200).json({ items });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
