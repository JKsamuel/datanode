import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const loaded = new Set();

export function loadEnv(filePath = '.env') {
  const absolutePath = resolve(filePath);
  if (loaded.has(absolutePath) || !existsSync(absolutePath)) return;

  const content = readFileSync(absolutePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }

  loaded.add(absolutePath);
}

export function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}
