import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLeadSchema,
  updateLeadSchema,
  leadIdParamSchema,
} from '../src/validators/lead.validator.ts';
import { LeadService } from '../src/services/lead.service.ts';
import type { ILeadRepository } from '../src/repositories/lead.repository.ts';
import type { LeadRecord, NewLeadRecord } from '../src/db/schema.ts';
import { LeadStatus } from '../shared/types.ts';
import { ConflictError, NotFoundError, ValidationError } from '../src/errors/app.errors.ts';

// In-Memory Repository for isolated unit tests of business logic
class MockLeadRepository implements ILeadRepository {
  private leads: LeadRecord[] = [];
  private nextId = 1;

  async findAll(): Promise<LeadRecord[]> {
    return [...this.leads];
  }

  async findById(id: number): Promise<LeadRecord | null> {
    return this.leads.find(l => l.id === id) || null;
  }

  async findByEmail(email: string): Promise<LeadRecord | null> {
    return this.leads.find(l => l.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async create(data: NewLeadRecord): Promise<LeadRecord> {
    const record: LeadRecord = {
      id: this.nextId++,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone ?? null,
      company: data.company ?? null,
      source: data.source ?? null,
      status: data.status ?? 'NEW',
      score: data.score ?? 0,
      notes: data.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.leads.push(record);
    return record;
  }

  async update(id: number, data: Partial<NewLeadRecord>): Promise<LeadRecord | null> {
    const index = this.leads.findIndex(l => l.id === id);
    if (index === -1) return null;

    const existing = this.leads[index];
    const updated: LeadRecord = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.leads[index] = updated;
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const initialLen = this.leads.length;
    this.leads = this.leads.filter(l => l.id !== id);
    return this.leads.length < initialLen;
  }
}

describe('Lead Validation Layer', () => {
  it('validates correct lead creation payload', () => {
    const validPayload = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@acme.com',
      company: 'Acme Corp',
      status: LeadStatus.NEW,
      score: 85,
    };
    const result = createLeadSchema.safeParse(validPayload);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.email, 'jane.doe@acme.com');
      assert.equal(result.data.score, 85);
    }
  });

  it('rejects invalid email formats', () => {
    const invalidPayload = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'not-an-email',
    };
    const result = createLeadSchema.safeParse(invalidPayload);
    assert.equal(result.success, false);
  });

  it('rejects missing required fields (firstName/lastName)', () => {
    const invalidPayload = {
      email: 'test@example.com',
    };
    const result = createLeadSchema.safeParse(invalidPayload);
    assert.equal(result.success, false);
  });

  it('rejects lead scores outside [0, 100]', () => {
    const tooHigh = createLeadSchema.safeParse({
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
      score: 150,
    });
    assert.equal(tooHigh.success, false);

    const tooLow = createLeadSchema.safeParse({
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
      score: -10,
    });
    assert.equal(tooLow.success, false);
  });

  it('rejects empty update payloads', () => {
    const emptyUpdate = updateLeadSchema.safeParse({});
    assert.equal(emptyUpdate.success, false);
  });

  it('validates positive numeric IDs and rejects non-numeric', () => {
    const valid = leadIdParamSchema.safeParse({ id: '42' });
    assert.equal(valid.success, true);
    if (valid.success) {
      assert.equal(valid.data.id, 42);
    }

    const invalid = leadIdParamSchema.safeParse({ id: 'abc' });
    assert.equal(invalid.success, false);
  });
});

describe('Lead Service & Business Logic Layer', () => {
  it('creates a lead successfully', async () => {
    const repo = new MockLeadRepository();
    const service = new LeadService(repo);

    const lead = await service.createLead({
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah@resistance.org',
      company: 'Cyberdyne',
      score: 95,
      status: LeadStatus.QUALIFIED,
    });

    assert.equal(lead.id, 1);
    assert.equal(lead.firstName, 'Sarah');
    assert.equal(lead.email, 'sarah@resistance.org');
    assert.equal(lead.status, LeadStatus.QUALIFIED);
  });

  it('prevents duplicate submissions with the same email (ConflictError 409)', async () => {
    const repo = new MockLeadRepository();
    const service = new LeadService(repo);

    await service.createLead({
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah@resistance.org',
    });

    await assert.rejects(
      async () => {
        await service.createLead({
          firstName: 'Another',
          lastName: 'Sarah',
          email: 'SARAH@resistance.org', // Case-insensitive duplicate
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ConflictError);
        assert.equal(err.statusCode, 409);
        return true;
      }
    );
  });

  it('fetches lead by ID and throws NotFoundError for unknown IDs', async () => {
    const repo = new MockLeadRepository();
    const service = new LeadService(repo);

    const created = await service.createLead({
      firstName: 'Alex',
      lastName: 'Murphy',
      email: 'alex@ocp.com',
    });

    const found = await service.getLeadById(created.id);
    assert.equal(found.id, created.id);
    assert.equal(found.firstName, 'Alex');

    await assert.rejects(
      async () => {
        await service.getLeadById(999);
      },
      (err: unknown) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  it('updates lead fields and handles email uniqueness', async () => {
    const repo = new MockLeadRepository();
    const service = new LeadService(repo);

    const lead1 = await service.createLead({
      firstName: 'Lead',
      lastName: 'One',
      email: 'one@test.com',
      score: 10,
    });

    const lead2 = await service.createLead({
      firstName: 'Lead',
      lastName: 'Two',
      email: 'two@test.com',
      score: 20,
    });

    // Update status and score
    const updated = await service.updateLead(lead1.id, {
      status: LeadStatus.CONTACTED,
      score: 60,
    });
    assert.equal(updated.status, LeadStatus.CONTACTED);
    assert.equal(updated.score, 60);

    // Attempting to update lead2 email to lead1 email should throw ConflictError
    await assert.rejects(
      async () => {
        await service.updateLead(lead2.id, {
          email: 'one@test.com',
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ConflictError);
        return true;
      }
    );
  });

  it('deletes lead and throws NotFoundError for subsequent operations', async () => {
    const repo = new MockLeadRepository();
    const service = new LeadService(repo);

    const lead = await service.createLead({
      firstName: 'Temp',
      lastName: 'User',
      email: 'temp@test.com',
    });

    await service.deleteLead(lead.id);

    await assert.rejects(
      async () => {
        await service.getLeadById(lead.id);
      },
      (err: unknown) => {
        assert.ok(err instanceof NotFoundError);
        return true;
      }
    );
  });
});
