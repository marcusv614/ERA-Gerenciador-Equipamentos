import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import base from './playwright.config.mjs';

export default defineConfig({
  ...base,
  testMatch: 'tecnico-campo.spec.mjs',
  outputDir: fileURLToPath(new URL('../../../test-results/tecnico-campo/artifacts', import.meta.url)),
  reporter: [['list'], ['json', { outputFile: fileURLToPath(new URL('../../../test-results/tecnico-campo/results.json', import.meta.url)) }]],
});
