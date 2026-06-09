import type { Configuration } from '@cucumber/cucumber';

const config: Configuration = {
  default: {
    requireModule: ['ts-node/register/transpile-only'],
    require: ['step-definitions/**/*.ts'],
    paths: ['features/**/*.feature'],
    publishQuiet: true,
    format: ['progress'],
    language: 'es',
    parallel: 1,
    retry: 0,
  },
};

export default config;
