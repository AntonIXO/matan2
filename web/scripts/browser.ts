import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { chromium } from '@playwright/test';
export function browserExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (existsSync(chromium.executablePath())) return undefined;
  const root = join(homedir(), '.cache/ms-playwright');
  if (existsSync(root))
    for (const dir of readdirSync(root)
      .filter((s) => s.startsWith('chromium_headless_shell-'))
      .sort()
      .reverse()) {
      const path = join(root, dir, 'chrome-headless-shell-linux64/chrome-headless-shell');
      if (existsSync(path)) return path;
    }
  return undefined;
}
export const launchOptions = {
  headless: true,
  executablePath: browserExecutable(),
  args: ['--enable-unsafe-swiftshader'],
};
