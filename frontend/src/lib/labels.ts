import type { ActivityPriority, ActivityStatus, ActivityType, ProjectStatus } from '@/api/types';

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  planning: { label: 'Planeación', color: '#7C3AED', bg: '#F3E8FF' },
  active: { label: 'Activo', color: '#047857', bg: '#D1FAE5' },
  paused: { label: 'En pausa', color: '#B45309', bg: '#FEF3C7' },
  completed: { label: 'Completado', color: '#1D4ED8', bg: '#DBEAFE' },
  archived: { label: 'Archivado', color: '#64748B', bg: '#F1F5F9' },
};

export const ACTIVITY_STATUS: Record<ActivityStatus, { label: string; color: string; bg: string; bar: string }> = {
  pending: { label: 'Pendiente', color: '#475569', bg: '#F1F5F9', bar: '#94A3B8' },
  in_progress: { label: 'En progreso', color: '#B45309', bg: '#FEF3C7', bar: '#F59E0B' },
  blocked: { label: 'Bloqueada', color: '#B91C1C', bg: '#FEE2E2', bar: '#DC2626' },
  completed: { label: 'Completada', color: '#047857', bg: '#D1FAE5', bar: '#10B981' },
};

export const ACTIVITY_PRIORITY: Record<ActivityPriority, { label: string; color: string }> = {
  low: { label: 'Baja', color: '#64748B' },
  medium: { label: 'Media', color: '#0E7490' },
  high: { label: 'Alta', color: '#B45309' },
  critical: { label: 'Crítica', color: '#B91C1C' },
};

export const ACTIVITY_TYPE: Record<ActivityType, { label: string }> = {
  task: { label: 'Tarea' },
  summary: { label: 'Resumen' },
  milestone: { label: 'Hito' },
};

export const PHASE_PALETTE = [
  '#4F46E5', '#0E7490', '#047857', '#B45309', '#BE123C', '#7C3AED', '#C2410C', '#0F766E',
];

export function phaseColor(index: number, custom?: string | null): string {
  return custom || PHASE_PALETTE[index % PHASE_PALETTE.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
