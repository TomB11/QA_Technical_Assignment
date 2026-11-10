import { Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: ReturnType<Page['getByLabel']>;
  readonly passwordInput: ReturnType<Page['getByLabel']>;
  readonly signInButton: ReturnType<Page['getByRole']>;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = this.page.getByLabel('Username');
    this.passwordInput = this.page.locator('input[name="password"]');
    this.signInButton = this.page.getByRole('button', { name: 'Sign in' });
  }

  async navigate() {
    await this.page.goto('https://marmelab.com/react-admin-demo/');
  }

  async login(username: string, password: string) {
    await this.emailInput.fill(username);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}