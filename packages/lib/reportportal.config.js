/**
 * ReportPortal config for @documenso/lib unit tests (vitest).
 * Reporter is only attached when RP_API_KEY is set (see vitest.config.ts),
 * so local/CI runs without ReportPortal credentials are unaffected.
 */
module.exports = {
  apiKey: process.env.RP_API_KEY,
  endpoint: process.env.RP_ENDPOINT ?? 'http://localhost:8080/api/v1',
  project: process.env.RP_PROJECT ?? 'default_personal',
  launch: 'documenso-lib-unit-tests',
  attributes: [
    { key: 'package', value: '@documenso/lib' },
    { key: 'suite', value: 'fields' },
  ],
  description: 'Unit tests for @documenso/lib (incl. validateFieldsInserted)',
};
