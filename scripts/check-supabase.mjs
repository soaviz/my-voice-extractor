import fs from 'node:fs';

const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
];

const TABLES = ['users', 'projects', 'scenes', 'prompts', 'outputs', 'assets'];
const BUCKETS = ['uploads', 'outputs', 'thumbnails', 'assets'];

function parseEnvFile(path) {
  if (!fs.existsSync(path)) return {};
  const text = fs.readFileSync(path, 'utf8');
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if (!value || value.startsWith('#')) value = '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

function loadEnv() {
  const merged = {};
  for (const file of ['.env.example', '.env.save', '.env.local', '.env']) {
    Object.assign(merged, parseEnvFile(file));
  }
  return { ...merged, ...process.env };
}

function status(name, ok, detail = '') {
  return { name, ok: Boolean(ok), detail };
}

async function safeFetch(url, options = {}) {
  const res = await fetch(url, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text().catch(() => '');
  }
  return { ok: res.ok, status: res.status, body };
}

async function checkRestTable(env, table) {
  const url = `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(table)}?select=*&limit=1`;
  const result = await safeFetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  return status(`table:${table}`, result.ok, result.ok ? 'reachable' : `http_${result.status}`);
}

async function checkBuckets(env) {
  const url = `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/bucket`;
  const result = await safeFetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!result.ok || !Array.isArray(result.body)) {
    return BUCKETS.map((bucket) => status(`bucket:${bucket}`, false, `bucket_list_failed_http_${result.status}`));
  }
  const ids = new Set(result.body.map((bucket) => bucket.id));
  return BUCKETS.map((bucket) => status(`bucket:${bucket}`, ids.has(bucket), ids.has(bucket) ? 'exists' : 'missing'));
}

async function main() {
  const env = loadEnv();
  const envReport = REQUIRED_ENV.map((key) => status(`env:${key}`, Boolean(env[key]), env[key] ? 'exists' : 'missing'));
  const canUseRest = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

  const checks = [...envReport];

  if (!canUseRest) {
    checks.push(status('remote_rest_connection', false, 'missing_SUPABASE_URL_or_SERVICE_ROLE_KEY'));
  } else {
    const health = await safeFetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/`, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    checks.push(status('remote_rest_connection', health.ok, health.ok ? 'reachable' : `http_${health.status}`));
    for (const table of TABLES) checks.push(await checkRestTable(env, table));
    checks.push(...await checkBuckets(env));
  }

  checks.push(status('database_sql_metadata', false, env.DATABASE_URL ? 'DATABASE_URL_exists_but_no_pg_driver_in_project' : 'missing_DATABASE_URL'));
  checks.push(status('pgvector_extension', false, 'run_supabase/manual-check.sql_against_remote_db'));
  checks.push(status('rls_and_policies', false, 'run_supabase/manual-check.sql_against_remote_db'));

  console.table(checks);
}

main().catch((error) => {
  console.error('Supabase check failed without exposing secrets:', error.message);
  process.exitCode = 1;
});
