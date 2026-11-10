import { test, expect, APIRequestContext } from '@playwright/test';

const API_URL = 'https://dummyjson.com';

const credentials = {
  username: 'emilys',
  password: 'emilyspass',
};

async function loginAndGetAccessToken(
  request: APIRequestContext,
): Promise<string> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: credentials,
  });

  expect(response.status()).toBe(200);

  const responseData = await response.json();

  expect(responseData.accessToken).toBeTruthy();

  return responseData.accessToken;
}

test.describe('DummyJSON API Authentication', () => {
  // Základný "happy path" prihlásenia - bez neho používateľ nezíska
  // access/refresh token potrebný pre autentifikáciu voči zvyšku API.
  test('should login successfully and return access and refresh tokens', async ({
    request,
  }) => {
    const response = await request.post(`${API_URL}/auth/login`, {
      data: credentials,
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();

    expect(responseData.username).toBe('emilys');
    expect(responseData.id).toBe(1);

    expect(responseData.accessToken).toBeTruthy();
    expect(typeof responseData.accessToken).toBe('string');
    expect(responseData.accessToken.length).toBeGreaterThan(0);

    expect(responseData.refreshToken).toBeTruthy();
    expect(typeof responseData.refreshToken).toBe('string');
    expect(responseData.refreshToken.length).toBeGreaterThan(0);
  });

  // Overuje, že platný access token skutočne odomkne prístup k chránenému
  // zdroju - bez tohto by autorizácia nemala žiadnu reálnu hodnotu.
  test('should return authenticated user with valid access token', async ({
    request,
  }) => {
    const accessToken = await loginAndGetAccessToken(request);

    const response = await request.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();

    expect(responseData.id).toBe(1);
    expect(responseData.username).toBe('emilys');
    expect(responseData.email).toBe('emily.johnson@x.dummyjson.com');
  });

  // Overuje, že endpoint bez access tokenu nevráti profil používateľa
  // a odpovie chybou autentifikácie.
  test('should reject access to current user without token', async ({
    request,
  }) => {
    const response = await request.get(`${API_URL}/auth/me`);

    expect(response.status()).toBe(401);

    const responseData = await response.json();

    expect(responseData.message).toBe('Access Token is required');
  });

  // Overuje, že nesprávne heslo nevedie k úspešnému prihláseniu a API vráti
  // konkrétnu chybu namiesto tokenov.
  test('should reject login with invalid credentials', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/login`, {
      data: {
        username: 'emilys',
        password: 'wrong_password',
      },
    });

    expect(response.status()).toBe(400);

    const responseData = await response.json();

    expect(responseData.message).toBe('Invalid credentials');
  });

  // Overuje, že API prijme refresh token, vráti nový access token a tento
  // token možno použiť na získanie profilu cez /auth/me.
  test('should refresh authentication session with valid refresh token', async ({
    request,
  }) => {
    const loginResponse = await request.post(`${API_URL}/auth/login`, {
      data: credentials,
    });

    expect(loginResponse.status()).toBe(200);

    const loginData = await loginResponse.json();

    expect(loginData.refreshToken).toBeTruthy();

    const refreshResponse = await request.post(`${API_URL}/auth/refresh`, {
      data: {
        refreshToken: loginData.refreshToken,
        expiresInMins: 5,
      },
    });

    expect(refreshResponse.status()).toBe(200);

    const refreshData = await refreshResponse.json();

    expect(refreshData.accessToken).toBeTruthy();
    expect(refreshData.refreshToken).toBeTruthy();

    const meResponse = await request.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${refreshData.accessToken}`,
      },
    });

    expect(meResponse.status()).toBe(200);

    const userData = await meResponse.json();

    expect(userData.username).toBe('emilys');
    expect(userData.id).toBe(1);
  });
});
