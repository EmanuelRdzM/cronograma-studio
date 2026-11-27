import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, code: error.code, details: error.details });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Datos inválidos',
      code: 'VALIDATION_ERROR',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }
  const prismaCode = (error as { code?: string })?.code;
  if (prismaCode === 'P2002') {
    res.status(409).json({ error: 'Ya existe un registro con esos datos', code: 'CONFLICT' });
    return;
  }
  if (prismaCode === 'P2025') {
    res.status(404).json({ error: 'No encontrado', code: 'NOT_FOUND' });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
}
