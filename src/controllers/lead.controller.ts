import type { Request, Response, NextFunction } from 'express';
import type { ILeadService } from '../services/lead.service.ts';
import { leadService } from '../services/lead.service.ts';
import {
  createLeadSchema,
  updateLeadSchema,
  leadIdParamSchema,
  leadFilterQuerySchema,
} from '../validators/lead.validator.ts';
import { AppError } from '../errors/app.errors.ts';
import type { ApiResponse, Lead } from '../../shared/types.ts';

export class LeadController {
  constructor(private readonly service: ILeadService = leadService) {}

  getLeads = async (req: Request, res: Response<ApiResponse<Lead[]>>, next: NextFunction): Promise<void> => {
    try {
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

      const leads = await this.service.getLeads(parsedQuery.data);
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

      const lead = await this.service.getLeadById(parsedParams.data.id);
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

      const createdLead = await this.service.createLead(parsedBody.data);
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

      const updatedLead = await this.service.updateLead(parsedParams.data.id, parsedBody.data);
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

      await this.service.deleteLead(parsedParams.data.id);
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
}

export const leadController = new LeadController();

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response<ApiResponse<never>>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error('Unhandled request error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Safe fallback to avoid leaking database internals or stack trace
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred',
    },
  });
}
