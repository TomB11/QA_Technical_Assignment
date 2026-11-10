import { test, expect } from '@playwright/test';
import { validPayload } from './healthcheck.fixtures';

test.describe('Agent Healthcheck API', () => {
  test.describe('Valid payload acceptance', () => {
    // Základný "happy path" scenár - legitímny healthcheck od agenta musí
    // server bez problémov prijať a spracovať.
    test('should accept a valid healthcheck payload', async ({ request }) => {
      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: validPayload,
        },
      );

      expect(response.status()).toBe(200);

      const responseData = await response.json();

      expect(responseData).toEqual({
        status: 'ok',
      });
    });

    // Zariadenie bez aktívnych relácií (napr. mimo prevádzky) je legitímny
    // stav - API ho nesmie neprávom odmietnuť.
    test('should accept empty session_info', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        session_info: [],
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(200);

      const responseData = await response.json();

      expect(responseData).toEqual({
        status: 'ok',
      });
    });

    // Niektoré zariadenia (napr. virtuálne stroje) nemusia mať sériové číslo
    // základnej dosky - API musí tento legitímny prípad akceptovať.
    test('should accept empty base_board_sn', async ({ request }) => {
      const validPayloadWithEmptySerial = {
        ...validPayload,
        base_board_sn: '',
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: validPayloadWithEmptySerial,
        },
      );

      expect(response.status()).toBe(200);

      const responseData = await response.json();

      expect(responseData).toEqual({ status: 'ok' });
    });
  });

  test.describe('Payload schema validation', () => {
    // Chýbajúce povinné pole by viedlo k neúplnému záznamu o stave zariadenia -
    // server ho musí odmietnuť, nie tiho akceptovať neúplné dáta.
    test('should reject payload with missing required field', async ({
      request,
    }) => {
      const invalidPayload = { ...validPayload };

      delete (invalidPayload as Partial<typeof validPayload>).computer_name;

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.status).toBe('error');
      expect(responseData.errors).toContain(
        'Missing required field: computer_name',
      );
    });

    // Overuje, že server odmietne polia mimo dohodnutej schémy namiesto ich
    // tichého akceptovania.
    test('should reject payload with unexpected root field', async ({
      request,
    }) => {
      const invalidPayload = {
        ...validPayload,
        unexpected_field: 'not allowed',
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);
      const responseData = await response.json();

      expect(responseData.status).toBe('error');
      expect(responseData.errors).toContain(
        'Unexpected field: unexpected_field',
      );
    });
  });

  test.describe('Device identifier validation', () => {
    // Overuje UUID formát agent_id, ktorý server používa ako identifikátor
    // agenta v healthcheck payloade.
    test('should reject invalid agent_id UUID', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        agent_id: 'not-a-valid-uuid',
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.status).toBe('error');
      expect(responseData.errors).toContain('Invalid UUID format: agent_id');
    });

    // Podobne ako agent_id ide o kľúčový hardvérový identifikátor - musí mať
    // platný formát, inak nie je možné zariadenie spoľahlivo identifikovať.
    test('should reject invalid system_product_uuid', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        system_product_uuid: '12345',
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.status).toBe('error');
      expect(responseData.errors).toContain(
        'Invalid UUID format: system_product_uuid',
      );
    });
  });

  test.describe('computer_name validation', () => {
    // Zabezpečuje typovú konzistenciu dát - nesprávny typ názvu počítača by
    // mohol spôsobiť chyby pri jeho ďalšom zobrazení alebo spracovaní.
    test('should reject non-string computer_name', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        computer_name: 123,
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain(
        'Invalid string field: computer_name',
      );
    });

    // Prázdny názov počítača by znemožnil identifikáciu zariadenia
    // v administrátorskom rozhraní.
    test('should reject empty computer_name', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        computer_name: '',
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain(
        'Invalid non-empty string field: computer_name',
      );
    });
  });

  test.describe('Operating system fields validation', () => {
    // Záporný build nie je platná verzia OS a server ho musí odmietnuť.
    test('should reject negative os_build', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        os_build: -1,
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain(
        'Invalid integer field: os_build',
      );
    });

    // Overuje požadovaný celočíselný typ hlavnej verzie OS.
    test('should reject decimal os_major', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        os_major: 10.5,
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain(
        'Invalid integer field: os_major',
      );
    });

    // Názov operačného systému je dôležitý pre diagnostiku a reporting -
    // prázdna hodnota by znížila vypovedaciu hodnotu healthchecku.
    test('should reject empty os_name', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        os_name: '',
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain(
        'Invalid non-empty string field: os_name',
      );
    });
  });

  test.describe('Timestamp validation', () => {
    // Časové údaje bez jednotnej časovej zóny (UTC) by viedli k nesprávnemu
    // vyhodnocovaniu času naprieč zariadeniami v rôznych lokalitách.
    test('should reject timestamp without UTC Z timezone', async ({
      request,
    }) => {
      const invalidPayload = {
        ...validPayload,
        last_boot_time: '2022-07-16T20:53:27+01:00',
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain(
        'Invalid UTC timestamp: last_boot_time',
      );
    });

    // Neplatný kalendárny dátum (napr. 30. február) by mohol spôsobiť pád
    // alebo nesprávne výpočty v systémoch, ktoré tieto dáta ďalej spracúvajú.
    test('should reject invalid calendar date', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        last_update_time: '2022-02-30T09:43:46Z',
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain(
        'Invalid UTC timestamp: last_update_time',
      );
    });
  });

  test.describe('adapter_info validation', () => {
    // Zariadenie musí hlásiť aspoň jeden sieťový adaptér - prázdne pole by
    // znamenalo chýbajúce sieťové informácie potrebné pre monitoring.
    test('should reject empty adapter_info', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        adapter_info: [],
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain(
        'Invalid adapter_info: expected a non-empty array',
      );
    });

    // Názov adaptéra je nutný na identifikáciu konkrétneho sieťového rozhrania
    // pri diagnostike sieťových problémov.
    test('should reject adapter without name', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        adapter_info: [
          {
            addresses: ['192.168.1.10'],
          },
        ],
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain('Invalid adapter name');
    });

    // Neplatná IP adresa by znemožnila správne sieťové vyhodnotenie a môže
    // indikovať chybu v zbere dát na strane agenta.
    test('should reject invalid IP address', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        adapter_info: [
          {
            name: 'Ethernet',
            addresses: ['999.999.999.999'],
          },
        ],
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain(
        'Invalid IP address: 999.999.999.999',
      );
    });
  });

  test.describe('session_info validation', () => {
    // Meno účtu je kľúčové pre identifikáciu, kto je v danej relácii
    // prihlásený - dôležité napr. pre bezpečnostný audit.
    test('should reject session without account_name', async ({
      request,
    }) => {
      const invalidPayload = {
        ...validPayload,
        session_info: [
          {
            account_sid: 'S-1-5-18',
            host_name: '',
            session_id: 0,
            session_name: 'Services',
            state: 'Disconnected',
          },
        ],
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain(
        'Missing session field: account_name',
      );
    });

    // Prázdny názov relácie by sťažil rozlíšenie jej typu (napr. Console
    // vs. Services) pri monitorovaní zariadenia.
    test('should reject empty session_name', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        session_info: [
          {
            ...validPayload.session_info[0],
            session_name: '',
          },
        ],
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain('Invalid session_name');
    });

    // Záporné ID relácie je neplatná hodnota, ktorá by mohla narušiť logiku
    // spracovania relácií na strane servera.
    test('should reject negative session_id', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        session_info: [
          {
            ...validPayload.session_info[0],
            session_id: -1,
          },
        ],
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain('Invalid session_id');
    });

    // Obmedzuje stav relácie na známu množinu hodnôt, aby nadväzujúce systémy
    // vedeli stav spoľahlivo interpretovať.
    test('should reject unsupported session state', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        session_info: [
          {
            ...validPayload.session_info[0],
            state: 'Unknown',
          },
        ],
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain('Invalid session state: Unknown');
    });
  });

  test.describe('roles validation', () => {
    // Zariadenie musí mať priradenú aspoň jednu rolu - bez nej by nebolo
    // možné zaradiť ho do správnej kategórie alebo politiky.
    test('should reject empty roles', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        roles: [],
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain(
        'Invalid roles: expected a non-empty array',
      );
    });

    // Overuje, že server prijíma iba hodnoty rolí z definovanej množiny,
    // ktorú môžu následné systémy spoľahlivo interpretovať.
    test('should reject unsupported role', async ({ request }) => {
      const invalidPayload = {
        ...validPayload,
        roles: ['hacker'],
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain('Invalid role: hacker');
    });

    // Zabezpečuje typovú konzistenciu - nesprávny typ poľa roles by mohol
    // spôsobiť chybu pri jeho spracovaní na strane servera.
    test('should reject roles that are not an array', async ({
      request,
    }) => {
      const invalidPayload = {
        ...validPayload,
        roles: 'workstation',
      };

      const response = await request.post(
        'http://localhost:3000/healthcheck',
        {
          data: invalidPayload,
        },
      );

      expect(response.status()).toBe(400);

      const responseData = await response.json();

      expect(responseData.errors).toContain(
        'Invalid roles: expected a non-empty array',
      );
    });
  });
});
