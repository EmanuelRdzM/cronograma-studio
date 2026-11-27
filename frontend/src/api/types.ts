export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed' | 'archived';
export type SchedulingMode = 'manual' | 'automatic';
export type GanttScale = 'day' | 'week' | 'month';
export type ActivityType = 'task' | 'summary' | 'milestone';
export type ActivityStatus = 'pending' | 'in_progress' | 'blocked' | 'completed';
export type ActivityPriority = 'low' | 'medium' | 'high' | 'critical';
export type DurationUnit = 'working_day' | 'calendar_day';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  status: ProjectStatus;
  color: string;
  startDate: string;
  endDate: string | null;
  timezone: string;
  schedulingMode: SchedulingMode;
  workingDays: number[];
  holidays: string[];
  showToday: boolean;
  referenceDate: string | null;
  defaultScale: GanttScale;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  progress: number;
  activityCount: number;
  phaseCount: number;
  computedStart: string;
  computedEnd: string;
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  color: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  projectId: string;
  phaseId: string | null;
  parentId: string | null;
  name: string;
  description: string | null;
  type: ActivityType;
  startDate: string;
  endDate: string;
  duration: number;
  durationUnit: DurationUnit;
  progress: number;
  status: ActivityStatus;
  priority: ActivityPriority;
  color: string | null;
  assignee: string | null;
  sortOrder: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Dependency {
  id: string;
  projectId: string;
  predecessorId: string;
  successorId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lag: number;
  createdAt: string;
}

export interface ProjectBundle {
  project: Project;
  phases: Phase[];
  activities: Activity[];
  dependencies: Dependency[];
}

export interface ShareLink {
  id: string;
  label: string | null;
  tokenPrefix: string;
  permission: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  lastAccessedAt: string | null;
  token?: string;
}

export interface SnapshotMeta {
  id: string;
  name: string;
  createdAt: string;
}

export interface SnapshotDetail extends SnapshotMeta {
  data: ProjectBundle;
}

export interface PlantUmlWarning {
  line: number | null;
  message: string;
}

export interface ParsedPlantUmlActivity {
  name: string;
  phaseIndex: number | null;
  startDate: string;
  endDate: string;
  duration: number;
  progress: number;
  color: string | null;
  predecessorNames: string[];
  line: number;
}

export interface PlantUmlPreview {
  title: string;
  projectStart: string;
  defaultScale: GanttScale;
  workingDays: number[];
  referenceDate: string | null;
  phases: { name: string; activities: ParsedPlantUmlActivity[] }[];
  activities: ParsedPlantUmlActivity[];
  dependencies: { predecessorName: string; successorName: string }[];
  warnings: PlantUmlWarning[];
  errors: PlantUmlWarning[];
  summary: {
    phases: number;
    activities: number;
    dependencies: number;
    warnings: number;
    errors: number;
  };
}

export interface PublicShareData extends ProjectBundle {
  shared: {
    label: string | null;
    permission: string;
    expiresAt: string | null;
  };
}
