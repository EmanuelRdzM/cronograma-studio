import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { assertProjectOwner } from '../auth.js';
import { asyncHandler } from '../http.js';
import { getProjectBundle } from '../projectService.js';
import { createProjectFromPlantUml, previewPlantUml } from '../importService.js';
import { exportPlantUml } from '../plantuml.js';

export const transferRouter = Router();

transferRouter.post(
  '/import/plantuml',
  asyncHandler(async (req, res) => {
    const body = z.object({ text: z.string() }).parse(req.body);
    const parsed = previewPlantUml(body.text);
    res.json({ preview: parsed });
  }),
);

transferRouter.post(
  '/import/plantuml/confirm',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        text: z.string(),
        name: z.string().trim().max(160).optional(),
      })
      .parse(req.body);
    const bundle = await createProjectFromPlantUml(req.userId!, body.text, body.name);
    res.status(201).json(bundle);
  }),
);

transferRouter.get(
  '/:projectId/export/plantuml',
  asyncHandler(async (req, res) => {
    const bundle = await getProjectBundle(req.params.projectId, req.userId!);
    const { code } = exportPlantUml({
      project: {
        name: bundle.project.name,
        startDate: bundle.project.startDate,
        workingDays: bundle.project.workingDays,
        defaultScale: bundle.project.defaultScale,
        referenceDate: bundle.project.referenceDate,
      },
      phases: bundle.phases,
      activities: bundle.activities,
      dependencies: bundle.dependencies,
    });
    const filename = bundle.project.name.replace(/[^a-zA-Z0-9-_áéíóúñ ]/gi, '').trim() || 'cronograma';
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.puml"`);
    res.send(code);
  }),
);

transferRouter.get(
  '/:projectId/export/json',
  asyncHandler(async (req, res) => {
    const bundle = await getProjectBundle(req.params.projectId, req.userId!);
    const filename = bundle.project.name.replace(/[^a-zA-Z0-9-_áéíóúñ ]/gi, '').trim() || 'cronograma';
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    res.send(JSON.stringify({ ...bundle, exportedAt: new Date().toISOString() }, null, 2));
  }),
);

transferRouter.get(
  '/:projectId/source-plantuml',
  asyncHandler(async (req, res) => {
    await assertProjectOwner(req.params.projectId, req.userId);
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      select: { sourcePlantUml: true },
    });
    res.json({ text: project?.sourcePlantUml ?? null });
  }),
);
