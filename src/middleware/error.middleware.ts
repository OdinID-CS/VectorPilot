import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app.errors.ts';
import type { ApiResponse } from '../../shared/types.ts';

/**
 * Centralized Express Error Handling Middleware.
 * Prevents information leakage (sanitizes database causes) and formats consistent API error envelopes.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response<ApiResponse<never>>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error('API Error Encountered:', err);

  if (err instanceof AppError) {
    // Sanitize details: never leak internal error causes or database stacks
    let safeDetails = err.details;
    if (safeDetails && typeof safeDetails === 'object' && 'cause' in safeDetails) {
      safeDetails = undefined;
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: safeDetails,
      },
    });
    return;
  }

  // Generic unhandled exception fallback
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred',
    },
  });
}
