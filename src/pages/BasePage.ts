import { Page } from '@playwright/test';

/** Every page object knows its own URL and how to open it. Nothing else lives here on purpose. */
export abstract class BasePage {
  protected abstract readonly path: string;

  constructor(protected readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto(this.path);
  }
}
