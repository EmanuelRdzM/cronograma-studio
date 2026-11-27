import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { assertProjectOwner } from '../auth.js';
import { asyncHandler, HttpError } from '../http.js';
import { getProjectBundle } from '../projectService.js';
import { formatDateTime } from '../dates.js';

export const snapshotRouter = Router();

snapshotRouter.get(
  '/:projectId/snapshots',
  asyncHandler(async (req, res) => {
    await assertProjectOwner(req.params.projectId, req.userId);
    const snapshots = await prisma.projectSnapshot.findMany({
      where: { projectId: req.params.projectId },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ snapshots });
  }),
);

snapshotRouter.post(
  '/:projectId/snapshots',
  asyncHandler(async (req, res) => {
    await assertProjectOwner(req.params.projectId, req.userId);
    const body = z.object({ name: z.string().trim().max(120).optional() }).parse(req.body ?? {});
    const bundle = await getProjectBundle(req.params.projectId, req.userId!);
    const name = body.name?.trim() || `Versión ${formatDateTime(new Date())}`;
    const snapshot = await prisma.projectSnapshot.create({
      data: {
        projectId: req.params.projectId,
        name,
        data: JSON.stringify(bundle),
        createdById: req.userId!,
      },
      select: { id: true, name: true, createdAt: true },
    });
    res.status(201).json({ snapshot });
  }),
);

snapshotRouter.get(
  '/:projectId/snapshots/:snapshotId',
  asyncHandler(async (req, res) => {
    await assertProjectOwner(req.params.projectId, req.userId);
    const snapshot = await prisma.projectSnapshot.findFirst({
      where: { id: req.params.snapshotId, projectId: req.params.projectId },
    });
    if (!snapshot) throw new HttpError(404, 'Versión no encontrada', 'NOT_FOUND');
    let data: unknown;
    try {
      data = JSON.parse(snapshot.data);
    } catch {
      throw new HttpError(500, 'La versión guardada está dañada', 'SNAPSHOT_CORRUPT');
    }
    res.json({
      snapshot: {
        id: snapshot.id,
        name: snapshot.name,
        createdAt: snapshot.createdAt,
        data,
      },
    });
  }),
);

snapshotRouter.delete(
  '/:projectId/snapshots/:snapshotId',
  asyncHandler(async (req, res) => {
    await assertProjectOwner(req.params.projectId, req.userId);
    const snapshot = await prisma.projectSnapshot.findFirst({
      where: { id: req.params.snapshotId, projectId: req.params.projectId },
      select: { id: true },
    });
    if (!snapshot) throw new HttpError(404, 'Versión no encontrada', 'NOT_FOUND');
    await prisma.projectSnapshot.delete({ where: { id: snapshot.id } });
    res.status(204).end();
  }),
);
