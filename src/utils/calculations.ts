// Calculation utilities for student statistics and rankings

import { Student, StudentStats, Record, RankingData } from '@/types';

export function calculatePersonalBest(records: Record[]): number | null {
  const validTimes = records
    .filter(record => record.time !== null && !record.isDNF)
    .map(record => record.time as number);
  
  if (validTimes.length === 0) return null;
  
  return Math.min(...validTimes);
}

export function calculateAverage(records: Record[]): number | null {
  const validTimes = records
    .filter(record => record.time !== null && !record.isDNF)
    .map(record => record.time as number);
  
  if (validTimes.length === 0) return null;
  
  return Math.round(validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length);
}

export function calculateStudentStats(student: Student): StudentStats {
  const personalBest = calculatePersonalBest(student.records);
  const averageTime = calculateAverage(student.records);
  const validRecordsCount = student.records.filter(
    record => record.time !== null && !record.isDNF
  ).length;

  return {
    personalBest,
    averageTime,
    validRecordsCount,
    rank: { byPB: 0, byAvg: 0 }, // Will be calculated separately
  };
}

export function calculateClassRankings(students: Student[]): {
  byPersonalBest: RankingData[];
  byAverage: RankingData[];
} {
  // Only include non-hidden students with valid records
  const eligibleStudents = students
    .filter(student => !student.isHidden)
    .map(student => ({
      student,
      stats: calculateStudentStats(student),
    }))
    .filter(item => item.stats.personalBest !== null);

  // Rank by Personal Best
  const byPersonalBest = eligibleStudents
    .slice()
    .sort((a, b) => {
      const timeA = a.stats.personalBest!;
      const timeB = b.stats.personalBest!;
      
      if (timeA !== timeB) return timeA - timeB;
      
      // Tiebreaker 1: Average time
      const avgA = a.stats.averageTime || Infinity;
      const avgB = b.stats.averageTime || Infinity;
      if (avgA !== avgB) return avgA - avgB;
      
      // Tiebreaker 2: Student number
      return a.student.number - b.student.number;
    })
    .map((item, index) => ({
      ...item,
      position: index + 1,
    }));

  // Rank by Average
  const byAverage = eligibleStudents
    .slice()
    .filter(item => item.stats.averageTime !== null)
    .sort((a, b) => {
      const avgA = a.stats.averageTime!;
      const avgB = b.stats.averageTime!;
      
      if (avgA !== avgB) return avgA - avgB;
      
      // Tiebreaker 1: Personal best
      const pbA = a.stats.personalBest!;
      const pbB = b.stats.personalBest!;
      if (pbA !== pbB) return pbA - pbB;
      
      // Tiebreaker 2: Student number
      return a.student.number - b.student.number;
    })
    .map((item, index) => ({
      ...item,
      position: index + 1,
    }));

  return { byPersonalBest, byAverage };
}

export function getClassBestRecord(students: Student[]): {
  time: number | null;
  holders: Student[];
} {
  const eligibleStudents = students.filter(student => !student.isHidden);
  let bestTime: number | null = null;
  let holders: Student[] = [];

  eligibleStudents.forEach(student => {
    const pb = calculatePersonalBest(student.records);
    if (pb !== null) {
      if (bestTime === null || pb < bestTime) {
        bestTime = pb;
        holders = [student];
      } else if (pb === bestTime) {
        holders.push(student);
      }
    }
  });

  return { time: bestTime, holders };
}

export function generateStudentId(): string {
  return crypto.randomUUID();
}

export function generateRecordId(): string {
  return crypto.randomUUID();
}

export function generateClassId(): string {
  return crypto.randomUUID();
}

export function calculateDailyBest(records: Record[]): number | null {
  const validTimes = records
    .filter(record => record.time !== null && !record.isDNF)
    .map(record => record.time!);

  if (validTimes.length === 0) {
    return null;
  }

  return Math.min(...validTimes);
}