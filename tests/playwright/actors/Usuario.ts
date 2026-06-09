import { Actor } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/playwright';
import type { Browser } from 'playwright';

export const Usuario = (browser: Browser) => Actor.named('Usuario').whoCan(BrowseTheWeb.using(browser));
