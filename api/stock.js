// api/stock.js — Vercel Serverless Function
// تجلب بيانات Yahoo Finance من السيرفر لتجنب مشكلة CORS

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { symbol, range = '3mo', interval = '1d' } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'symbol is required' });
  }

  // Add .SR suffix for Saudi stocks if not present
  const ySym = symbol.endsWith('.SR') ? symbol : symbol + '.SR';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ySym}?range=${range}&interval=${interval}&includePrePost=false`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      // Try backup Yahoo endpoint
      const url2 = `https://query2.finance.yahoo.com/v8/finance/chart/${ySym}?range=${range}&interval=${interval}`;
      const r2 = await fetch(url2, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });
      if (!r2.ok) {
        return res.status(r2.status).json({ error: `Yahoo Finance error: ${r2.status}` });
      }
      const data2 = await r2.json();
      return res.status(200).json(data2);
    }

    const data = await response.json();
    
    // Cache for 15 minutes
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
