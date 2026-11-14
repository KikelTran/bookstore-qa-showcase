import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProfilePage extends BasePage {
  protected readonly path = '/profile';

  private readonly userNameValue = this.page.locator('#userName-value');
  private readonly bookTitleLinks = this.page.locator('table tbody').getByRole('link');
  private readonly confirmOkButton = this.page.getByRole('dialog').getByRole('button', { name: 'OK' });
  private readonly logoutButton = this.page.getByRole('button', { name: 'Logout' });

  private deleteIcon(isbn: string) {
    return this.page.locator(`#delete-record-${isbn}`);
  }

  async deleteBook(isbn: string): Promise<void> {
    // The app shows a native alert "Book deleted." after the modal. Accept it so the page is not blocked.
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.deleteIcon(isbn).click();
    await this.confirmOkButton.click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }

  async expectSignedInAs(userName: string): Promise<void> {
    await expect(this.userNameValue).toHaveText(userName);
  }

  async expectBookTitles(titles: string[]): Promise<void> {
    await expect(this.bookTitleLinks).toHaveText(titles);
  }
}
