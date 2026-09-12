import { eq, ilike, or, and, gte, lte, desc, asc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { leads, type LeadRecord, type NewLeadRecord } from '../db/schema.ts';
import { DatabaseError, ConflictError } from '../errors/app.errors.ts';
import type { LeadFilterQuery } from '../../shared/types.ts';

const SORTABLE_COLUMNS = {
  createdAt: leads.createdAt,
  score: leads.score,
  firstName: leads.firstName,
  company: leads.company,
} as const;

export interface ILeadRepository {
  findAll(organizationId: number, filters?: LeadFilterQuery): Promise<LeadRecord[]>;
  findById(organizationId: number, id: number): Promise<LeadRecord | null>;
  findByEmail(organizationId: number, email: string): Promise<LeadRecord | null>;
  existsInAnyOrganization(id: number): Promise<boolean>;
  create(organizationId: number, data: Omit<NewLeadRecord, 'organizationId'>): Promise<LeadRecord>;
  update(organizationId: number, id: number, data: Partial<NewLeadRecord>): Promise<LeadRecord | null>;
  delete(organizationId: number, id: number): Promise<boolean>;
}

export class LeadRepository implements ILeadRepository {
  async findAll(organizationId: number, filters?: LeadFilterQuery): Promise<LeadRecord[]> {
    try {
      const conditions = [eq(leads.organizationId, organizationId)];

      if (filters?.status) {
        conditions.push(eq(leads.status, filters.status));
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(
          or(
            ilike(leads.firstName, searchTerm),
            ilike(leads.lastName, searchTerm),
            ilike(leads.email, searchTerm),
            ilike(leads.company, searchTerm)
          )
        );
      }

      if (filters?.minScore !== undefined) {
        conditions.push(gte(leads.score, filters.minScore));
      }

      if (filters?.maxScore !== undefined) {
        conditions.push(lte(leads.score, filters.maxScore));
      }

      let query = db.select().from(leads);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const sortColumn = (filters?.sortBy && SORTABLE_COLUMNS[filters.sortBy]) || leads.createdAt;
      const orderFn = filters?.sortOrder === 'asc' ? asc : desc;

      const results = await query.orderBy(orderFn(sortColumn));
      return results;
    } catch (error) {
      console.error('Database query failed in findAll:', error);
      throw new DatabaseError('Failed to fetch leads from database', { cause: error });
    }
  }

  async findById(organizationId: number, id: number): Promise<LeadRecord | null> {
    try {
      const results = await db
        .select()
        .from(leads)
        .where(and(eq(leads.organizationId, organizationId), eq(leads.id, id)))
        .limit(1);
      return results[0] || null;
    } catch (error) {
      console.error(`Database query failed in findById(${id}):`, error);
      throw new DatabaseError(`Failed to fetch lead with id ${id}`, { cause: error });
    }
  }

  async findByEmail(organizationId: number, email: string): Promise<LeadRecord | null> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const results = await db
        .select()
        .from(leads)
        .where(and(eq(leads.organizationId, organizationId), ilike(leads.email, normalizedEmail)))
        .limit(1);
      return results[0] || null;
    } catch (error) {
      console.error(`Database query failed in findByEmail(${email}):`, error);
      throw new DatabaseError('Failed to query lead by email', { cause: error });
    }
  }

  async existsInAnyOrganization(id: number): Promise<boolean> {
    try {
      const results = await db
        .select({ id: leads.id })
        .from(leads)
        .where(eq(leads.id, id))
        .limit(1);
      return results.length > 0;
    } catch (error) {
      console.error(`Database query failed in existsInAnyOrganization(${id}):`, error);
      throw new DatabaseError(`Failed to check lead existence with id ${id}`, { cause: error });
    }
  }

  async create(organizationId: number, data: Omit<NewLeadRecord, 'organizationId'>): Promise<LeadRecord> {
    try {
      const result = await db
        .insert(leads)
        .values({
          ...data,
          organizationId,
          email: data.email.trim().toLowerCase(),
          updatedAt: new Date(),
        })
        .returning();

      return result[0];
    } catch (error: unknown) {
      console.error('Database insert failed in create:', error);
      // Check for PostgreSQL unique constraint violation (code '23505')
      const pgError = error as { code?: string };
      if (pgError?.code === '23505') {
        throw new ConflictError('A lead with this email address already exists in this organization');
      }
      throw new DatabaseError('Failed to create lead in database', { cause: error });
    }
  }

  async update(organizationId: number, id: number, data: Partial<NewLeadRecord>): Promise<LeadRecord | null> {
    try {
      // Prevent caller from overriding tenant ownership
      const { organizationId: _ignored, ...safeData } = data;
      const updatePayload: Partial<NewLeadRecord> = {
        ...safeData,
        updatedAt: new Date(),
      };
      if (safeData.email) {
        updatePayload.email = safeData.email.trim().toLowerCase();
      }

      const result = await db
        .update(leads)
        .set(updatePayload)
        .where(and(eq(leads.organizationId, organizationId), eq(leads.id, id)))
        .returning();

      return result[0] || null;
    } catch (error: unknown) {
      console.error(`Database update failed in update(${id}):`, error);
      const pgError = error as { code?: string };
      if (pgError?.code === '23505') {
        throw new ConflictError('A lead with this email address already exists in this organization');
      }
      throw new DatabaseError(`Failed to update lead with id ${id}`, { cause: error });
    }
  }

  async delete(organizationId: number, id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(leads)
        .where(and(eq(leads.organizationId, organizationId), eq(leads.id, id)))
        .returning({ id: leads.id });
      return result.length > 0;
    } catch (error) {
      console.error(`Database delete failed in delete(${id}):`, error);
      throw new DatabaseError(`Failed to delete lead with id ${id}`, { cause: error });
    }
  }
}

export const leadRepository = new LeadRepository();
