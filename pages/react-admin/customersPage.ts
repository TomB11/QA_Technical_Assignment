import { expect, Page } from '@playwright/test';
import type { CustomerData } from '../../interfaces/customer.interface';

export class CustomersPage {
  readonly page: Page;
  readonly customersLink: ReturnType<Page['getByRole']>;
  readonly saveButton: ReturnType<Page['getByRole']>;
  readonly createFormButton: ReturnType<Page['getByRole']>;
  readonly deleteButton: ReturnType<Page['getByRole']>;

  constructor(page: Page) {
    this.page = page;
    this.customersLink = this.page.locator('a[role="menuitem"][href="#/customers"]')
    this.saveButton = this.page.getByRole('button', { name: 'Save' });
    this.createFormButton = this.page.getByRole('link', { name: 'Create' });
    this.deleteButton = this.page.getByRole('button', { name: 'Delete' });
  }

  async open() {
    await this.customersLink.focus();
    await this.customersLink.press('Enter');

    await expect(this.page).toHaveURL(/#\/customers$/);
  }

  async openCreateForm() {
    await this.createFormButton.click();

    await expect(
      this.page.getByLabel('First name')
    ).toBeVisible();
  }

  async createCustomer(customerData: CustomerData) {
    await this.page.getByLabel('First name').fill(customerData.firstName);
    await this.page.getByLabel('Last name').fill(customerData.lastName);
    await this.page.getByLabel('Email').fill(customerData.email);

    await this.saveButton.click();
  }

  getCustomerLink(firstName: string, lastName: string) {
    return this.page.getByRole('link', {
      name: new RegExp(`${firstName} ${lastName}`),
    });
  }

  async openCustomer(firstName: string, lastName: string) {
    const customerLink = this.getCustomerLink(firstName, lastName);

    await expect(customerLink).toBeVisible();
    await customerLink.click();

    await expect(this.page.getByLabel('First name')).toBeVisible();
  }

  async editCustomer(customerData: Partial<CustomerData>) {
    if (customerData.firstName !== undefined) {
      await this.page.getByLabel('First name').fill(customerData.firstName);
    }
    if (customerData.lastName !== undefined) {
      await this.page.getByLabel('Last name').fill(customerData.lastName);
    }
    if (customerData.email !== undefined) {
      await this.page.getByLabel('Email').fill(customerData.email);
    }

    await this.saveButton.click();
  }

  async deleteCustomer() {
    await this.deleteButton.click();
  }
}