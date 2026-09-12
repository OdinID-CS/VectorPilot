import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../src/app.ts';
import { pool } from '../src/db/index.ts';
import type { ApiResponse, Lead } from '../shared/types.ts';

describe('VectorPilot REST API Endpoints', () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
    const app = await createApp();
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

  it('GET /api/health returns 200 OK', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json() as { status: string };
    assert.equal(body.status, 'ok');
  });

  it('POST /api/leads validates input and returns 400 on invalid payload', async () => {
    const res = await fetch(`${baseUrl}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: '',
        email: 'invalid-email',
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json() as ApiResponse<never>;
    assert.equal(body.success, false);
    assert.equal(body.error?.code, 'VALIDATION_FAILED');
  });

  it('GET /api/leads/:id returns 400 on non-numeric ID', async () => {
    const res = await fetch(`${baseUrl}/api/leads/not-a-number`);
    assert.equal(res.status, 400);
    const body = await res.json() as ApiResponse<never>;
    assert.equal(body.success, false);
    assert.equal(body.error?.code, 'INVALID_ID');
  });

  it('GET /api/leads returns 200 array', async () => {
    const res = await fetch(`${baseUrl}/api/leads`);
    assert.equal(res.status, 200);
    const body = await res.json() as ApiResponse<Lead[]>;
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
  });
});
