// Publishes the site to Netlify (site "astale"). Needs NETLIFY_AUTH_TOKEN (a user token with access to the site).
// The site id comes from NETLIFY_SITE_ID or from .netlify/state.json (created by `netlify link`).
// Usage: npm run deploy
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const env = { ...process.env, NODE_OPTIONS: '--use-system-ca' };
if (!env.NETLIFY_AUTH_TOKEN && process.platform === 'win32') {
  env.NETLIFY_AUTH_TOKEN = execSync(`powershell -NoProfile -c "[Environment]::GetEnvironmentVariable('NETLIFY_AUTH_TOKEN','User')"`).toString().trim();
}
const site = process.env.NETLIFY_SITE_ID || JSON.parse(readFileSync('.netlify/state.json', 'utf8')).siteId;
execSync(`npx -y netlify-cli@27.18.0 deploy --build --prod --site ${site}`, { stdio: 'inherit', env });
