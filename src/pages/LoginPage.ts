import { expect } from '@playwright/test';
import { Credentials } from '../api/types';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  protected readonly path = '/login';

  // demoqa has no data-testid, so: role/placeholder first, stable id only when nothing else is unique.
  private readonly userNameInput = this.page.getByPlaceholder('UserName');
  private readonly passwordInput = this.page.getByPlaceholder('Password');
  private readonly loginButton = this.page.getByRole('button', { name: 'Login' });
  private readonly errorMessage = this.page.locator('#name');

  async login({ userName, password }: Credentials): Promise<void> {
    await this.userNameInput.fill(userName);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectError(message: string): Promise<void> {
    await expect(this.errorMessage).toHaveText(message);
  }
}
