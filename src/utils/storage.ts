// LocalStorage utility functions for SpeedUp app

import { AppData, ClassRoom, Student, User } from '@/types';

const STORAGE_KEY = 'speedup_app_data';
const BACKUP_KEY = 'speedup_app_backup';

const defaultAppData: AppData = {
  user: null,
  classrooms: [],
  currentMode: 'view',
};

export function loadAppData(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultAppData;
    
    const parsed = JSON.parse(stored);
    
    // Convert date strings back to Date objects
    if (parsed.classrooms) {
      parsed.classrooms.forEach((classroom: ClassRoom) => {
        classroom.createdAt = new Date(classroom.createdAt);
        classroom.updatedAt = new Date(classroom.updatedAt);
        classroom.students.forEach((student: Student) => {
          student.records.forEach((record) => {
            record.recordedAt = new Date(record.recordedAt);
          });
        });
      });
    }
    
    return { ...defaultAppData, ...parsed };
  } catch (error) {
    console.error('Failed to load app data:', error);
    return defaultAppData;
  }
}

export function saveAppData(data: AppData): boolean {
  try {
    // Create backup before saving
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      localStorage.setItem(BACKUP_KEY, current);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save app data:', error);
    return false;
  }
}

export function exportData(): string {
  const data = loadAppData();
  return JSON.stringify(data, null, 2);
}

export function importData(jsonData: string): { success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(jsonData);
    
    // Basic validation
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: '잘못된 데이터 형식입니다' };
    }
    
    // Save the imported data
    const success = saveAppData(parsed);
    if (!success) {
      return { success: false, error: '데이터 저장에 실패했습니다' };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: '데이터 파싱에 실패했습니다' };
  }
}

export function clearAllData(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BACKUP_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear data:', error);
    return false;
  }
}

export function restoreBackup(): boolean {
  try {
    const backup = localStorage.getItem(BACKUP_KEY);
    if (!backup) return false;
    
    localStorage.setItem(STORAGE_KEY, backup);
    return true;
  } catch (error) {
    console.error('Failed to restore backup:', error);
    return false;
  }
}