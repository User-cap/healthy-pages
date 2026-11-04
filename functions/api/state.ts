type Env = { HEALTH_DB: D1Database };

const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' };
const initial = () => ({
  format: 'health-static-v1', exportedAt: null,
  profiles: {
    self: { label: '我', records: [], reports: [], audit: [], images: {}, completedDays: {}, preferences: { intakeReference: 1600, netReference: 1200 } },
    girlfriend: { label: '女友', records: [], reports: [], audit: [], images: {}, completedDays: {}, preferences: { intakeReference: null, netReference: null } }
  }
});
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });

async function ready(db: D1Database) {
  await db.prepare('CREATE TABLE IF NOT EXISTS health_state (id INTEGER PRIMARY KEY CHECK (id = 1), revision INTEGER NOT NULL, body TEXT NOT NULL, updated_at TEXT NOT NULL)').run();
  await db.prepare('INSERT OR IGNORE INTO health_state (id, revision, body, updated_at) VALUES (1, 0, ?, ?)').bind(JSON.stringify(initial()), new Date().toISOString()).run();
}

function valid(value: any) {
  if (!value || value.format !== 'health-static-v1' || !value.profiles || typeof value.profiles !== 'object') return false;
  for (const name of ['self', 'girlfriend']) {
    const p = value.profiles[name];
    if (!p || !Array.isArray(p.records) || p.records.length > 100000 || !Array.isArray(p.reports) || !Array.isArray(p.audit) || !p.completedDays || typeof p.completedDays !== 'object' || !p.preferences || typeof p.preferences !== 'object') return false;
    for (const r of p.records) if (!r || typeof r.id !== 'string' || typeof r.date !== 'string' || !['meal', 'activity', 'weight'].includes(r.kind) || r.kind !== r.payload?.kind || !['confirmed', 'pending'].includes(r.status)) return false;
  }
  return true;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.HEALTH_DB) return reply({ error: '私有数据库尚未绑定' }, 503);
  try {
    await ready(env.HEALTH_DB);
    if (request.method === 'GET') {
      const row = await env.HEALTH_DB.prepare('SELECT revision, body FROM health_state WHERE id = 1').first<{ revision: number; body: string }>();
      return reply({ revision: row!.revision, data: JSON.parse(row!.body) });
    }
    if (request.method !== 'PUT') return reply({ error: '不支持的操作' }, 405);
    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return reply({ error: '请提交 JSON' }, 415);
    if (Number(request.headers.get('content-length') || 0) > 2_000_000) return reply({ error: '记录文件过大' }, 413);
    const input: any = await request.json();
    if (!Number.isSafeInteger(input.revision) || input.revision < 0 || !valid(input.data)) return reply({ error: '记录格式不正确' }, 400);
    const value = structuredClone(input.data);
    delete value._revision;
    for (const name of ['self', 'girlfriend']) value.profiles[name].images = {};
    value.exportedAt = new Date().toISOString();
    const body = JSON.stringify(value);
    if (body.length > 2_000_000) return reply({ error: '记录文件过大' }, 413);
    const result = await env.HEALTH_DB.prepare('UPDATE health_state SET body = ?, revision = revision + 1, updated_at = ? WHERE id = 1 AND revision = ?')
      .bind(body, value.exportedAt, input.revision).run();
    if (!result.meta.changes) return reply({ error: '记录已在其他设备更新。请刷新后重试，避免覆盖新记录。', code: 'CONFLICT' }, 409);
    return reply({ revision: input.revision + 1, data: value });
  } catch (error) {
    console.error('health_state request failed', error);
    return reply({ error: '云端记录暂时不可用，请稍后重试' }, 500);
  }
};
