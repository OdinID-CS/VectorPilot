import { Router } from 'express';
import { leadController } from '../controllers/lead.controller.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';

export const leadRouter = Router();

// Enforce authentication on all /api/leads routes
leadRouter.use(requireAuth);

// Lead REST Endpoints
leadRouter.get('/', leadController.getLeads);
leadRouter.get('/:id', leadController.getLeadById);
leadRouter.post('/', leadController.createLead);
leadRouter.post('/:id/qualify', leadController.qualifyLead);
leadRouter.patch('/:id', leadController.updateLead);
leadRouter.delete('/:id', leadController.deleteLead);
