import type { IUserRepository } from '../repositories/user.repository.ts';
import { userRepository } from '../repositories/user.repository.ts';
import type { AuthUser } from '../../shared/types.ts';
import { UnauthorizedError } from '../errors/app.errors.ts';

export interface IAuthService {
  authenticateToken(token: string): Promise<AuthUser>;
}

export class AuthService implements IAuthService {
  constructor(private readonly userRepo: IUserRepository = userRepository) {}

  async authenticateToken(token: string): Promise<AuthUser> {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedError('Authentication token is required');
    }

    const user = await this.userRepo.findByToken(token.trim());
    if (!user) {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
    };
  }
}

export const authService = new AuthService();
