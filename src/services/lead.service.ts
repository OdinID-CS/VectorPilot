import type { ILeadRepository } from '../repositories/lead.repository.ts';
import { leadRepository } from '../repositories/lead.repository.ts';
import type { LeadRecord } from '../db/schema.ts';
import { LeadStatus, type Lead, type CreateLeadDTO, type UpdateLeadDTO, type LeadFilterQuery } from '../../shared/types.ts';
import { NotFoundError, ConflictError, ValidationError } from '../errors/app.errors.ts';

export interface ILeadService {
  getLeads(filters?: LeadFilterQuery): Promise<Lead[]>;
  getLeadById(id: number): Promise<Lead>;
  createLead(dto: CreateLeadDTO): Promise<Lead>;
  updateLead(id: number, dto: UpdateLeadDTO): Promise<Lead>;
  deleteLead(id: number): Promise<void>;
}

export class LeadService implements ILeadService {
  constructor(private readonly repo: ILeadRepository = leadRepository) {}

  private mapRecordToDomain(record: LeadRecord): Lead {
    return {
      id: record.id,
      firstName: record.firstName,
      lastName: record.lastName,
      email: record.email,
      phone: record.phone,
      company: record.company,
      source: record.source,
      status: record.status as LeadStatus,
      score: record.score,
      notes: record.notes,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async getLeads(filters?: LeadFilterQuery): Promise<Lead[]> {
    const records = await this.repo.findAll(filters);
    return records.map(record => this.mapRecordToDomain(record));
  }

  async getLeadById(id: number): Promise<Lead> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundError(`Lead with ID ${id} not found`);
    }
    return this.mapRecordToDomain(record);
  }

  async createLead(dto: CreateLeadDTO): Promise<Lead> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Prevent duplicate lead submission by email
    const existing = await this.repo.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError(`A lead with email "${normalizedEmail}" already exists`);
    }

    // Business validation: Score range
    const score = dto.score ?? 0;
    if (score < 0 || score > 100) {
      throw new ValidationError('Lead score must be between 0 and 100');
    }

    const createdRecord = await this.repo.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email: normalizedEmail,
      phone: dto.phone?.trim() || null,
      company: dto.company?.trim() || null,
      source: dto.source?.trim() || null,
      status: dto.status || LeadStatus.NEW,
      score,
      notes: dto.notes?.trim() || null,
    });

    return this.mapRecordToDomain(createdRecord);
  }

  async updateLead(id: number, dto: UpdateLeadDTO): Promise<Lead> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Lead with ID ${id} not found`);
    }

    if (dto.email) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== existing.email.toLowerCase()) {
        const leadWithEmail = await this.repo.findByEmail(normalizedEmail);
        if (leadWithEmail && leadWithEmail.id !== id) {
          throw new ConflictError(`A lead with email "${normalizedEmail}" already exists`);
        }
      }
    }

    if (dto.score !== undefined && (dto.score < 0 || dto.score > 100)) {
      throw new ValidationError('Lead score must be between 0 and 100');
    }

    const updatedRecord = await this.repo.update(id, {
      ...(dto.firstName !== undefined && { firstName: dto.firstName.trim() }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName.trim() }),
      ...(dto.email !== undefined && { email: dto.email.trim().toLowerCase() }),
      ...(dto.phone !== undefined && { phone: dto.phone ? dto.phone.trim() : null }),
      ...(dto.company !== undefined && { company: dto.company ? dto.company.trim() : null }),
      ...(dto.source !== undefined && { source: dto.source ? dto.source.trim() : null }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.score !== undefined && { score: dto.score }),
      ...(dto.notes !== undefined && { notes: dto.notes ? dto.notes.trim() : null }),
    });

    if (!updatedRecord) {
      throw new NotFoundError(`Lead with ID ${id} not found`);
    }

    return this.mapRecordToDomain(updatedRecord);
  }

  async deleteLead(id: number): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Lead with ID ${id} not found`);
    }

    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Lead with ID ${id} not found`);
    }
  }
}

export const leadService = new LeadService();
