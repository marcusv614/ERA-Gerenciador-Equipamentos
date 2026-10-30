import base from './playwright.config.mjs';
import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  ...base,
  testMatch:'dashboard-refactor.spec.mjs',
  outputDir:fileURLToPath(new URL('../../../test-results/refatoracao-ui',import.meta.url)),
  reporter:[['list']],
  webServer:{...base.webServer,reuseExistingServer:false},
});
