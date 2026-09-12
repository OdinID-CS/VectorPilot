import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { users, type UserRecord } from '../db/schema.ts';
import { DatabaseError } from '../errors/app.errors.ts';

export interface IUserRepository {
  findByToken(token: string): Promise<UserRecord | null>;
  findById(id: number): Promise<UserRecord | null>;
}

export class UserRepository implements IUserRepository {
  async findByToken(token: string): Promise<UserRecord | null> {
    try {
      const results = await db.select().from(users).where(eq(users.token, token)).limit(1);
      return results[0] || null;
    } catch (error) {
      console.error('Database query failed in findByToken:', error);
      throw new DatabaseError('Failed to query user by token', { cause: error });
    }
  }

  async findById(id: number): Promise<UserRecord | null> {
    try {
      const results = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return results[0] || null;
    } catch (error) {
      console.error(`Database query failed in findById(${id}):`, error);
      throw new DatabaseError(`Failed to fetch user with id ${id}`, { cause: error });
    }
  }
}

export const userRepository = new UserRepository();
