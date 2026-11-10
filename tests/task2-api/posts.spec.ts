import { test, expect } from '@playwright/test';

const API_URL = 'https://jsonplaceholder.typicode.com';

test.describe('Posts API', () => {

  // Zoznam príspevkov je základný "read" endpoint, na ktorom stavajú ďalšie
  // časti aplikácie (listingy, dashboardy) - musí vracať konzistentnú štruktúru dát.
  test('GET - should return list of posts', async ({ request }) => {
    const response = await request.get(`${API_URL}/posts`);

    expect(response.status()).toBe(200);

    const posts = await response.json();

    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBeGreaterThan(0);

    expect(posts[0]).toHaveProperty('userId');
    expect(posts[0]).toHaveProperty('id');
    expect(posts[0]).toHaveProperty('title');
    expect(posts[0]).toHaveProperty('body');
  });

  // Získanie jedného záznamu podľa ID je kľúčové pre detail view a odkazovanie
  // na konkrétny príspevok (napr. z e-mailu alebo iného systému).
  test('GET - should return a single post by ID', async ({ request }) => {
    const response = await request.get(`${API_URL}/posts/1`);

    expect(response.status()).toBe(200);

    const post = await response.json();

    expect(post.id).toBe(1);
    expect(post.userId).toBe(1);
    expect(typeof post.title).toBe('string');
    expect(typeof post.body).toBe('string');
  });

  // Vytváranie nových príspevkov je základná write operácia API - ak zlyhá,
  // klienti nevedia do systému pridať žiadne nové dáta.
  test('POST - should create a new post', async ({ request }) => {
    const newPost = {
        title: 'QA Automation Test',
        body: 'Testing POST request with Playwright',
        userId: 1,
    };

    const response = await request.post(`${API_URL}/posts`, {
        data: newPost,
    });

    expect(response.status()).toBe(201);

    const createdPost = await response.json();

    expect(createdPost.title).toBe(newPost.title);
    expect(createdPost.body).toBe(newPost.body);
    expect(createdPost.userId).toBe(newPost.userId);

    expect(createdPost.id).toBeDefined();
    expect(typeof createdPost.id).toBe('number');
  });

  // Úplná aktualizácia (PUT) overuje, že existujúci záznam je možné nahradiť
  // novými dátami bez vzniku duplicít alebo straty referencie na pôvodné ID.
  test('PUT - should update an existing post', async ({ request }) => {
    const updatedPost = {
        id: 1,
        title: 'Updated QA Title',
        body: 'Updated post body using PUT request',
        userId: 1,
    };

    const response = await request.put(`${API_URL}/posts/1`, {
        data: updatedPost,
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();

    expect(responseData.id).toBe(updatedPost.id);
    expect(responseData.title).toBe(updatedPost.title);
    expect(responseData.body).toBe(updatedPost.body);
    expect(responseData.userId).toBe(updatedPost.userId);
  });

  // Čiastočná aktualizácia (PATCH) overuje, že je možné zmeniť len vybrané
  // polia bez nutnosti posielať celý objekt a bez straty ostatných údajov.
  test('PATCH - should partially update an existing post', async ({ request }) => {
    const updatedData = {
        title: 'Partially Updated QA Title',
    };

    const response = await request.patch(`${API_URL}/posts/1`, {
        data: updatedData,
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();

    expect(responseData.title).toBe(updatedData.title);

    expect(responseData.id).toBe(1);
    expect(responseData.userId).toBe(1);
    expect(typeof responseData.body).toBe('string');
  });

  // Overuje, že endpoint prijme požiadavku na odstránenie existujúceho
  // príspevku a vráti očakávanú odpoveď JSONPlaceholder.
  test('DELETE - should delete an existing post', async ({ request }) => {
    const postId = 1;
    const response = await request.delete(`${API_URL}/posts/${postId}`);

    expect(response.status()).toBe(200);

    const responseData = await response.json();

    expect(responseData).toEqual({});
  });

  // Správne spracovanie neexistujúceho ID (404) je dôležité pre robustnosť -
  // klient tak vie jednoznačne rozlíšiť chýbajúci záznam od chyby servera.
  test('GET - should return 404 for a non-existing post', async ({ request }) => {
    const postId = 9999;
    const response = await request.get(`${API_URL}/posts/${postId}`);

    expect(response.status()).toBe(404);

    const responseData = await response.json();

    expect(responseData).toEqual({});
  });

  // Neznámy endpoint musí vracať jasnú chybu (404) namiesto napr. pádu servera
  // alebo zavádzajúcej odpovede - dôležité pre predvídateľné správanie API.
  test('GET - should return 404 for an unknown endpoint', async ({ request }) => {
    const response = await request.get(`${API_URL}/unknown-endpoint`);

    expect(response.status()).toBe(404);
  });
});