// Puente de Super-Intelligence: Solo escucha en 127.0.0.1
import http from 'node:http';
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 8531;
const ORIGINS = [/^https:\/\/(www\.)?astale\.com$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const MODEL = process.env.ASTALE_MODEL || 'sonnet';

function findClaude() {
  const c = [
    path.join(os.homedir(), '.local', 'bin', 'claude.exe'),
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'),
    path.join(os.homedir(), '.local', 'bin', 'claude'),
    '/opt/homebrew/bin/claude', '/usr/local/bin/claude',
  ].find((p) => p && fs.existsSync(p));
  if (c) return c;
  try { return execSync(process.platform === 'win32' ? 'where claude.exe' : 'command -v claude', { encoding: 'utf8' }).split(/\r?\n/)[0].trim() || null; } catch { return null; }
}
const CLAUDE = findClaude();

// Sin variables que harían usar una API key de pago u otra cuenta: así va con la suscripción
function env() {
  const e = { ...process.env };
  for (const k of Object.keys(e)) if (/^(CLAUDE|ANTHROPIC)/i.test(k)) delete e[k];
  return { ...e, ENABLE_CLAUDEAI_MCP_SERVERS: 'false', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' };
}

const SYS = {
  es: 'Eres la Super-Intelligence del panel Astale (NASA Space Apps 2026, reto «Flame in Freefall»), sobre seguridad contra incendios en naves y hábitats. ' +
    'Responde en español claro, en 120–180 palabras, a alguien que no es experto. Usa SOLO la información del CONTEXTO: no inventes números ni fuentes. ' +
    'Cita la fuente de cada dato entre corchetes, con su nombre tal cual aparece (p. ej. [BASS-II], [Saffire VI (Urban 2024)]). ' +
    'Si algo es extrapolación o el contexto no lo cubre, dilo. Termina con una línea «Qué hacer:» con la recomendación práctica. Sin títulos ni tablas.',
  en: 'You are the Super-Intelligence of the Astale dashboard (NASA Space Apps 2026, "Flame in Freefall" challenge), about fire safety in spacecraft and habitats. ' +
    'Answer in plain English, 120–180 words, for a non-expert. Use ONLY the information in the CONTEXT: do not invent numbers or sources. ' +
    'Cite the source of each fact in square brackets, with its name as it appears (e.g. [BASS-II], [Saffire VI (Urban 2024)]). ' +
    'If something is extrapolation or the context does not cover it, say so. End with a line "What to do:" with the practical recommendation. No headings or tables.',
};

let busy = Promise.resolve();
function askClaude(q, lang, context) {
  return new Promise((resolve, reject) => {
    if (!CLAUDE) return reject(new Error('No encuentro Claude Code en este ordenador'));
    const cwd = path.join(os.tmpdir(), 'astale-si');
    fs.mkdirSync(cwd, { recursive: true });
    const args = ['-p', '--output-format', 'json', '--model', MODEL, '--tools', '', '--strict-mcp-config', '--setting-sources', 'user',
      '--no-session-persistence', '--system-prompt', SYS[lang] || SYS.es];
    const p = spawn(CLAUDE, args, { env: env(), cwd, windowsHide: true });
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill(); reject(new Error('Claude ha tardado demasiado')); }, 110000);
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', (e) => { clearTimeout(timer); reject(e); });
    p.on('close', () => {
      clearTimeout(timer);
      try {
        const j = JSON.parse(out.trim().split('\n').pop());
        if (j.is_error) return reject(new Error(String(j.result || 'error').slice(0, 300)));
        resolve(String(j.result || '').trim());
      } catch { reject(new Error((err || out || 'sin respuesta').slice(0, 300))); }
    });
    p.stdin.end(`CONTEXTO / CONTEXT:\n${context}\n\nPREGUNTA / QUESTION: ${q}`);
  });
}

http.createServer((req, res) => {
  const origin = req.headers.origin || '';
  const ok = !origin || ORIGINS.some((r) => r.test(origin));
  const h = { 'content-type': 'application/json; charset=utf-8' };
  if (ok && origin) Object.assign(h, { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-allow-private-network': 'true', vary: 'Origin' });
  const send = (code, obj) => { res.writeHead(code, h); res.end(JSON.stringify(obj)); };
  if (!ok) return send(403, { error: 'origen no permitido' });
  if (req.method === 'OPTIONS') { res.writeHead(204, h); return res.end(); }
  if (req.method === 'GET' && req.url === '/health') return send(200, { ok: !!CLAUDE, engine: 'claude', model: MODEL });
  if (req.method === 'POST' && req.url === '/ask') {
    let body = '';
    req.on('data', (d) => { body += d; if (body.length > 200000) req.destroy(); });
    req.on('end', () => {
      let j; try { j = JSON.parse(body); } catch { return send(400, { error: 'JSON no válido' }); }
      const q = String(j.q || '').slice(0, 600), lang = j.lang === 'en' ? 'en' : 'es', context = String(j.context || '').slice(0, 60000);
      if (!q) return send(400, { error: 'falta la pregunta' });
      const t0 = Date.now();
      console.log(`[${new Date().toLocaleTimeString()}] ${lang} · ${q}`);
      busy = busy.then(() => askClaude(q, lang, context)
        .then((answer) => { console.log(`   ✓ ${((Date.now() - t0) / 1000).toFixed(1)} s`); send(200, { answer }); })
        .catch((e) => { console.log('   ✗ ' + e.message); send(502, { error: e.message }); }));
    });
    return;
  }
  send(404, { error: 'no existe' });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Super-Intelligence de Astale lista en http://127.0.0.1:${PORT}`);
  console.log(CLAUDE ? `Claude Code: ${CLAUDE} (modelo ${MODEL}, con tu suscripción)` : '  No encuentro Claude Code: instálalo e inicia sesión con tu cuenta.');
  console.log('Deja esta ventana abierta. En astale.com/team → El producto → Panel, marca «Usar Claude con mi suscripción».');
});
