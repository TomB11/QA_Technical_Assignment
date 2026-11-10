import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/sauce-demo/loginPage';

test.describe('SauceDemo UI Authentication', () => {
  // Základný "happy path" prihlásenia - bez neho sa používateľ nedostane
  // k chránenému obsahu aplikácie (produkty, nákup).
  test('should login successfully and access protected page', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.open();
    await loginPage.login('standard_user', 'secret_sauce');

    await expect(page).toHaveURL(/inventory.html/);
    await expect(page.getByText('Products', { exact: true })).toBeVisible();
  });

  // Overuje, že aplikácia odmietne nesprávne údaje a zobrazí chybu
  // bez presmerovania používateľa na chránenú stránku.
  test('should reject invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.open();
    await loginPage.login('invalid_user', 'wrong_password');

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText(
      'Username and password do not match',
    );
    await expect(page).toHaveURL('https://www.saucedemo.com/');
  });

  // Overuje, že aplikácia odmietne prihlásenie účtu označeného ako
  // zablokovaný a zobrazí príslušnú správu.
  test('should reject locked out user', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.open();
    await loginPage.login('locked_out_user', 'secret_sauce');

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText(
      'Sorry, this user has been locked out',
    );
    await expect(page).toHaveURL('https://www.saucedemo.com/');
  });

  // Overuje, že priamy vstup na chránenú URL bez prihlásenia skončí
  // presmerovaním na prihlasovaciu stránku.
  test('should redirect unauthenticated user from protected page', async ({
    page,
  }) => {
    await page.goto('https://www.saucedemo.com/inventory.html');

    await expect(page).toHaveURL('https://www.saucedemo.com/');
    await expect(page.locator('[data-test="login-button"]')).toBeVisible();
  });

  // Overuje, že po odhlásení sa relácia skutočne ukončí a chránený obsah
  // už nie je dostupný - dôležité pre bezpečnosť na zdieľaných zariadeniach.
  test('should logout and prevent access to protected page', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.open();
    await loginPage.login('standard_user', 'secret_sauce');

    await expect(page).toHaveURL(/inventory.html/);

    await page.locator('#react-burger-menu-btn').click();
    await page.locator('#logout_sidebar_link').click();

    await expect(page).toHaveURL('https://www.saucedemo.com/');

    await page.goto('https://www.saucedemo.com/inventory.html');

    await expect(page).toHaveURL('https://www.saucedemo.com/');
    await expect(page.locator('[data-test="login-button"]')).toBeVisible();
  });
});
