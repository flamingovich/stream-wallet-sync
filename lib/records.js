import { getRedis } from './redis.js';
import { keyForRecord, normalizeChannel } from './channels.js';

export const EMPTY_RECORD = {
  id: 'init',
  status: 'completed',
  amount: 0,
  currency: 'USDT',
  timestamp: 0,
};

function generateId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeCurrency(currency) {
  const c = String(currency || 'USDT').toUpperCase();
  if (c === 'RUB' || c === '₽') return 'RUB';
  return 'USDT';
}

function normalizeRecord(raw, type) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_RECORD };
  const record = {
    id: raw.id || 'init',
    status: raw.status || 'completed',
    amount: Number(raw.amount) || 0,
    currency: normalizeCurrency(raw.currency),
    timestamp: Number(raw.timestamp) || 0,
  };
  if (type === 'withdraw' && record.status === 'withdraw') {
    record.status = 'pending';
  }
  return record;
}

const memoryFallback = {};

function memoryStore(channel) {
  const ch = normalizeChannel(channel);
  if (!memoryFallback[ch]) {
    memoryFallback[ch] = {
      deposit: { ...EMPTY_RECORD },
      withdraw: { ...EMPTY_RECORD },
    };
  }
  return memoryFallback[ch];
}

export async function getRecord(type, channel = 'default') {
  const ch = normalizeChannel(channel);
  const redis = getRedis();
  if (!redis) return normalizeRecord(memoryStore(ch)[type], type);
  const raw = await redis.get(keyForRecord(type, ch));
  return normalizeRecord(raw, type);
}

function canApplyUpdate(current, incoming, type) {
  const cur = normalizeRecord(current, type);
  const next = normalizeRecord(incoming, type);

  if (!next.id || next.id === 'init') next.id = generateId();

  if (type === 'deposit') {
    if (next.status === 'pending') {
      if (cur.status === 'pending' && cur.amount > 0 && cur.id !== next.id) {
        return { ok: false, conflict: true, record: cur };
      }
      return { ok: true, record: next };
    }
    if (next.status === 'processing') {
      if (cur.status !== 'pending' || cur.id !== next.id || cur.amount <= 0) {
        return { ok: false, conflict: true, record: cur };
      }
      return { ok: true, record: { ...cur, ...next, status: 'processing' } };
    }
    if (next.status === 'completed') {
      if (cur.id !== next.id) return { ok: false, conflict: true, record: cur };
      if (cur.status !== 'pending' && cur.status !== 'processing') {
        return { ok: false, conflict: true, record: cur };
      }
      return {
        ok: true,
        record: {
          id: next.id,
          status: 'completed',
          amount: 0,
          currency: next.currency || cur.currency,
          timestamp: Date.now(),
        },
      };
    }
  }

  if (type === 'withdraw') {
    const status = next.status === 'completed' ? 'completed' : 'pending';
    if (status === 'pending' && next.amount > 0) {
      if (cur.status === 'pending' && cur.amount > 0 && cur.id !== next.id) {
        return { ok: false, conflict: true, record: cur };
      }
      return {
        ok: true,
        record: {
          id: next.id,
          status: 'pending',
          amount: next.amount,
          currency: next.currency,
          timestamp: next.timestamp || Date.now(),
        },
      };
    }
    if (status === 'completed') {
      if (cur.status === 'completed' && cur.amount === 0) {
        return { ok: true, record: cur };
      }
      return {
        ok: true,
        record: {
          id: next.id || cur.id || generateId(),
          status: 'completed',
          amount: 0,
          currency: next.currency || cur.currency || 'USDT',
          timestamp: Date.now(),
        },
      };
    }
  }

  return { ok: true, record: next };
}

function normalizeIncomingStatus(status, type) {
  const s = String(status || '').toLowerCase();
  if (type === 'withdraw') {
    if (s === 'withdraw' || s === 'pending') return 'pending';
    if (s === 'completed') return 'completed';
  }
  return s || 'completed';
}

export async function setRecord(type, incoming, channel = 'default') {
  const ch = normalizeChannel(channel);
  const current = await getRecord(type, ch);
  const body = { ...incoming };
  if (!body.id) body.id = generateId();
  body.currency = normalizeCurrency(body.currency);
  body.amount = Number(body.amount) || 0;
  body.timestamp = Number(body.timestamp) || Date.now();
  body.status = normalizeIncomingStatus(body.status, type);

  const verdict = canApplyUpdate(current, body, type);
  if (!verdict.ok) {
    return { success: false, conflict: true, record: verdict.record };
  }

  const redis = getRedis();
  if (!redis) {
    memoryStore(ch)[type] = verdict.record;
    return { success: true, record: verdict.record, storage: 'memory', channel: ch };
  }

  await redis.set(keyForRecord(type, ch), verdict.record);
  return { success: true, record: verdict.record, storage: 'redis', channel: ch };
}
