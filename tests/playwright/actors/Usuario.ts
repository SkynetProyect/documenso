import { actorCalled, Cast, engage } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright';
import type { Browser } from 'playwright';

// Without the `@serenity-js/cucumber` adapter, the Stage never receives SceneStarts/
// SceneFinishes events, so actors created via `actorCalled` are cached forever in the
// 'background' focus area, with abilities bound to the Playwright browser of the scenario
// that first created them. A fresh actor name per scenario forces re-preparation against
// the current (Before-hook) browser instance.
let counter = 0;

export const Usuario = (browser: Browser) => {
  engage(
    Cast.where((actor) =>
      actor.whoCan(
        BrowseTheWebWithPlaywright.using(browser, {
          baseURL: 'http://localhost:3000',
          viewport: { width: 1854, height: 963 },
        }),
      ),
    ),
  );

  counter += 1;

  return actorCalled(`Usuario-${counter}`);
};
