import { defineConfig } from 'vitest/config';
import type { Reporter } from 'vitest/node';

import reportPortalConfig from './reportportal.config.js';
import { ReportPortalVitestReporter } from './reportportal-vitest-reporter';

const reporters: Array<'default' | Reporter> = ['default'];

if (process.env.RP_API_KEY) {
  reporters.push(new ReportPortalVitestReporter(reportPortalConfig));
}

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    reporters,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
});
