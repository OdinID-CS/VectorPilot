import type { Request, Response, NextFunction } from 'express';
import type { ILeadService } from '../services/lead.service.ts';
import { leadService } from '../services/lead.service.ts';
import type { IAILeadQualifier } from '../services/ai-lead-qualifier.service.ts';
import { aiLeadQualifierService } from '../services/ai-lead-qualifier.service.ts';
import {
  createLeadSchema,
  updateLeadSchema,
  leadIdParamSchema,
  leadFilterQuerySchema,
} from '../validators/lead.validator.ts';
import type { ApiResponse, Lead, LeadQualificationResult } from '../../shared/types.ts';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.ts';

export class LeadController {
  constructor(
    private readonly service: ILeadService = leadService,
    private readonly aiQualifier: IAILeadQualifier = aiLeadQualifierService
  ) {}

  getLeads = async (req: Request, res: Response<ApiResponse<Lead[]>>, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthenticatedRequest).user;
      const parsedQuery = leadFilterQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUERY_PARAMS',
            message: 'Invalid filter or query parameters',
            details: parsedQuery.error.format(),
          },
        });
        return;
      }

      const leads = await this.service.getLeads(organizationId, parsedQuery.data);
      res.status(200).json({
        success: true,
        data: leads,
      });
    } catch (error) {
      next(error);
    }
  };

  getLeadById = async (req: Request, res: Response<ApiResponse<Lead>>, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthenticatedRequest).user;
      const parsedParams = leadIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Lead ID must be a positive integer',
            details: parsedParams.error.format(),
          },
        });
        return;
      }

      const lead = await this.service.getLeadById(organizationId, parsedParams.data.id);
      res.status(200).json({
        success: true,
        data: lead,
      });
    } catch (error) {
      next(error);
    }
  };

  createLead = async (req: Request, res: Response<ApiResponse<Lead>>, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, id: userId } = (req as AuthenticatedRequest).user;
      const parsedBody = createLeadSchema.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid lead payload',
            details: parsedBody.error.format(),
          },
        });
        return;
      }

      const createdLead = await this.service.createLead(organizationId, userId, parsedBody.data);
      res.status(201).json({
        success: true,
        data: createdLead,
      });
    } catch (error) {
      next(error);
    }
  };

  updateLead = async (req: Request, res: Response<ApiResponse<Lead>>, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthenticatedRequest).user;
      const parsedParams = leadIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Lead ID must be a positive integer',
            details: parsedParams.error.format(),
          },
        });
        return;
      }

      const parsedBody = updateLeadSchema.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid update payload',
            details: parsedBody.error.format(),
          },
        });
        return;
      }

      const updatedLead = await this.service.updateLead(organizationId, parsedParams.data.id, parsedBody.data);
      res.status(200).json({
        success: true,
        data: updatedLead,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteLead = async (req: Request, res: Response<ApiResponse<{ message: string; id: number }>>, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthenticatedRequest).user;
      const parsedParams = leadIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Lead ID must be a positive integer',
            details: parsedParams.error.format(),
          },
        });
        return;
      }

      await this.service.deleteLead(organizationId, parsedParams.data.id);
      res.status(200).json({
        success: true,
        data: {
          message: `Lead ${parsedParams.data.id} successfully deleted`,
          id: parsedParams.data.id,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  qualifyLead = async (
    req: Request,
    res: Response<ApiResponse<LeadQualificationResult>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { organizationId } = (req as AuthenticatedRequest).user;
      const parsedParams = leadIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Lead ID must be a positive integer',
            details: parsedParams.error.format(),
          },
        });
        return;
      }

      const lead = await this.service.getLeadById(organizationId, parsedParams.data.id);
      const qualification = await this.aiQualifier.qualifyLead(lead);

      res.status(200).json({
        success: true,
        data: qualification,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const leadController = new LeadController();
