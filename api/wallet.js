import { getRecord, setRecord } from '../lib/records.js';
import { redisConfigured } from '../lib/redis.js';
import { normalizeChannel } from '../lib/channels.js';

function applyCors(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
}

export default async function handler(req, res) {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { type, channel: channelQuery } = req.query;
  if (!type || (type !== 'deposit' && type !== 'withdraw')) {
    return res.status(400).json({ error: 'Нужно указать ?type=deposit или withdraw' });
  }
  const channel = normalizeChannel(channelQuery);

  if (req.method === 'GET') {
    const record = await getRecord(type, channel);
    return res.status(200).json({
      record,
      channel,
      storage: redisConfigured() ? 'redis' : 'memory',
    });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const body = parseBody(req);
    if (!body) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const result = await setRecord(type, body, channel);
    if (result.conflict) {
      return res.status(409).json({
        success: false,
        conflict: true,
        record: result.record,
        channel,
        storage: result.storage,
      });
    }

    return res.status(200).json({
      success: true,
      record: result.record,
      channel,
      storage: result.storage,
    });
  }

  return res.status(405).end();
}
