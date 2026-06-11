import type { StartTestItemOptions } from '@reportportal/client-javascript';
import RPClient from '@reportportal/client-javascript';
import type { Reporter, TestCase, TestModule, TestSuite } from 'vitest/node';

type RPAttribute = { key?: string; value: string };

// The published types omit `codeRef`, which the JS client supports and uses
// to compute `testCaseId` (see report-portal-client.js#startTestItem).
type StartTestItemOptionsWithCodeRef = StartTestItemOptions & { codeRef?: string };

export type ReportPortalReporterConfig = {
  apiKey?: string;
  endpoint: string;
  project: string;
  launch: string;
  attributes?: RPAttribute[];
  description?: string;
};

const RP_STATUS = {
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
} as const;

function mapTestStatus(state: string): string {
  switch (state) {
    case 'passed':
      return RP_STATUS.PASSED;
    case 'failed':
      return RP_STATUS.FAILED;
    default:
      return RP_STATUS.SKIPPED;
  }
}

/**
 * Minimal Vitest 4 reporter for ReportPortal, built directly on
 * @reportportal/client-javascript.
 *
 * @reportportal/agent-js-vitest@5.2.2 (latest available) only implements
 * the Vitest 1-3 reporter hooks (onCollected/onTaskUpdate/onFinished), which
 * Vitest 4 never calls, so launches are created but stay empty. This reporter
 * implements the Vitest 4 hooks (onTestModuleStart/onTestSuiteReady/
 * onTestCaseReady/onTestCaseResult/onTestSuiteResult/onTestModuleEnd) to
 * create the actual suite/test items.
 */
export class ReportPortalVitestReporter implements Reporter {
  private client: RPClient;
  private config: ReportPortalReporterConfig;
  private launchTempId: string | null = null;
  private itemIds = new Map<unknown, string>();
  private promises: Array<Promise<unknown>> = [];

  constructor(config: ReportPortalReporterConfig) {
    this.config = config;
    this.client = new RPClient(config);
  }

  private track(promise: Promise<unknown>) {
    this.promises.push(promise.catch(() => undefined));
  }

  onTestRunStart() {
    const { tempId, promise } = this.client.startLaunch({
      startTime: Date.now(),
      description: this.config.description,
      attributes: this.config.attributes,
    });

    this.launchTempId = tempId;
    this.track(promise);
  }

  onTestModuleStart(testModule: TestModule) {
    if (!this.launchTempId) {
      return;
    }

    const startItemOptions: StartTestItemOptionsWithCodeRef = {
      name: testModule.relativeModuleId ?? testModule.moduleId,
      type: 'SUITE',
      startTime: Date.now(),
      codeRef: testModule.moduleId,
    };

    const { tempId, promise } = this.client.startTestItem(startItemOptions, this.launchTempId);

    this.itemIds.set(testModule, tempId);
    this.track(promise);
  }

  onTestModuleEnd(testModule: TestModule) {
    const tempId = this.itemIds.get(testModule);

    if (!tempId) {
      return;
    }

    const { promise } = this.client.finishTestItem(tempId, {
      endTime: Date.now(),
      status: testModule.ok() ? RP_STATUS.PASSED : RP_STATUS.FAILED,
    });

    this.track(promise);
  }

  onTestSuiteReady(testSuite: TestSuite) {
    if (!this.launchTempId) {
      return;
    }

    const parentTempId = this.itemIds.get(testSuite.parent);

    const startItemOptions: StartTestItemOptionsWithCodeRef = {
      name: testSuite.name,
      type: 'SUITE',
      startTime: Date.now(),
      codeRef: testSuite.fullName,
    };

    const { tempId, promise } = this.client.startTestItem(startItemOptions, this.launchTempId, parentTempId);

    this.itemIds.set(testSuite, tempId);
    this.track(promise);
  }

  onTestSuiteResult(testSuite: TestSuite) {
    const tempId = this.itemIds.get(testSuite);

    if (!tempId) {
      return;
    }

    const state = testSuite.state();
    const status = state === 'skipped' ? RP_STATUS.SKIPPED : RP_STATUS.PASSED;

    const { promise } = this.client.finishTestItem(tempId, {
      endTime: Date.now(),
      status: state === 'failed' ? RP_STATUS.FAILED : status,
    });

    this.track(promise);
  }

  onTestCaseReady(testCase: TestCase) {
    if (!this.launchTempId) {
      return;
    }

    const parentTempId = this.itemIds.get(testCase.parent);

    const startItemOptions: StartTestItemOptionsWithCodeRef = {
      name: testCase.name,
      type: 'STEP',
      startTime: Date.now(),
      codeRef: testCase.fullName,
    };

    const { tempId, promise } = this.client.startTestItem(startItemOptions, this.launchTempId, parentTempId);

    this.itemIds.set(testCase, tempId);
    this.track(promise);
  }

  onTestCaseResult(testCase: TestCase) {
    const tempId = this.itemIds.get(testCase);

    if (!tempId) {
      return;
    }

    const result = testCase.result();

    if ('errors' in result && result.errors?.length) {
      for (const error of result.errors) {
        const { promise } = this.client.sendLog(tempId, {
          time: Date.now(),
          level: 'ERROR',
          message: error.stack ?? error.message ?? String(error),
        });

        this.track(promise);
      }
    }

    const { promise } = this.client.finishTestItem(tempId, {
      endTime: Date.now(),
      status: mapTestStatus(result.state),
    });

    this.track(promise);
  }

  async onTestRunEnd() {
    await Promise.all(this.promises);

    if (!this.launchTempId) {
      return;
    }

    const { promise } = this.client.finishLaunch(this.launchTempId, {
      endTime: Date.now(),
    });

    await promise.catch(() => undefined);
  }
}
