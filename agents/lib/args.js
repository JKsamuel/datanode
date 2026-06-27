export function parseArgs(argv = process.argv.slice(2)) {
  const flags = new Set();
  const values = new Map();

  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const body = arg.slice(2);
    const separator = body.indexOf('=');
    if (separator === -1) {
      flags.add(body);
      continue;
    }
    values.set(body.slice(0, separator), body.slice(separator + 1));
  }

  return {
    flag(name) {
      return flags.has(name);
    },
    value(name, fallback = undefined) {
      return values.get(name) ?? fallback;
    },
    list(name, fallback = []) {
      const raw = values.get(name);
      if (!raw) return fallback;
      return raw.split(',').map((item) => item.trim()).filter(Boolean);
    },
    int(name, fallback) {
      const raw = values.get(name);
      if (!raw) return fallback;
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    },
  };
}
