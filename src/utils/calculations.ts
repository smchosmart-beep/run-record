// Calculation utilities for student statistics and rankings

import { Student, StudentStats, Record, RankingData } from '@/types';

export function calculatePersonalBest(records: Record[]): number | null {
  const validTimes = records
    .filter(record => record.time !== null && !record.isDNF)
    .map(record => record.time as number);
  
  if (validTimes.length === 0) return null;
  
  return Math.min(...validTimes);
}

// Helper: get best time depending on ranking type
export function getBestTimeForRanking(records: Record[], rankingType: 'fastest' | 'slowest'): number | null {
  const validTimes = records
    .filter(record => record.time !== null && !record.isDNF)
    .map(record => record.time as number);

  if (validTimes.length === 0) return null;

  return rankingType === 'fastest'
    ? Math.min(...validTimes)
    : Math.max(...validTimes);
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

export function calculateClassRankings(students: Student[], rankingType: 'fastest' | 'slowest' = 'fastest'): {
  byPersonalBest: RankingData[];
  byAverage: RankingData[];
} {
  // Only include non-hidden students with valid records (based on ranking type)
  const eligibleStudents = students
    .filter(student => !student.isHidden)
    .map(student => ({
      student,
      stats: calculateStudentStats(student),
    }))
    .filter(item => getBestTimeForRanking(item.student.records, rankingType) !== null);

  // Rank by Personal Best (best depends on rankingType)
  const byPersonalBest = eligibleStudents
    .slice()
    .sort((a, b) => {
      const timeA = getBestTimeForRanking(a.student.records, rankingType)!;
      const timeB = getBestTimeForRanking(b.student.records, rankingType)!;
      
      // Sort based on ranking type
      const timeDiff = rankingType === 'fastest' ? timeA - timeB : timeB - timeA;
      if (timeDiff !== 0) return timeDiff;
      
      // Tiebreaker 1: Average time
      const avgA = a.stats.averageTime ?? (rankingType === 'fastest' ? Infinity : -Infinity);
      const avgB = b.stats.averageTime ?? (rankingType === 'fastest' ? Infinity : -Infinity);
      const avgDiff = rankingType === 'fastest' ? avgA - avgB : avgB - avgA;
      if (avgDiff !== 0) return avgDiff;
      
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
      
      // Sort based on ranking type
      const avgDiff = rankingType === 'fastest' ? avgA - avgB : avgB - avgA;
      if (avgDiff !== 0) return avgDiff;
      
      // Tiebreaker 1: Personal best (based on ranking type)
      const pbA = getBestTimeForRanking(a.student.records, rankingType)!;
      const pbB = getBestTimeForRanking(b.student.records, rankingType)!;
      const pbDiff = rankingType === 'fastest' ? pbA - pbB : pbB - pbA;
      if (pbDiff !== 0) return pbDiff;
      
      // Tiebreaker 2: Student number
      return a.student.number - b.student.number;
    })
    .map((item, index) => ({
      ...item,
      position: index + 1,
    }));

  return { byPersonalBest, byAverage };
}

export function getClassBestRecord(students: Student[], rankingType: 'fastest' | 'slowest' = 'fastest'): {
  time: number | null;
  holders: Student[];
} {
  const eligibleStudents = students.filter(student => !student.isHidden);
  let bestTime: number | null = null;
  let holders: Student[] = [];

  eligibleStudents.forEach(student => {
    const best = getBestTimeForRanking(student.records, rankingType);
    if (best !== null) {
      if (bestTime === null) {
        bestTime = best;
        holders = [student];
      } else {
        const isBetter = rankingType === 'fastest' ? best < bestTime : best > bestTime;
        if (isBetter) {
          bestTime = best;
          holders = [student];
        } else if (best === bestTime) {
          holders.push(student);
        }
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