import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApp } from '@/contexts/AppContext';
import { Student, Record as StudentRecord, RecordSession as RecordSessionType } from '@/types';
import { generateRecordId, calculateDailyBest, calculateDailyBestForRanking } from '@/utils/calculations';
import { parseTimeInput, validateTimeInput, formatTime } from '@/utils/time';
import { AlertCircle, Edit, Plus, Eye, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { updateRecordSessionSlots, upsertRecordSession } from '@/utils/supabaseApi';

interface RecordSessionProps {
  session: RecordSessionType;
  selectedDate: Date;
}

export const RecordSession: React.FC<RecordSessionProps> = ({ session, selectedDate }) => {
  const { currentClassroom, updateClassroom, currentMode, setMode } = useApp();
  const { toast } = useToast();
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [maxSlots, setMaxSlots] = useState(session.maxSlots);
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  if (!currentClassroom) return null;

  useEffect(() => {
    if (!currentClassroom) return;
    upsertRecordSession(currentClassroom.id, selectedDate, session.maxSlots)
      .catch((err) => console.error('세션 보장(upsert) 실패:', err));
  }, [currentClassroom?.id, selectedDate, session.maxSlots]);

  const allActiveStudents = currentClassroom.students
    .filter(s => !s.isHidden);

  // Apply sorting based on sortOrder state
  const activeStudents = useMemo(() => {
    const students = [...allActiveStudents];
    
    if (sortOrder === 'none') {
      return students.sort((a, b) => a.number - b.number);
    }
    
    return students.sort((a, b) => {
      const aRecords = a.records.filter(r => isSameDay(r.recordDate, selectedDate));
      const bRecords = b.records.filter(r => isSameDay(r.recordDate, selectedDate));
      
      const aBest = calculateDailyBestForRanking(aRecords, currentClassroom.rankingType || 'fastest');
      const bBest = calculateDailyBestForRanking(bRecords, currentClassroom.rankingType || 'fastest');
      
      // Handle null values (no records) - put them at the end
      if (aBest === null && bBest === null) return a.number - b.number;
      if (aBest === null) return 1;
      if (bBest === null) return -1;
      
      // Sort by best time based on ranking type
      const sortMultiplier = currentClassroom.rankingType === 'slowest' ? -1 : 1;
      const timeDiff = sortOrder === 'asc' ? (aBest - bBest) * sortMultiplier : (bBest - aBest) * sortMultiplier;
      if (timeDiff !== 0) return timeDiff;
      
      // Tiebreaker: student number
      return a.number - b.number;
    });
  }, [allActiveStudents, sortOrder, selectedDate]);

  // Filter records for the current date
  const dateRecords = useMemo(() => {
    const records: Record<string, StudentRecord[]> = {};
    activeStudents.forEach(student => {
      records[student.id] = student.records.filter(record => 
        isSameDay(record.recordDate, selectedDate)
      );
    });
    return records;
  }, [activeStudents, selectedDate]);

  const getInputKey = (studentId: string, slotIndex: number) => 
    `${studentId}_${slotIndex}`;

  const getCellId = (studentId: string, slotIndex: number) =>
    `cell-${studentId}-${slotIndex}`;

  // Debounced auto-save function
  const debouncedSave = useCallback((student: Student, slotIndex: number, value: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!value.trim()) return;

      const validation = validateTimeInput(value);
      if (!validation.isValid) return;

      const isDNF = value.toUpperCase() === 'DNF';
      const time = isDNF ? null : parseTimeInput(value);

      const newRecord: StudentRecord = {
        id: generateRecordId(),
        time,
        isDNF,
        recordedAt: new Date(),
        recordDate: selectedDate, // Set the record date to selected date
        slotIndex,
      };

      console.log('Saving record for date:', {
        studentId: student.id,
        recordId: newRecord.id,
        slotIndex,
        recordDate: format(selectedDate, 'yyyy-MM-dd'),
        time,
        isDNF
      });

      // Remove any existing record for this slot on this date
      const updatedRecords = student.records.filter(r => 
        !(r.slotIndex === slotIndex && isSameDay(r.recordDate, selectedDate))
      );
      updatedRecords.push(newRecord);

      const updatedStudents = currentClassroom.students.map(s =>
        s.id === student.id ? { ...s, records: updatedRecords } : s
      );

      try {
        await updateClassroom(currentClassroom.id, {
          students: updatedStudents,
        });

        // Clear input and error on successful save
        const key = getInputKey(student.id, slotIndex);
        setInputValues(prev => ({ ...prev, [key]: '' }));
        setErrors(prev => ({ ...prev, [key]: '' }));
        
        console.log('Record saved successfully for date:', format(selectedDate, 'yyyy-MM-dd'));
      } catch (error) {
        console.error('Failed to save record:', error);
        
        // Keep the input value and show error
        const key = getInputKey(student.id, slotIndex);
        setErrors(prev => ({ ...prev, [key]: '저장 실패' }));
        
        toast({
          title: "저장 실패",
          description: "기록 저장 중 오류가 발생했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
      }
    }, 1000);
  }, [currentClassroom, updateClassroom, selectedDate, toast]);

  const handleInputChange = useCallback((studentId: string, slotIndex: number, value: string) => {
    const key = getInputKey(studentId, slotIndex);
    setInputValues(prev => ({ ...prev, [key]: value }));
    
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }

    // Find student and trigger debounced save
    const student = activeStudents.find(s => s.id === studentId);
    if (student) {
      debouncedSave(student, slotIndex, value);
    }
  }, [errors, activeStudents, debouncedSave]);

  const handleInputBlur = useCallback((studentId: string, slotIndex: number, value: string) => {
    if (!value.trim()) return;
    
    const validation = validateTimeInput(value);
    const key = getInputKey(studentId, slotIndex);
    
    if (!validation.isValid && validation.error) {
      setErrors(prev => ({ ...prev, [key]: validation.error! }));
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, studentId: string, slotIndex: number) => {
    const studentIndex = activeStudents.findIndex(s => s.id === studentId);
    
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to next student in same column
      if (studentIndex < activeStudents.length - 1) {
        const nextStudent = activeStudents[studentIndex + 1];
        const nextCellId = getCellId(nextStudent.id, slotIndex);
        const nextInput = document.getElementById(nextCellId) as HTMLInputElement;
        nextInput?.focus();
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      // Move to next column (next slot)
      if (slotIndex < maxSlots - 1) {
        const nextCellId = getCellId(studentId, slotIndex + 1);
        const nextInput = document.getElementById(nextCellId) as HTMLInputElement;
        nextInput?.focus();
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      // Move to previous column (previous slot)
      if (slotIndex > 0) {
        const prevCellId = getCellId(studentId, slotIndex - 1);
        const prevInput = document.getElementById(prevCellId) as HTMLInputElement;
        prevInput?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (studentIndex > 0) {
        const prevStudent = activeStudents[studentIndex - 1];
        const prevCellId = getCellId(prevStudent.id, slotIndex);
        const prevInput = document.getElementById(prevCellId) as HTMLInputElement;
        prevInput?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (studentIndex < activeStudents.length - 1) {
        const nextStudent = activeStudents[studentIndex + 1];
        const nextCellId = getCellId(nextStudent.id, slotIndex);
        const nextInput = document.getElementById(nextCellId) as HTMLInputElement;
        nextInput?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (slotIndex > 0) {
        const prevCellId = getCellId(studentId, slotIndex - 1);
        const prevInput = document.getElementById(prevCellId) as HTMLInputElement;
        prevInput?.focus();
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (slotIndex < maxSlots - 1) {
        const nextCellId = getCellId(studentId, slotIndex + 1);
        const nextInput = document.getElementById(nextCellId) as HTMLInputElement;
        nextInput?.focus();
      }
    }
  }, [activeStudents, maxSlots]);

  const getExistingRecord = (student: Student, slotIndex: number): StudentRecord | null => {
    return dateRecords[student.id]?.find(r => r.slotIndex === slotIndex) || null;
  };

  const clearRecord = (student: Student, slotIndex: number) => {
    const updatedRecords = student.records.filter(r => 
      !(r.slotIndex === slotIndex && isSameDay(r.recordDate, selectedDate))
    );
    
    const updatedStudents = currentClassroom.students.map(s =>
      s.id === student.id ? { ...s, records: updatedRecords } : s
    );

    updateClassroom(currentClassroom.id, {
      students: updatedStudents,
    });

    // Clear input
    const key = getInputKey(student.id, slotIndex);
    setInputValues(prev => ({ ...prev, [key]: '' }));
  };

  const addRecordSlot = async () => {
    if (maxSlots >= 15) {
      toast({
        title: "최대 회차 제한",
        description: "최대 15회까지만 추가할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    const newSlotCount = maxSlots + 1;
    
    try {
      // Update session in database
      await updateRecordSessionSlots(currentClassroom.id, selectedDate, newSlotCount);
      
      setMaxSlots(newSlotCount);
      
      toast({
        title: "회차 추가 완료",
        description: `${newSlotCount}회차가 추가되었습니다.`,
      });
    } catch (error) {
      console.error('회차 추가 실패:', error);
      toast({
        title: "추가 실패",
        description: "회차 추가 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const deleteLastRecordSlot = async () => {
    if (maxSlots <= 1) {
      toast({
        title: "삭제 불가",
        description: "최소 1회차는 유지되어야 합니다.",
        variant: "destructive",
      });
      return;
    }

    const lastSlotIndex = maxSlots - 1;
    const newSlotCount = maxSlots - 1;
    
    try {
      // Count records that will be deleted for this date
      const recordsToDelete = activeStudents.reduce((count, student) => {
        return count + dateRecords[student.id]?.filter(r => r.slotIndex === lastSlotIndex).length || 0;
      }, 0);

      // Remove all records from the last slot for this date only
      const updatedStudents = currentClassroom.students.map(student => ({
        ...student,
        records: student.records.filter(r => 
          !(r.slotIndex === lastSlotIndex && isSameDay(r.recordDate, selectedDate))
        )
      }));

      // Update classroom records
      await updateClassroom(currentClassroom.id, {
        students: updatedStudents,
      });

      // Update session in database
      await updateRecordSessionSlots(currentClassroom.id, selectedDate, newSlotCount);

      setMaxSlots(newSlotCount);

      toast({
        title: "회차 삭제 완료",
        description: `${maxSlots}회차와 관련 기록 ${recordsToDelete}개가 삭제되었습니다.`,
      });

      setShowDeleteDialog(false);
    } catch (error) {
      console.error('회차 삭제 실패:', error);
      toast({
        title: "삭제 실패",
        description: "회차 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleSortToggle = () => {
    setSortOrder(current => {
      if (current === 'none') return 'asc';
      if (current === 'asc') return 'desc';
      return 'none';
    });
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Card>
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {format(selectedDate, "yyyy년 M월 d일 (E)", { locale: ko })} 기록
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {currentMode === 'input' 
                  ? "시간 형식: 1:23.45 (분:초.백분의초), 72.34 (초.백분의초), DNF (기록없음)"
                  : "기록을 확인하세요. 수정하려면 입력 모드로 전환하세요."
                }
              </p>
              {currentMode === 'input' && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd>
                    <span>다음 학생</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Tab</kbd>
                    <span>다음 회차</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">↑↓←→</kbd>
                    <span>이동</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Mode Toggle */}
              <Button
                onClick={() => setMode(currentMode === 'input' ? 'view' : 'input')}
                variant={currentMode === 'view' ? 'default' : 'outline'}
                size="sm"
              >
                {currentMode === 'view' ? (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    입력 모드
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    보기 모드
                  </>
                )}
              </Button>
              
              {/* Record Slot Management Buttons */}
              {currentMode === 'input' && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={addRecordSlot}
                    variant="outline"
                    size="sm"
                    disabled={maxSlots >= 15}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    회차 추가
                  </Button>
                  
                  <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={maxSlots <= 1}
                        className="border-destructive text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        회차 삭제
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>회차 삭제 확인</AlertDialogTitle>
                        <AlertDialogDescription>
                          {maxSlots}회차를 삭제하시겠습니까?
                          <br />
                          <span className="font-medium text-foreground">
                            해당 회차의 이 날짜 기록이 함께 삭제됩니다.
                          </span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={deleteLastRecordSlot}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-12 bg-muted/50 sticky left-0 z-20 border-r">번호</TableHead>
                <TableHead className="w-28 bg-muted/50 sticky left-12 z-20 border-r">이름</TableHead>
                <TableHead 
                  className="w-24 bg-muted/50 sticky left-40 z-20 border-r cursor-pointer hover:bg-muted transition-colors"
                  onClick={handleSortToggle}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>오늘 {currentClassroom.rankingType === 'slowest' ? '최장' : '최고'} 기록</span>
                    {sortOrder === 'asc' && <ChevronUp className="h-3 w-3" />}
                    {sortOrder === 'desc' && <ChevronDown className="h-3 w-3" />}
                  </div>
                </TableHead>
                {Array.from({ length: maxSlots }, (_, i) => (
                  <TableHead key={i} className="w-20 text-center">
                    {i + 1}회차
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeStudents.map((student) => (
                <TableRow key={student.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium bg-muted/20 sticky left-0 z-10 border-r">
                    <Badge variant="outline">{student.number}</Badge>
                  </TableCell>
                  <TableCell className="font-medium bg-muted/20 sticky left-12 z-10 border-r">
                    {student.name}
                  </TableCell>
                  <TableCell className="font-bold bg-muted/20 sticky left-40 z-10 border-r text-center">
                     {(() => {
                       const dailyRecords = dateRecords[student.id] || [];
                       const dailyBest = calculateDailyBestForRanking(dailyRecords, currentClassroom.rankingType || 'fastest');
                      
                      if (dailyBest === null) {
                        // Check if there are any DNF records
                        const hasDNF = dailyRecords.some(r => r.isDNF);
                        return hasDNF ? 'DNF' : '-';
                      }
                      
                      return formatTime(dailyBest);
                    })()}
                  </TableCell>
                  {Array.from({ length: maxSlots }, (_, slotIndex) => {
                    const existingRecord = getExistingRecord(student, slotIndex);
                    const key = getInputKey(student.id, slotIndex);
                    const hasError = !!errors[key];
                    const hasInput = !!inputValues[key];

                    return (
                      <TableCell key={slotIndex} className="p-1 relative group">
                        {existingRecord ? (
                          <div className="flex items-center justify-between h-8 px-2 bg-success/10 rounded border border-success/20">
                            <span className="font-medium text-sm">
                              {existingRecord.isDNF ? 'DNF' : formatTime(existingRecord.time!)}
                            </span>
                            {currentMode === 'input' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => clearRecord(student, slotIndex)}
                              >
                                ×
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            <Input
                              id={getCellId(student.id, slotIndex)}
                              placeholder={currentMode === 'input' ? "기록 입력" : ""}
                              value={inputValues[key] || ''}
                              onChange={(e) => handleInputChange(student.id, slotIndex, e.target.value)}
                              onBlur={(e) => handleInputBlur(student.id, slotIndex, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, student.id, slotIndex)}
                              disabled={currentMode === 'view'}
                              className={`h-8 text-sm ${
                                hasError ? 'border-destructive' : 
                                hasInput ? 'border-primary bg-primary/5' : ''
                              }`}
                            />
                            {hasError && (
                              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              </div>
                            )}
                            {hasError && (
                              <div className="absolute top-full left-0 z-30 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded mt-1 whitespace-nowrap">
                                {errors[key]}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {activeStudents.length === 0 && (
          <div className="p-12 text-center">
            <div className="text-muted-foreground">
              <p>활성 학생이 없습니다.</p>
              <p className="text-sm mt-2">학생 목록에서 학생을 추가하거나 숨김을 해제해주세요.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
