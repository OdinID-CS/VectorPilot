import { Router } from 'express';
import { leadController } from '../controllers/lead.controller.ts';

export const leadRouter = Router();

// Lead REST Endpoints
leadRouter.get('/', leadController.getLeads);
leadRouter.get('/:id', leadController.getLeadById);
leadRouter.post('/', leadController.createLead);
leadRouter.patch('/:id', leadController.updateLead);
leadRouter.delete('/:id', leadController.deleteLead);
