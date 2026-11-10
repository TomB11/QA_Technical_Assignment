import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/react-admin/loginPage';

// Prihlásenie je vstupnou bránou do celej aplikácie - bez funkčného
// prihlásenia sa používatelia nedostanú k žiadnej ďalšej funkcionalite.
test('login to React Admin', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigate();

  await loginPage.login('demo', 'demo');
  
  await expect(page).toHaveURL('https://marmelab.com/react-admin-demo/#/');
});

// Overuje, že aplikácia nepustí prihlásenie s prázdnymi údajmi a zobrazí
// zrozumiteľnú chybu namiesto tichého zlyhania alebo neoprávneného prístupu.
test('login with empty credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigate();

  await loginPage.login('', '');

  await expect(page).toHaveURL('https://marmelab.com/react-admin-demo/#/login');
  await expect(page.getByText('The form is not valid. Please check for errors')).toBeVisible();
});