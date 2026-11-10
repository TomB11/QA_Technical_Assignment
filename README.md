# QA Automation Assignment

End-to-end testy postavené na [Playwright](https://playwright.dev/) s využitím Page Object Modelu (POM).

## Štruktúra projektu

```
.
├── interfaces/              # TypeScript rozhrania pre testovacie dáta (napr. CustomerData)
├── pages/                   # Page objekty (napr. react-admin/loginPage.ts, react-admin/customersPage.ts)
├── tests/                   # Testovacie súbory (.spec.ts)
│   ├── task1-react-admin/   # E2E testy pre React Admin demo aplikáciu
│   ├── task2-api/           # API testy (JSONPlaceholder)
│   ├── task3-healthcheck/   # Testy validácie healthcheck payloadu a mock server
│   ├── task4-auth-ui/       # UI testy autentifikácie (SauceDemo)
│   └── task4-auth-api/      # API testy autentifikácie (DummyJSON)
├── playwright.config.ts     # Konfigurácia Playwright (prehliadače, reportér, retries...)
└── .github/workflows/       # CI pipeline (GitHub Actions)
```

## Požiadavky

- [Node.js](https://nodejs.org/) (odporúčaná aktuálna LTS verzia)
- npm (súčasť Node.js)

## Inštalácia

1. Nainštalujte závislosti projektu:

   ```bash
   npm install
   ```

2. Nainštalujte prehliadače potrebné pre Playwright (Chromium, Firefox, WebKit vrátane potrebných systémových závislostí):

   ```bash
   npx playwright install --with-deps
   ```

### Healthcheck mock server

Playwright pri spustení testov automaticky zabezpečí mock server z
`tests/task3-healthcheck/mock-server.mjs` na porte `3000`. Ak ho spustí,
po dokončení testov ho aj zastaví; lokálne môže použiť už bežiaci server.
Na CI musí byť port `3000` voľný.

Ak chcete spustiť mock server samostatne, napríklad na manuálne overenie,
otvorte prvý terminál v koreňovom priečinku projektu a spustite:

```bash
node tests/task3-healthcheck/mock-server.mjs
```

Server nechajte bežať a v druhom termináli spustite testy:

```bash
npx playwright test tests/task3-healthcheck/healthcheck.spec.ts
```

Samostatne spustený server ukončíte pomocou `Ctrl+C`. Pri testovaní cez
Playwright ho nespúšťajte ručne; Playwright ho podľa potreby spustí automaticky.

## Spustenie testov

Spustenie všetkých testov vo všetkých nakonfigurovaných prehliadačoch
(vrátane automatického spustenia healthcheck mock servera):

```bash
npx playwright test
```

Spustenie testov v konkrétnom prehliadači:

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

Spustenie konkrétneho testovacieho súboru:

```bash
npx playwright test tests/task1-react-admin/customers.spec.ts
```

Spustenie konkrétneho testu podľa názvu:

```bash
npx playwright test -g "edit customer"
```

Spustenie testov s viditeľným prehliadačom (headed mód) alebo v UI režime:

```bash
npx playwright test --headed
npx playwright test --ui
```

Výpis testov bez ich spustenia (overenie, že sa súbory správne nájdu/skompilujú):

```bash
npx playwright test --list
```

### Report z testov

Po behu testov sa generuje HTML report. Na jeho zobrazenie spustite:

```bash
npx playwright show-report
```

## Podporované prehliadače

Testy sú v [playwright.config.ts](./playwright.config.ts) nakonfigurované pre tri desktopové prehliadače (`projects`):

| Project    | Prehliadač               |
| ---------- | ------------------------ |
| `chromium` | Google Chrome / Chromium |
| `firefox`  | Mozilla Firefox          |
| `webkit`   | Safari (WebKit)          |

Testy mobilných zariadení a branded prehliadačov (Microsoft Edge, Google Chrome) sú v konfigurácii pripravené, ale aktuálne zakomentované.

## CI

Testy sa automaticky spúšťajú cez GitHub Actions ([.github/workflows/playwright.yml](./.github/workflows/playwright.yml)) pri každom `push` a `pull_request` do vetiev `main`/`master`. Výstupný HTML report sa ukladá ako artefakt behu.

## Úloha 2 — API testy

Testy v [tests/task2-api/posts.spec.ts](./tests/task2-api/posts.spec.ts) pokrývajú `Posts` endpoint verejného testovacieho API [JSONPlaceholder](https://jsonplaceholder.typicode.com/). Hlavným cieľom bolo overiť základnú CRUD funkcionalitu API a skontrolovať, či jednotlivé endpointy vracajú očakávané HTTP stavové kódy a správne údaje v odpovedi.

Spustenie len API testov:

```bash
npx playwright test tests/task2-api/posts.spec.ts
```

### Testovacie prípady, ktoré som zámerne vynechal

Niektoré testovacie prípady som zámerne vynechal, aby testovacia sada zostala zameraná na najdôležitejšiu API funkcionalitu:

- **Overovanie trvalého uloženia po vytvorení alebo update dát** — JSONPlaceholder je mock API, ktoré operácie zápisu (`POST`, `PUT`, `PATCH`, `DELETE`) iba simuluje a vracia odpovede zodpovedajúce úspešnej operácii, ale zmeny trvalo neukladá do databázy. Overenie perzistencie by preto nebolo možné ani zmysluplné.
- **Výkonnostné a záťažové testovanie** — zadanie bolo zamerané na funkčné API testovanie, nie na hodnotenie výkonu API pri vysokej záťaži.
- **Validácia vstupných údajov pre POST/PUT/PATCH** — JSONPlaceholder je testovacie API a zadanie sa zameriavalo na základné CRUD odpovede. Validácia formátu e-mailu z Úlohy 1 sa týka formulára demo aplikácie; nenahrádza serverovú validáciu, ktorú by bolo potrebné testovať pri reálnom API.

## Úloha 3 — healthcheck validácia

Pri tejto úlohe som sa zameral hlavne na to, aby server vedel správne rozpoznať platný a neplatný payload, ktorý agent posiela pri pravidelnom healthchecku.

Ako prvé som otestoval kompletný platný payload podľa zadania. Následne som postupne menil jednotlivé hodnoty a skúšal, či server správne odmietne nesprávne dáta.

Za najrizikovejšie považujem hlavne nesprávne alebo neúplné informácie o zariadení a operačnom systéme, pretože na základe nich môže server vyhodnocovať stav agenta. Dôležitá je aj kontrola IP adries a UUID.

V testoch som pokryl platný payload, chýbajúce a extra polia, nesprávne dátové typy, neplatné hodnoty a vybrané hraničné prípady.

Vedome som neriešil napríklad výkon pri veľkom množstve požiadaviek, súbežné odosielanie healthcheckov ani dlhodobé správanie agenta.

## Úloha 4 — Autentifikácia a autorizácia

V tejto úlohe som sa zameral na testovanie prihlasovania a prístupu k chráneným stránkam a API.

1.Part A – UI autentifikácia (SauceDemo)

Otestoval som úspešné prihlásenie, prihlásenie s nesprávnymi údajmi a pokus o prihlásenie so zamknutým účtom. Overil som aj priamy prístup na chránenú stránku bez prihlásenia a správanie aplikácie po odhlásení.

Dôležité bolo hlavne overiť, že neprihlásený používateľ sa nedostane k chránenému obsahu a že po odhlásení už nemá prístup k predchádzajúcej relácii.

2.Part B – API autentifikácia a autorizácia (DummyJSON)

Na API časti som testoval prihlásenie so správnymi aj nesprávnymi údajmi, vrátenie accessToken a refreshToken a prístup k endpointu /auth/me.

Overil som, že používateľ s platným tokenom dostane svoje údaje a požiadavka bez tokenu je odmietnutá. Ako ďalší bezpečnostný scenár som otestoval aj obnovenie autentifikačnej relácie pomocou refreshToken a následné použitie nového access tokenu.

Pokus o testovanie neplatného JWT tokenu skončil odpoveďou HTTP 500 namiesto očakávaného 401. Ide o samostatný nevyriešený scenár, ktorý by si v produkčnom prostredí vyžadoval preverenie. Test obnovy tokenu pokrýva inú funkcionalitu a tento problém nenahrádza.
