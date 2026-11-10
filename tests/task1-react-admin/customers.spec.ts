import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/react-admin/loginPage';
import { CustomersPage } from '../../pages/react-admin/customersPage';

test.beforeEach(async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.navigate();
  await loginPage.login('demo', 'demo');
});

// Vytváranie záznamov je základná CRUD operácia - ak zlyhá, administrátori
// nevedia pridávať nových zákazníkov do systému.
test('create customer', async ({ page }) => {
  const customersPage = new CustomersPage(page);

  const newCustomer = {
    firstName: 'John',
    lastName: 'Doe',
    email: `john.doe.${Date.now()}@example.com`,
  };

  await customersPage.open();
  await customersPage.openCreateForm();
  await customersPage.createCustomer(newCustomer);

  await expect(page).toHaveURL(/#\/customers\/\d+$/);
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  await expect(page.getByLabel('First name')).toHaveValue(
    newCustomer.firstName
  );
  await expect(page.getByLabel('Last name')).toHaveValue(
    newCustomer.lastName
  );
});

// Dáta zákazníkov sa v čase menia (napr. zmena mena) - aktualizácia jedného
// poľa má zachovať ostatné uložené údaje.
test('edit customer', async ({ page }) => {
  const customersPage = new CustomersPage(page);

  const customer = {
    firstName: 'Edit',
    lastName: 'Test',
    email: `edit.test.${Date.now()}@example.com`,
  };

  await customersPage.open();
  await customersPage.openCreateForm();
  await customersPage.createCustomer(customer);

  await expect(page).toHaveURL(/#\/customers\/\d+$/);

  await customersPage.open();
  await customersPage.openCustomer(customer.firstName, customer.lastName);
  await customersPage.editCustomer({ firstName: 'Updated' });

  await expect(page).toHaveURL(/#\/customers$/);

  await expect(
    page.getByRole('link', {
      name: /Updated Test/,
    })
  ).toBeVisible();

  await customersPage.openCustomer('Updated', 'Test');

  await expect(page.getByLabel('First name')).toHaveValue('Updated');
  await expect(page.getByLabel('Last name')).toHaveValue(customer.lastName);
  await expect(page.getByLabel('Email')).toHaveValue(customer.email);
});

// Overuje, že administrátor vie odstrániť záznam z detailu a že po návrate
// do zoznamu sa daný záznam už nezobrazuje.
test('delete customer in detail view', async ({ page }) => {
  const customersPage = new CustomersPage(page);

  const customer = {
    firstName: 'Delete',
    lastName: 'Test',
    email: `delete.test.${Date.now()}@example.com`,
  };

  await customersPage.open();
  await customersPage.openCreateForm();
  await customersPage.createCustomer(customer);
  await customersPage.deleteCustomer();

  await expect(page).toHaveURL(/#\/customers$/);
  await expect(
    page.getByText(`${customer.firstName} ${customer.lastName}`, {
      exact: true,
    })
  ).not.toBeVisible();
});

// Overuje alternatívnu cestu odstránenia záznamu priamo zo zoznamu
// pomocou výberu riadku a akcie Delete.
test('delete customer from list view', async ({ page }) => {
  const customersPage = new CustomersPage(page);

  const customer = {
    firstName: 'Bulk',
    lastName: 'Delete',
    email: `bulk.delete.${Date.now()}@example.com`,
  };

  await customersPage.open();
  await customersPage.openCreateForm();
  await customersPage.createCustomer(customer);

  await expect(page).toHaveURL(/#\/customers\/\d+$/);

  await customersPage.open();

  const customerLink = page.getByRole('link', {
    name: /Bulk Delete/,
  });

  await expect(customerLink).toBeVisible();

  const customerRow = customerLink.locator('xpath=ancestor::tr');

  await expect(customerRow).toBeVisible();

  const checkbox = customerRow.locator('input[type="checkbox"]');

  await expect(checkbox).toBeVisible();
  await checkbox.check();

  await page.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByRole('link', { name: /Bulk Delete/ })).not.toBeVisible();
});

// Overuje, že formulár odmietne neplatný formát e-mailu namiesto uloženia
// záznamu s kontaktným údajom, ktorý neprejde jeho validáciou.
test('validate customer creation form', async ({ page }) => {
  const customersPage = new CustomersPage(page);

  await customersPage.open();
  await customersPage.openCreateForm();

  await expect(customersPage.saveButton).toBeDisabled();

  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('Validation');
  const emailInput = page.getByLabel('Email');
  await emailInput.fill('invalid-email');

  await expect(customersPage.saveButton).toBeEnabled();
  const hasEmailTypeMismatch = await emailInput.evaluate(
    (input) => (input as HTMLInputElement).validity.typeMismatch,
  );
  expect(hasEmailTypeMismatch).toBe(true);
  await customersPage.saveButton.click();

  await expect(page).toHaveURL(/#\/customers\/create$/);
  await expect(emailInput).toHaveValue('invalid-email');
});