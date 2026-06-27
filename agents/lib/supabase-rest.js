export const DEFAULT_SUPABASE_URL = 'https://cqqujqjjwxbaqkojarzs.supabase.co';
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Ix7-Ju3eftstVCVr8yYN-Q_s1ZEKN6g';

export function hasServiceRoleKey() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function assertWritableSupabase() {
  if (!hasServiceRoleKey()) {
    throw new Error('Live agent writes require SUPABASE_SERVICE_ROLE_KEY in .env. Use --dry-run for read-only smoke tests.');
  }
}

function firstPresent(...values) {
  return values.find((value) => value?.trim());
}

function encodeTable(table) {
  return table
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

export class SupabaseRestClient {
  constructor({
    url = firstPresent(process.env.SUPABASE_URL, DEFAULT_SUPABASE_URL),
    key = firstPresent(process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_PUBLISHABLE_KEY, DEFAULT_SUPABASE_PUBLISHABLE_KEY),
  } = {}) {
    this.restBaseUrl = `${url.replace(/\/+$/, '')}/rest/v1`;
    this.headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    };
  }

  buildUrl(table, params) {
    const query = params instanceof URLSearchParams ? params.toString() : params;
    return `${this.restBaseUrl}/${encodeTable(table)}${query ? `?${query}` : ''}`;
  }

  async request(method, table, { params, body, headers } = {}) {
    const response = await fetch(this.buildUrl(table, params), {
      method,
      headers: { ...this.headers, ...(headers ?? {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const raw = await response.text();
    const payload = raw ? JSON.parse(raw) : null;
    if (!response.ok) {
      const detail = payload?.message ?? payload?.hint ?? payload?.details ?? response.statusText;
      throw new Error(`Supabase ${method} ${table} failed (${response.status}): ${detail}`);
    }
    return payload;
  }

  select(table, params) {
    return this.request('GET', table, { params });
  }

  insert(table, rows, { returning = 'representation' } = {}) {
    return this.request('POST', table, {
      body: Array.isArray(rows) ? rows : [rows],
      headers: { Prefer: `return=${returning}` },
    });
  }

  upsert(table, rows, { onConflict, returning = 'representation' } = {}) {
    const params = new URLSearchParams();
    if (onConflict) params.set('on_conflict', onConflict);
    return this.request('POST', table, {
      params,
      body: Array.isArray(rows) ? rows : [rows],
      headers: { Prefer: `resolution=merge-duplicates,return=${returning}` },
    });
  }

  patch(table, params, body, { returning = 'representation' } = {}) {
    return this.request('PATCH', table, {
      params,
      body,
      headers: { Prefer: `return=${returning}` },
    });
  }
}
