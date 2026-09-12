import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../../shared/types.ts';
import { UnauthorizedError } from '../errors/app.errors.ts';
import { authService, type IAuthService } from '../services/auth.service.ts';

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export function createAuthMiddleware(service: IAuthService = authService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedError('Authentication token is required');
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
        throw new UnauthorizedError('Authorization header format must be Bearer <token>');
      }

      const token = parts[1];
      const user = await service.authenticateToken(token);

      (req as AuthenticatedRequest).user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireAuth = createAuthMiddleware();
