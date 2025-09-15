// Time utility functions for SpeedUp app

export function parseTimeInput(input: string): number | null {
  if (!input || input.trim() === '') return null;
  
  // Handle DNF case
  if (input.toUpperCase() === 'DNF') return null;
  
  const trimmed = input.trim();
  
  // Pattern 1: mm:ss.ms or mm:ss.s (e.g., 1:23.45, 0:59.8)
  const pattern1 = /^(\d{1,2}):(\d{1,2})\.(\d{1,3})$/;
  const match1 = trimmed.match(pattern1);
  if (match1) {
    const minutes = parseInt(match1[1]);
    const seconds = parseInt(match1[2]);
    const ms = parseFloat(`0.${match1[3]}`) * 1000;
    
    if (minutes < 0 || seconds < 0 || seconds >= 60) return null;
    
    return (minutes * 60 + seconds) * 1000 + Math.round(ms);
  }
  
  // Pattern 2: ss.ms or ss.s (e.g., 72.34, 59.8)
  const pattern2 = /^(\d{1,3})\.(\d{1,3})$/;
  const match2 = trimmed.match(pattern2);
  if (match2) {
    const seconds = parseInt(match2[1]);
    const ms = parseFloat(`0.${match2[2]}`) * 1000;
    
    if (seconds < 0) return null;
    
    return seconds * 1000 + Math.round(ms);
  }
  
  // Pattern 3: mm:ss (e.g., 1:23)
  const pattern3 = /^(\d{1,2}):(\d{1,2})$/;
  const match3 = trimmed.match(pattern3);
  if (match3) {
    const minutes = parseInt(match3[1]);
    const seconds = parseInt(match3[2]);
    
    if (minutes < 0 || seconds < 0 || seconds >= 60) return null;
    
    return (minutes * 60 + seconds) * 1000;
  }
  
  // Pattern 4: plain seconds (e.g., 72)
  const pattern4 = /^(\d{1,3})$/;
  const match4 = trimmed.match(pattern4);
  if (match4) {
    const seconds = parseInt(match4[1]);
    
    if (seconds < 0) return null;
    
    return seconds * 1000;
  }
  
  return null;
}

export function formatTime(milliseconds: number | null): string {
  if (milliseconds === null) return '--';
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const ms = milliseconds % 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${Math.floor(ms / 10).toString().padStart(2, '0')}`;
  } else {
    return `${seconds}.${Math.floor(ms / 10).toString().padStart(2, '0')}`;
  }
}

export function validateTimeInput(input: string): { isValid: boolean; error?: string } {
  if (!input || input.trim() === '') {
    return { isValid: true }; // Empty is allowed (no record)
  }
  
  if (input.toUpperCase() === 'DNF') {
    return { isValid: true };
  }
  
  const result = parseTimeInput(input);
  if (result === null) {
    return { 
      isValid: false, 
      error: '올바른 시간 형식을 입력하세요 (예: 1:23.45, 72.34, DNF)' 
    };
  }
  
  if (result <= 0) {
    return { 
      isValid: false, 
      error: '시간은 0보다 커야 합니다' 
    };
  }
  
  return { isValid: true };
}