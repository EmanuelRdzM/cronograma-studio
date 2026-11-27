import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { prisma } from './db.js';
import { HttpError } from './http.js';

export interface AuthPayload {
  sub: string;
  email: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '30d' });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Debes iniciar sesión', 'UNAUTHENTICATED');
    }
    const token = header.slice(7);
    const decoded = jwt.verify(token, env.jwtSecret) as AuthPayload;
    const user = await prisma.user.findUnique({ where: { id: decoded.sub }, select: { id: true } });
    if (!user) throw new HttpError(401, 'Sesión inválida', 'UNAUTHENTICATED');
    req.userId = user.id;
    next();
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    return next(new HttpError(401, 'Sesión expirada o inválida', 'UNAUTHENTICATED'));
  }
}

export async function assertProjectOwner(projectId: string, userId: string | undefined) {
  if (!userId) throw new HttpError(401, 'Debes iniciar sesión', 'UNAUTHENTICATED');
  const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: userId } });
  if (!project) throw new HttpError(404, 'Proyecto no encontrado', 'NOT_FOUND');
  return project;
}
