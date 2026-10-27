import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const executavel = process.env.ERA_TEST_CHROMIUM || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',
  workers: 1,
  retries: 0,
  timeout: 30000,
  forbidOnly: true,
  outputDir: fileURLToPath(new URL('../../../test-results/quality-assurance/browser-local/artifacts', import.meta.url)),
  reporter: [['list'], ['json', { outputFile: fileURLToPath(new URL('../../../test-results/quality-assurance/browser-local/results.json', import.meta.url)) }]],
  use: {
    baseURL: 'http://127.0.0.1:4179',
    trace: 'off',
    screenshot: 'only-on-failure',
    launchOptions: executavel ? { executablePath: executavel } : {},
  },
  projects: [
    { name: 'qa-desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'qa-mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --config qa-browser/vite.config.mjs --host 127.0.0.1 --port 4179 --strictPort',
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    url: 'http://127.0.0.1:4179',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
