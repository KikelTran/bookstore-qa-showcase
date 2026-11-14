import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class BookStorePage extends BasePage {
  protected readonly path = '/books';

  private readonly searchBox = this.page.getByPlaceholder('Type to search');
  private readonly bookTitleLinks = this.page.locator('table tbody').getByRole('link');

  async search(term: string): Promise<void> {
    await this.searchBox.fill(term);
  }

  async expectTitles(titles: string[]): Promise<void> {
    // toHaveText on a list = exact order and count, and it auto-retries until the table settles.
    await expect(this.bookTitleLinks).toHaveText(titles);
  }

  async expectTitleCount(count: number): Promise<void> {
    await expect(this.bookTitleLinks).toHaveCount(count);
  }
}
