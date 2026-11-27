import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { assertProjectOwner } from '../auth.js';
import { asyncHandler, HttpError } from '../http.js';
import { applyCascadeFrom, wouldCreateCycle } from '../schedule.js';

export const dependencyRouter = Router();

dependencyRouter.post(
  '/projects/:projectId/dependencies',
  asyncHandler(async (req, res) => {
    await assertProjectOwner(req.params.projectId, req.userId);
    const body = z
      .object({
        predecessorId: z.string(),
        successorId: z.string(),
        type: z.enum(['FS', 'SS', 'FF', 'SF']).optional().default('FS'),
        lag: z.number().int().min(0).max(365).optional().default(0),
      })
      .parse(req.body);
    if (body.predecessorId === body.successorId) {
      throw new HttpError(400, 'Una actividad no puede depender de sí misma', 'INVALID_DEPENDENCY');
    }
    const activities = await prisma.activity.findMany({
      where: { projectId: req.params.projectId, id: { in: [body.predecessorId, body.successorId] } },
      select: { id: true },
    });
    if (activities.length !== 2) {
      throw new HttpError(400, 'Las actividades no pertenecen al proyecto', 'INVALID_DEPENDENCY');
    }
    const existing = await prisma.dependency.findMany({ where: { projectId: req.params.projectId } });
    if (wouldCreateCycle(existing, body.predecessorId, body.successorId)) {
      throw new HttpError(400, 'La dependencia crearía un ciclo', 'DEPENDENCY_CYCLE');
    }
    const dependency = await prisma.dependency.create({
      data: {
        projectId: req.params.projectId,
        predecessorId: body.predecessorId,
        successorId: body.successorId,
        type: body.type,
        lag: body.lag,
      },
    });
    const cascade = await applyCascadeFrom(req.params.projectId, body.predecessorId);
    res.status(201).json({ dependency, changed: cascade.changed });
  }),
);

dependencyRouter.patch(
  '/dependencies/:dependencyId',
  asyncHandler(async (req, res) => {
    const existing = await prisma.dependency.findFirst({
      where: { id: req.params.dependencyId, project: { ownerId: req.userId! } },
    });
    if (!existing) throw new HttpError(404, 'Dependencia no encontrada', 'NOT_FOUND');
    const body = z
      .object({
        lag: z.number().int().min(0).max(365).optional(),
        type: z.enum(['FS']).optional(),
      })
      .parse(req.body);
    const dependency = await prisma.dependency.update({
      where: { id: existing.id },
      data: {
        ...(body.lag !== undefined ? { lag: body.lag } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
      },
    });
    const cascade = await applyCascadeFrom(existing.projectId, existing.predecessorId);
    res.json({ dependency, changed: cascade.changed });
  }),
);

dependencyRouter.delete(
  '/dependencies/:dependencyId',
  asyncHandler(async (req, res) => {
    const existing = await prisma.dependency.findFirst({
      where: { id: req.params.dependencyId, project: { ownerId: req.userId! } },
    });
    if (!existing) throw new HttpError(404, 'Dependencia no encontrada', 'NOT_FOUND');
    await prisma.dependency.delete({ where: { id: existing.id } });
    res.status(204).end();
  }),
);
