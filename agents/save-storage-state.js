import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from './lib/args.js';
import { loadEnv } from './lib/env.js';

loadEnv();

const platformConfig = {
  instagram: {
    loginUrl: 'https://www.instagram.com/accounts/login/',
    verifyUrl: 'https://www.instagram.com/',
    defaultPath: process.env.INSTAGRAM_PLAYWRIGHT_STORAGE_STATE ?? 'agents/.instagram-storage-state.json',
    authCookieNames: ['sessionid', 'ds_user_id'],
    loginGatePattern: /Log into Instagram|Log in with Facebook|Create new account/,
  },
  threads: {
    loginUrl: 'https://www.threads.com/login',
    verifyUrl: 'https://www.threads.com/search?q=Hamilton%20restaurant',
    defaultPath: process.env.THREADS_PLAYWRIGHT_STORAGE_STATE ?? 'agents/.threads-storage-state.json',
    authCookieNames: ['sessionid', 'ds_user_id'],
    loginGatePattern: /Log in or sign up for Threads|Continue with Instagram|Log in with username/,
  },
};

async function hasAuthCookie(context, cookieNames) {
  const cookies = await context.cookies();
  return cookies.some((cookie) => cookieNames.includes(cookie.name));
}

async function waitForUsableSession(page, context, config, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await hasAuthCookie(context, config.authCookieNames)) {
      await page.goto(config.verifyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const loginGate = await page
        .evaluate((patternSource) => {
          const pattern = new RegExp(patternSource);
          return pattern.test(document.body.innerText ?? '');
        }, config.loginGatePattern.source)
        .catch(() => true);
      if (!loginGate) return true;
      console.log('[DataNode] Auth cookie found, but platform still shows a login gate. Complete the platform login/continue step.');
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
  }
  return false;
}

async function main() {
  const args = parseArgs();
  const platform = args.value('platform', 'instagram');
  const config = platformConfig[platform];
  if (!config) throw new Error(`Unsupported platform: ${platform}`);

  const storageState = resolve(args.value('storage-state', config.defaultPath));
  const timeoutMs = args.int('timeout-ms', 180000);
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  console.log(`[DataNode] Opening ${platform} login. Complete login in the browser window.`);
  console.log(`[DataNode] Waiting up to ${Math.round(timeoutMs / 1000)}s for auth cookies...`);
  await page.goto(config.loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const authenticated = await waitForUsableSession(page, context, config, timeoutMs);
  if (!authenticated) {
    await browser.close();
    throw new Error(`Timed out waiting for ${platform} login cookies.`);
  }

  mkdirSync(dirname(storageState), { recursive: true });
  await context.storageState({ path: storageState });
  await browser.close();
  console.log(`[DataNode] Saved ${platform} storage state to ${storageState}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
