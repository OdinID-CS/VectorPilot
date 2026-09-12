import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../src/app.ts';
import { pool } from '../src/db/index.ts';
import type { ApiResponse, Lead } from '../shared/types.ts';

describe('LeadPilot REST API Endpoints & Multi-Tenant Authorization', () => {
  let server: Server;
  let baseUrl: string;

  const ACME_TOKEN = 'leadpilot_demo_token_acme_2026';
  const CYBERDYNE_TOKEN = 'leadpilot_test_token_cyberdyne_2026';
  const INVALID_TOKEN = 'completely_invalid_token';

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await pool.end();
  });

  it('GET /api/health returns 200 OK without authentication', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { status: string; service: string };
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'LeadPilot API');
  });

  it('rejects unauthenticated request to /api/leads with 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/api/leads`);
    assert.equal(res.status, 401);
    const body = (await res.json()) as ApiResponse<never>;
    assert.equal(body.success, false);
    assert.equal(body.error?.code, 'UNAUTHORIZED');
  });

  it('rejects invalid Bearer token with 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/api/leads`, {
      headers: {
        Authorization: `Bearer ${INVALID_TOKEN}`,
      },
    });
    assert.equal(res.status, 401);
    const body = (await res.json()) as ApiResponse<never>;
    assert.equal(body.success, false);
    assert.equal(body.error?.code, 'UNAUTHORIZED');
  });

  it('allows authenticated user with valid Bearer token to GET /api/leads', async () => {
    const res = await fetch(`${baseUrl}/api/leads`, {
      headers: {
        Authorization: `Bearer ${ACME_TOKEN}`,
      },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as ApiResponse<Lead[]>;
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
  });

  it('POST /api/leads validates input and returns 400 on invalid payload', async () => {
    const res = await fetch(`${baseUrl}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACME_TOKEN}`,
      },
      body: JSON.stringify({
        firstName: '',
        email: 'invalid-email',
      }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as ApiResponse<never>;
    assert.equal(body.success, false);
    assert.equal(body.error?.code, 'VALIDATION_FAILED');
  });

  it('GET /api/leads/:id returns 400 on non-numeric ID', async () => {
    const res = await fetch(`${baseUrl}/api/leads/not-a-number`, {
      headers: {
        Authorization: `Bearer ${ACME_TOKEN}`,
      },
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as ApiResponse<never>;
    assert.equal(body.success, false);
    assert.equal(body.error?.code, 'INVALID_ID');
  });

  it('creates lead with tenant ownership and ignores client-supplied spoofed organizationId', async () => {
    const testEmail = `tenant-test-${Date.now()}@acme-corp.com`;
    const res = await fetch(`${baseUrl}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACME_TOKEN}`,
      },
      body: JSON.stringify({
        firstName: 'Authorized',
        lastName: 'Lead',
        email: testEmail,
        company: 'Acme Partner',
        score: 75,
        // Attacker attempts to spoof organizationId and createdById:
        organizationId: 99999,
        createdById: 88888,
      }),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as ApiResponse<Lead>;
    assert.equal(body.success, true);
    assert.ok(body.data);
    assert.equal(body.data.email, testEmail);
    // Verified: identity derived strictly from session, spoofed org 99999 ignored
    assert.equal(body.data.organizationId, 1); // Acme is org 1
    assert.equal(body.data.createdById, 1); // Alice is user 1
  });

  it('enforces multi-tenant isolation: user from Cyberdyne cannot access Acme lead (403 FORBIDDEN)', async () => {
    // 1. Acme creates a proprietary lead
    const acmeLeadEmail = `secret-acme-${Date.now()}@defense.org`;
    const createRes = await fetch(`${baseUrl}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACME_TOKEN}`,
      },
      body: JSON.stringify({
        firstName: 'Confidential',
        lastName: 'Prospect',
        email: acmeLeadEmail,
        score: 90,
      }),
    });
    assert.equal(createRes.status, 201);
    const createBody = (await createRes.json()) as ApiResponse<Lead>;
    const acmeLeadId = createBody.data.id;

    // 2. Cyberdyne user attempts to GET Acme's lead
    const getRes = await fetch(`${baseUrl}/api/leads/${acmeLeadId}`, {
      headers: {
        Authorization: `Bearer ${CYBERDYNE_TOKEN}`,
      },
    });
    assert.equal(getRes.status, 403);
    const getBody = (await getRes.json()) as ApiResponse<never>;
    assert.equal(getBody.success, false);
    assert.equal(getBody.error?.code, 'FORBIDDEN');

    // 3. Cyberdyne user attempts to UPDATE Acme's lead
    const updateRes = await fetch(`${baseUrl}/api/leads/${acmeLeadId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CYBERDYNE_TOKEN}`,
      },
      body: JSON.stringify({ score: 10 }),
    });
    assert.equal(updateRes.status, 403);

    // 4. Cyberdyne user attempts to DELETE Acme's lead
    const deleteRes = await fetch(`${baseUrl}/api/leads/${acmeLeadId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${CYBERDYNE_TOKEN}`,
      },
    });
    assert.equal(deleteRes.status, 403);

    // 5. Cyberdyne user attempts to QUALIFY Acme's lead
    const qualifyRes = await fetch(`${baseUrl}/api/leads/${acmeLeadId}/qualify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CYBERDYNE_TOKEN}`,
      },
    });
    assert.equal(qualifyRes.status, 403);

    // 6. Acme user CAN access their own lead
    const acmeGetRes = await fetch(`${baseUrl}/api/leads/${acmeLeadId}`, {
      headers: {
        Authorization: `Bearer ${ACME_TOKEN}`,
      },
    });
    assert.equal(acmeGetRes.status, 200);
    const acmeGetBody = (await acmeGetRes.json()) as ApiResponse<Lead>;
    assert.equal(acmeGetBody.data.id, acmeLeadId);
  });

  it('returns 404 NOT_FOUND when lead ID does not exist in any organization', async () => {
    const res = await fetch(`${baseUrl}/api/leads/99999999`, {
      headers: {
        Authorization: `Bearer ${ACME_TOKEN}`,
      },
    });
    assert.equal(res.status, 404);
    const body = (await res.json()) as ApiResponse<never>;
    assert.equal(body.success, false);
    assert.equal(body.error?.code, 'NOT_FOUND');
  });
});
