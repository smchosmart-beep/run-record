// SpeedUp App Types

export interface Student {
  id: string;
  number: number;
  name: string;
  records: Record[];
  isHidden: boolean;
}

export interface Record {
  id: string;
  time: number | null; // milliseconds, null for empty
  isDNF: boolean;
  recordedAt: Date;
  slotIndex: number;
  recordDate: Date; // Date when this record was created
}

export interface ClassRoom {
  id: string;
  school: string;
  grade: number;
  className: string;
  students: Student[];
  maxRecordSlots: number;
  rankingType?: 'fastest' | 'slowest'; // 'fastest' for 50m 달리기, 'slowest' for 플랭크
  totalActivityDays?: number; // 전체 활동일수 (인증관리용)
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  username: string;
  currentClassId?: string;
}

export interface StudentStats {
  personalBest: number | null; // milliseconds
  averageTime: number | null; // milliseconds
  validRecordsCount: number;
  rank: {
    byPB: number;
    byAvg: number;
  };
}

export interface RankingData {
  student: Student;
  stats: StudentStats;
  position: number;
}

export type AppMode = 'view' | 'input';

export interface TimeInput {
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

// New interfaces for date-based record management
export interface RecordSession {
  id: string;
  date: Date;
  maxSlots: number;
  records: Record[]; // Records for this specific date
  studentCount: number;
}

export interface DateRecordsData {
  [date: string]: Record[]; // Records grouped by date (YYYY-MM-DD format)
}

// For localStorage structure
export interface AppData {
  user: User | null;
  classrooms: ClassRoom[];
  currentMode: AppMode;
}