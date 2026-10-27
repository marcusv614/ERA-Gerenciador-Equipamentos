import { defineConfig, devices } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Não aceitar URL arbitrária: evita testes destrutivos no ambiente habitual.
const config = JSON.parse(readFileSync(process.env.ERA_TEST_CONFIG, 'utf8'));
assert.equal(config.descartavel,true);
assert.match(config.project,/^era-tests-[a-f0-9]{12}$/);
assert.match(config.ui,/^http:\/\/127\.0\.0\.1:\d+$/);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // Login simultâneo da mesma conta revoga a sessão anterior por projeto.
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 45000,
  globalTimeout: 600000,
  reporter: [['list'],['html',{outputFolder:process.env.ERA_TEST_ARTIFACTS || 'playwright-report',open:'never'}],
    ['json',{outputFile:path.join(process.env.ERA_TEST_ARTIFACTS || 'playwright-report','resultados.json')}]],
  use: {
    baseURL: config.ui,
    colorScheme: 'light',
    screenshot: 'only-on-failure',
    // Traces incluem cookies e payloads. Opt-in apenas no ambiente descartável.
    trace: process.env.ERA_TEST_TRACE === '1' ? 'retain-on-failure' : 'off',
    launchOptions: process.env.ERA_TEST_CHROMIUM ? {executablePath:process.env.ERA_TEST_CHROMIUM} : {},
  },
  projects: [
    {name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},
    {name:'mobile',use:{...devices['Pixel 7'],defaultBrowserType:'chromium'}},
  ],
});
