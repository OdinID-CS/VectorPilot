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
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from '../src/errors/app.errors.ts';

// In-Memory Repository for isolated unit tests of business logic and tenant isolation
class MockLeadRepository implements ILeadRepository {
  private leads: LeadRecord[] = [];
  private nextId = 1;

  async findAll(organizationId: number): Promise<LeadRecord[]> {
    return this.leads.filter(l => l.organizationId === organizationId);
  }

  async findById(organizationId: number, id: number): Promise<LeadRecord | null> {
    return this.leads.find(l => l.organizationId === organizationId && l.id === id) || null;
  }

  async findByEmail(organizationId: number, email: string): Promise<LeadRecord | null> {
    return (
      this.leads.find(
        l => l.organizationId === organizationId && l.email.toLowerCase() === email.toLowerCase()
      ) || null
    );
  }

  async existsInAnyOrganization(id: number): Promise<boolean> {
    return this.leads.some(l => l.id === id);
  }

  async create(organizationId: number, data: Omit<NewLeadRecord, 'organizationId'>): Promise<LeadRecord> {
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
      organizationId,
      createdById: data.createdById ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.leads.push(record);
    return record;
  }

  async update(organizationId: number, id: number, data: Partial<NewLeadRecord>): Promise<LeadRecord | null> {
    const index = this.leads.findIndex(l => l.organizationId === organizationId && l.id === id);
    if (index === -1) return null;

    const existing = this.leads[index];
    const { organizationId: _ignored, ...safeData } = data;
    const updated: LeadRecord = {
      ...existing,
      ...safeData,
      updatedAt: new Date(),
    };
    this.leads[index] = updated;
    return updated;
  }

  async delete(organizationId: number, id: number): Promise<boolean> {
    const initialLen = this.leads.length;
    this.leads = this.leads.filter(l => !(l.organizationId === organizationId && l.id === id));
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

describe('Lead Service & Multi-Tenant Authorization Layer', () => {
  const ORG_1 = 1;
  const USER_1 = 10;
  const ORG_2 = 2;
  const USER_2 = 20;

  it('creates a lead successfully with organization ownership', async () => {
    const repo = new MockLeadRepository();
    const service = new LeadService(repo);

    const lead = await service.createLead(ORG_1, USER_1, {
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
    assert.equal(lead.organizationId, ORG_1);
    assert.equal(lead.createdById, USER_1);
  });

  it('prevents duplicate submissions with the same email within the same organization', async () => {
    const repo = new MockLeadRepository();
    const service = new LeadService(repo);

    await service.createLead(ORG_1, USER_1, {
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah@resistance.org',
    });

    await assert.rejects(
      async () => {
        await service.createLead(ORG_1, USER_1, {
          firstName: 'Another',
          lastName: 'Sarah',
          email: 'SARAH@resistance.org', // Case-insensitive duplicate in Org 1
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ConflictError);
        assert.equal(err.statusCode, 409);
        return true;
      }
    );
  });

  it('allows identical lead email across different organizations', async () => {
    const repo = new MockLeadRepository();
    const service = new LeadService(repo);

    const lead1 = await service.createLead(ORG_1, USER_1, {
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah@universal.org',
    });

    const lead2 = await service.createLead(ORG_2, USER_2, {
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah@universal.org', // Same email in Org 2
    });

    assert.equal(lead1.organizationId, ORG_1);
    assert.equal(lead2.organizationId, ORG_2);
    assert.notEqual(lead1.id, lead2.id);
  });

  it('allows authenticated user to access own organization lead', async () => {
    const repo = new MockLeadRepository();
    const service = new LeadService(repo);

    const created = await service.createLead(ORG_1, USER_1, {
      firstName: 'Alex',
      lastName: 'Murphy',
      email: 'alex@ocp.com',
    });

    const found = await service.getLeadById(ORG_1, created.id);
    assert.equal(found.id, created.id);
    assert.equal(found.firstName, 'Alex');
    assert.equal(found.organizationId, ORG_1);
  });

  it('rejects authenticated user attempting another organization lead with ForbiddenError (403)', async () => {
    const repo = new MockLeadRepository();
    const service = new LeadService(repo);

    // Lead belongs to ORG_1
    const createdOrg1 = await service.createLead(ORG_1, USER_1, {
      firstName: 'Alex',
      lastName: 'Murphy',
      email: 'alex@ocp.com',
    });

    // User in ORG_2 attempts to access ORG_1 lead
    await assert.rejects(
      async () => {
        await service.getLeadById(ORG_2, createdOrg1.id);
      },
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenError);
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  });

  it('returns NotFoundError (404) for lead that does not exist anywhere', async () => {
    const repo = new MockLeadRepository();
    const service = new LeadService(repo);

    await assert.rejects(
      async () => {
        await service.getLeadById(ORG_1, 999999);
      },
      (err: unknown) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  it('enforces tenant isolation on update (cannot update another org lead)', async () => {
    const repo = new MockLeadRepository();
    const service = new LeadService(repo);

    const org1Lead = await service.createLead(ORG_1, USER_1, {
      firstName: 'Lead',
      lastName: 'Org1',
      email: 'lead1@test.com',
      score: 10,
    });

    // User in ORG_2 attempts to update ORG_1 lead
    await assert.rejects(
      async () => {
        await service.updateLead(ORG_2, org1Lead.id, {
          score: 80,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenError);
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    // User in ORG_1 can update successfully
    const updated = await service.updateLead(ORG_1, org1Lead.id, {
      score: 80,
    });
    assert.equal(updated.score, 80);
  });

  it('enforces tenant isolation on delete (cannot delete another org lead)', async () => {
    const repo = new MockLeadRepository();
    const service = new LeadService(repo);

    const org1Lead = await service.createLead(ORG_1, USER_1, {
      firstName: 'Temp',
      lastName: 'Lead',
      email: 'temp@test.com',
    });

    // User in ORG_2 attempts to delete ORG_1 lead
    await assert.rejects(
      async () => {
        await service.deleteLead(ORG_2, org1Lead.id);
      },
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenError);
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    // User in ORG_1 can delete successfully
    await service.deleteLead(ORG_1, org1Lead.id);

    // Subsequent get throws NotFoundError
    await assert.rejects(
      async () => {
        await service.getLeadById(ORG_1, org1Lead.id);
      },
      (err: unknown) => {
        assert.ok(err instanceof NotFoundError);
        return true;
      }
    );
  });
});
