// Наша мини-база данных (не уснет, так как расширение пингует её каждые 3 сек)
let db = {
  deposit: { status: "completed", amount: 0, currency: "USDT", timestamp: 0 },
  withdraw: { status: "completed", amount: 0, currency: "USDT", timestamp: 0 }
};

export default function handler(req, res) {
  // Разрешаем запросы с любых сайтов (чтобы Chrome не блокировал)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Ответ на предварительный запрос браузера
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Получаем тип (deposit или withdraw) из URL: /api/wallet?type=deposit
  const { type } = req.query;

  if (!type || (type !== 'deposit' && type !== 'withdraw')) {
    return res.status(400).json({ error: "Нужно указать ?type=deposit или withdraw" });
  }

  // Если это расширение проверяет статус
  if (req.method === 'GET') {
    return res.status(200).json({ record: db[type] });
  }

  // Если это телефон отправляет перевод
  if (req.method === 'POST' || req.method === 'PUT') {
    db[type] = req.body;
    return res.status(200).json({ success: true, record: db[type] });
  }

  return res.status(405).end();
}
