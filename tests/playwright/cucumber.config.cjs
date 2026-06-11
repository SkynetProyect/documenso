// CommonJS on purpose: cucumber-js's loadConfiguration() does a plain require() of this
// file before requireModule (ts-node) is registered. A .ts file with `export default`
// gets wrapped as `{ default: <config> }` by CJS/ESM interop, which double-nests the
// "default" profile and causes requireModule/require/paths/etc to be silently ignored.
const reportPortalConfig = {
  apiKey: process.env.RP_API_KEY ?? '',
  endpoint: process.env.RP_ENDPOINT ?? 'http://localhost:8080/api/v1',
  project: process.env.RP_PROJECT ?? 'default_personal',
  launch: 'documenso-e2e-screenplay',
  attributes: [{ key: 'suite', value: 'validacion-campos-insertados' }],
  description: 'Serenity/JS + Cucumber BDD suite for Documenso e2e flows',
};

module.exports = {
  default: {
    requireModule: ['ts-node/register/transpile-only'],
    require: ['step-definitions/**/*.ts'],
    paths: ['features/**/*.feature'],
    publishQuiet: true,
    format: process.env.RP_API_KEY ? ['progress', '@reportportal/agent-js-cucumber'] : ['progress'],
    formatOptions: process.env.RP_API_KEY ? { ...reportPortalConfig } : {},
    parallel: 1,
    retry: 0,
  },
};
