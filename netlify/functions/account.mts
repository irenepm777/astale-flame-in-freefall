// Cuentas de usuario de astale.com: entrar, guardar escenarios y la actividad, y recuperarlo todo al volver.
// Datos en Netlify Blobs (almacén «astale-users»), sin base de datos externa. Contraseña con PBKDF2 (210.000 vueltas, sal propia).
//   POST /api/account/register {email, password, name}   POST /api/account/login {email, password}   POST /api/account/logout
//   GET  /api/account/me     GET /api/account/data
//   DELETE /api/account/me (borra la cuenta)
//   POST /api/account/event {events:[{type, detail, at}]}   POST /api/account/scenario {name, state}   DELETE /api/account/scenario?id=
import { getStore } from '@netlify/blobs';

const COOKIE = 'as_user', DAYS = 180;
const env = (k: string) => (globalThis as any).Netlify?.env?.get(k) ?? process.env[k] ?? '';
const enc = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const json = (b: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });

async function hmac(text: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode('user|' + env('SESSION_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}
async function pbkdf2(password: string, salt: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 210_000 }, k, 256));
}
function same(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
const emailKey = async (e: string) => 'user/' + hex(await crypto.subtle.digest('SHA-256', enc.encode(e.trim().toLowerCase())));
async function token(uid: string) { const exp = Date.now() + DAYS * 86_400_000; return `${uid}.${exp}.${await hmac(`${uid}.${exp}`)}`; }
async function readUser(req: Request) {
  const m = (req.headers.get('cookie') || '').match(new RegExp(`${COOKIE}=([^;]+)`));
  if (!m) return null;
  const [uid, exp, sig] = m[1].split('.');
  if (!uid || !exp || !sig || Number(exp) < Date.now()) return null;
  return same(sig, await hmac(`${uid}.${exp}`)) ? uid : null;
}
const cookie = (v: string, age: number) => `${COOKIE}=${v}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;
const fails = new Map<string, number[]>();

type Data = { profile: { uid: string; email: string; name: string; created: number }; scenarios: any[]; events: any[]; counters: Record<string, number>; last?: any; visits: number; lastSeen?: number };

export default async (req: Request, ctx: { ip?: string }) => {
  if (!env('SESSION_SECRET')) return json({ error: 'not configured' }, 500);
  const store = getStore({ name: 'astale-users', consistency: 'strong' }) // fuerte: lo que se acaba de guardar se lee al momento;
  const url = new URL(req.url), action = url.pathname.split('/').pop();
  const body: any = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const loadData = async (uid: string) => ((await store.get('data/' + uid, { type: 'json' })) as Data | null);
  const saveData = (uid: string, d: Data) => store.setJSON('data/' + uid, d);

  if (action === 'register' || action === 'login') {
    const ip = ctx.ip || req.headers.get('x-nf-client-connection-ip') || '?', now = Date.now();
    const recent = (fails.get(ip) || []).filter((t) => now - t < 15 * 60_000);
    if (recent.length >= 10) return json({ error: 'too_many' }, 429);
    const email = String(body.email || '').trim().toLowerCase(), password = String(body.password || '');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return json({ error: 'bad_email' }, 400);
    if (password.length < 8 || password.length > 200) return json({ error: 'short_password' }, 400);
    const key = await emailKey(email), existing: any = await store.get(key, { type: 'json' });
    let uid: string;
    if (action === 'register') {
      if (existing) return json({ error: 'exists' }, 409);
      uid = hex(crypto.getRandomValues(new Uint8Array(12)));
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const name = String(body.name || '').trim().slice(0, 60) || email.split('@')[0];
      await store.setJSON(key, { uid, email, salt, hash: await pbkdf2(password, salt), created: now });
      await saveData(uid, { profile: { uid, email, name, created: now }, scenarios: [], events: [{ type: 'register', at: now }], counters: {}, visits: 1, lastSeen: now });
    } else {
      if (!existing || !same(existing.hash, await pbkdf2(password, existing.salt))) {
        recent.push(now); fails.set(ip, recent); await new Promise((r) => setTimeout(r, 500));
        return json({ error: 'wrong' }, 401);
      }
      uid = existing.uid;
      const d = await loadData(uid);
      if (d) { d.visits = (d.visits || 0) + 1; d.events.push({ type: 'login', at: now }); d.events = d.events.slice(-500); d.lastSeen = now; await saveData(uid, d); }
    }
    const d = await loadData(uid);
    return json({ ok: true, profile: d?.profile }, 200, { 'set-cookie': cookie(await token(uid), DAYS * 86400) });
  }
  if (action === 'logout') return json({ ok: true }, 200, { 'set-cookie': cookie('', 0) });

  const uid = await readUser(req);
  if (!uid) return json({ error: 'login' }, 401);
  const d = await loadData(uid);
  if (!d) return json({ error: 'login' }, 401);

  if (action === 'me' && req.method === 'DELETE') { // borrar la cuenta y todos sus datos
    await store.delete(await emailKey(d.profile.email)); await store.delete('data/' + uid);
    return json({ ok: true }, 200, { 'set-cookie': cookie('', 0) });
  }
  if (action === 'me' || (action === 'data' && req.method === 'GET')) {
    if (action === 'data') { const prev = d.lastSeen; d.lastSeen = Date.now(); await saveData(uid, d); return json({ ...d, prevSeen: prev }); }
    return json({ profile: d.profile, counters: d.counters, scenarios: d.scenarios.length });
  }
  if (action === 'event' && req.method === 'POST') {
    const evs = (Array.isArray(body.events) ? body.events : []).slice(0, 50);
    for (const e of evs) {
      const type = String(e.type || '').slice(0, 30); if (!type) continue;
      const detail = e.detail && typeof e.detail === 'object' ? JSON.parse(JSON.stringify(e.detail).slice(0, 1500) || '{}') : undefined;
      d.events.push({ type, detail, at: Number(e.at) || Date.now() });
      d.counters[type] = (d.counters[type] || 0) + 1;
      if (type === 'scenario' && detail) d.last = detail;
    }
    d.events = d.events.slice(-500);
    await saveData(uid, d);
    return json({ ok: true, counters: d.counters });
  }
  if (action === 'scenario') {
    if (req.method === 'POST') {
      const name = String(body.name || '').trim().slice(0, 80) || 'Scenario';
      const state = body.state && typeof body.state === 'object' ? body.state : null;
      if (!state) return json({ error: 'state' }, 400);
      d.scenarios.unshift({ id: hex(crypto.getRandomValues(new Uint8Array(6))), name, state, at: Date.now() });
      d.scenarios = d.scenarios.slice(0, 50);
      d.events.push({ type: 'save', detail: { name }, at: Date.now() }); d.counters.save = (d.counters.save || 0) + 1;
      await saveData(uid, d);
      return json({ ok: true, scenarios: d.scenarios });
    }
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      d.scenarios = d.scenarios.filter((s) => s.id !== id);
      await saveData(uid, d);
      return json({ ok: true, scenarios: d.scenarios });
    }
  }
  return json({ error: 'not found' }, 404);
};

export const config = { path: ['/api/account/*'] };
