type Env = { HEALTH_DB: D1Database };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' } });
const types: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const chunkSize = 500_000;

async function ready(db: D1Database) {
  await db.prepare('CREATE TABLE IF NOT EXISTS health_images (profile TEXT NOT NULL, id TEXT NOT NULL, part INTEGER NOT NULL, media_type TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (profile, id, part))').run();
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.HEALTH_DB) return json({ error: '私有数据库尚未绑定' }, 503);
  try {
    await ready(env.HEALTH_DB);
    if (request.method === 'GET') {
      const url = new URL(request.url), profile = url.searchParams.get('profile'), id = url.searchParams.get('id');
      if (!['self', 'girlfriend'].includes(profile || '') || !id || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: '图片标识无效' }, 400);
      const rows = await env.HEALTH_DB.prepare('SELECT media_type, data FROM health_images WHERE profile = ? AND id = ? ORDER BY part').bind(profile, id).all<{ media_type: string; data: string }>();
      if (!rows.results.length) return json({ error: '图片未找到' }, 404);
      const base64 = rows.results.map(r => r.data).join('');
      const binary = atob(base64), bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Response(bytes, { headers: { 'content-type': rows.results[0].media_type, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } });
    }
    if (request.method !== 'PUT') return json({ error: '不支持的操作' }, 405);
    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return json({ error: '请提交 JSON' }, 415);
    if (Number(request.headers.get('content-length') || 0) > 21_000_000) return json({ error: '图片过大' }, 413);
    const input: any = await request.json();
    if (!['self', 'girlfriend'].includes(input.profile) || typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.id) || typeof input.data !== 'string') return json({ error: '图片标识无效' }, 400);
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(input.data);
    if (!match || match[2].length > 20_000_000 || match[2].length % 4 !== 0) return json({ error: '图片格式或大小不支持' }, 400);
    const existing = await env.HEALTH_DB.prepare('SELECT 1 FROM health_images WHERE profile = ? AND id = ? LIMIT 1').bind(input.profile, input.id).first();
    if (existing) return json({ ok: true });
    const statements = [];
    for (let i = 0; i < match[2].length; i += chunkSize) {
      statements.push(env.HEALTH_DB.prepare('INSERT INTO health_images (profile, id, part, media_type, data) VALUES (?, ?, ?, ?, ?)')
        .bind(input.profile, input.id, i / chunkSize, types[match[1]], match[2].slice(i, i + chunkSize)));
    }
    await env.HEALTH_DB.batch(statements);
    return json({ ok: true });
  } catch (error) {
    console.error('health_image request failed', error);
    return json({ error: '图片暂时无法保存或读取' }, 500);
  }
};
