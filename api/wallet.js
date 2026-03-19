// Наша мини-база данных с уникальными ID
let db = {
  deposit: { id: "init", status: "completed", amount: 0, currency: "USDT", timestamp: 0 },
  withdraw: { id: "init", status: "completed", amount: 0, currency: "USDT", timestamp: 0 }
};

export default function handler(req, res) {
  // ЖЕСТКИЙ ЗАПРЕТ КЭШИРОВАНИЯ (ЧТОБЫ НЕ БЫЛО ДУБЛЕЙ)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { type } = req.query;
  if (!type || (type !== 'deposit' && type !== 'withdraw')) {
    return res.status(400).json({ error: "Нужно указать ?type=deposit или withdraw" });
  }

  if (req.method === 'GET') {
    return res.status(200).json({ record: db[type] });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    let newData = req.body;
    // Если с телефона не пришел ID, генерируем свой
    if (!newData.id) newData.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    db[type] = newData;
    return res.status(200).json({ success: true, record: db[type] });
  }

  return res.status(405).end();
}
