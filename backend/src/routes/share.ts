import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { assertProjectOwner } from '../auth.js';
import { asyncHandler, HttpError } from '../http.js';
import { isISODate } from '../dates.js';
import { projectInclude, toProjectDTO } from '../projectService.js';

export const shareRouter = Router();
export const publicShareRouter = Router();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function expiryToDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (isISODate(value)) return new Date(`${value}T23:59:59.999Z`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, 'Fecha de expiración inválida', 'INVALID_EXPIRY');
  return date;
}

const shareLinkMeta = {
  id: true,
  label: true,
  tokenPrefix: true,
  permission: true,
  expiresAt: true,
  isActive: true,
  createdAt: true,
  lastAccessedAt: true,
} as const;

shareRouter.get(
  '/:projectId/share-links',
  asyncHandler(async (req, res) => {
    await assertProjectOwner(req.params.projectId, req.userId);
    const links = await prisma.shareLink.findMany({
      where: { projectId: req.params.projectId },
      select: shareLinkMeta,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ links });
  }),
);

shareRouter.post(
  '/:projectId/share-links',
  asyncHandler(async (req, res) => {
    await assertProjectOwner(req.params.projectId, req.userId);
    const body = z
      .object({
        label: z.string().max(120).optional(),
        expiresAt: z.string().nullable().optional(),
        password: z.string().min(4).max(200).nullable().optional(),
      })
      .parse(req.body);
    const token = crypto.randomBytes(24).toString('base64url');
    const link = await prisma.shareLink.create({
      data: {
        projectId: req.params.projectId,
        tokenHash: hashToken(token),
        tokenPrefix: token.slice(0, 6),
        label: body.label || null,
        permission: 'viewer',
        expiresAt: expiryToDate(body.expiresAt),
        passwordHash: body.password ? await bcrypt.hash(body.password, 10) : null,
        createdById: req.userId!,
      },
      select: shareLinkMeta,
    });
    res.status(201).json({ link: { ...link, token } });
  }),
);

shareRouter.patch(
  '/:projectId/share-links/:linkId',
  asyncHandler(async (req, res) => {
    await assertProjectOwner(req.params.projectId, req.userId);
    const existing = await prisma.shareLink.findFirst({
      where: { id: req.params.linkId, projectId: req.params.projectId },
    });
    if (!existing) throw new HttpError(404, 'Enlace no encontrado', 'NOT_FOUND');
    const body = z
      .object({
        label: z.string().max(120).nullable().optional(),
        isActive: z.boolean().optional(),
        expiresAt: z.string().nullable().optional(),
        password: z.string().min(4).max(200).nullable().optional(),
      })
      .parse(req.body);
    const link = await prisma.shareLink.update({
      where: { id: existing.id },
      data: {
        ...(body.label !== undefined ? { label: body.label || null } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.expiresAt !== undefined ? { expiresAt: expiryToDate(body.expiresAt) } : {}),
        ...(body.password !== undefined
          ? { passwordHash: body.password ? await bcrypt.hash(body.password, 10) : null }
          : {}),
      },
      select: shareLinkMeta,
    });
    res.json({ link });
  }),
);

shareRouter.delete(
  '/:projectId/share-links/:linkId',
  asyncHandler(async (req, res) => {
    await assertProjectOwner(req.params.projectId, req.userId);
    const existing = await prisma.shareLink.findFirst({
      where: { id: req.params.linkId, projectId: req.params.projectId },
    });
    if (!existing) throw new HttpError(404, 'Enlace no encontrado', 'NOT_FOUND');
    await prisma.shareLink.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);

publicShareRouter.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const token = req.params.token;
    if (token.length < 20) throw new HttpError(404, 'Enlace no válido', 'SHARE_NOT_FOUND');
    const link = await prisma.shareLink.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        project: {
          include: projectInclude,
        },
      },
    });
    if (!link || !link.isActive) {
      throw new HttpError(404, 'Este enlace no existe o fue revocado', 'SHARE_NOT_FOUND');
    }
    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      throw new HttpError(410, 'Este enlace expiró', 'SHARE_EXPIRED');
    }
    if (link.passwordHash) {
      const provided = req.header('x-share-password');
      if (!provided) {
        throw new HttpError(401, 'Este enlace requiere contraseña', 'SHARE_PASSWORD_REQUIRED');
      }
      const valid = await bcrypt.compare(provided, link.passwordHash);
      if (!valid) throw new HttpError(401, 'Contraseña incorrecta', 'SHARE_PASSWORD_INVALID');
    }
    await prisma.shareLink.update({
      where: { id: link.id },
      data: { lastAccessedAt: new Date() },
    });
    res.setHeader('Cache-Control', 'no-store');
    const project = link.project;
    res.json({
      project: toProjectDTO(project),
      phases: project.phases,
      activities: project.activities,
      dependencies: project.dependencies,
      shared: {
        label: link.label,
        permission: 'viewer',
        expiresAt: link.expiresAt?.toISOString() ?? null,
      },
    });
  }),
);
