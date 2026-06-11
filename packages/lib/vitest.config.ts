import { createRequire } from 'module';
import { defineConfig } from 'vitest/config';
import type { Reporter } from 'vitest/node';

import reportPortalConfig from './reportportal.config.js';

const require = createRequire(import.meta.url);

const reporters: Array<'default' | Reporter> = ['default'];

if (process.env.RP_API_KEY) {
  const RPReporter = require('@reportportal/agent-js-vitest');
  reporters.push(new RPReporter(reportPortalConfig));
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
