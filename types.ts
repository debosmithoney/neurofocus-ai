export enum AppView {
  HOME = 'HOME',
  SESSION = 'SESSION',
  BREAKDOWN = 'BREAKDOWN',
}

export enum FocusMode {
  STUDY = 'Study',
  CODING = 'Coding',
  READING = 'Reading',
  WRITING = 'Writing',
  OTHER = 'Other',
}

export interface TaskStep {
  title: string;
  description: string;
  minutes: number;
}

export interface PracticeProblem {
  title: string;
  statement: string;
  inputOutput?: string;
  hints: string[];
  explanation: string;
}

export interface Session {
  id: string;
  goal: string;
  mode: FocusMode;
  durationMinutes: number;
  startTime: number;
  elapsedSeconds: number;
  status: 'running' | 'paused' | 'completed';
}

export interface DailyStats {
  totalFocusMinutes: number;
  sessionsCompleted: number;
  problemsGenerated: number;
  streakDays: number;
  lastSessionDate: string; // YYYY-MM-DD
}

export const DEFAULT_STATS: DailyStats = {
  totalFocusMinutes: 0,
  sessionsCompleted: 0,
  problemsGenerated: 0,
  streakDays: 0,
  lastSessionDate: '',
};
