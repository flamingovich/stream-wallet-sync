export function normalizeChannel(channel) {
  const raw = String(channel || 'default').trim().toLowerCase();
  const safe = raw.replace(/[^a-z0-9_-]/g, '');
  return safe || 'default';
}

export function keyForRecord(type, channel) {
  return `sync:${normalizeChannel(channel)}:${type}`;
}
