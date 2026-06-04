import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApp } from '@/contexts/AppContext';
import { Student, Record as StudentRecord } from '@/types';
import { generateRecordId } from '@/utils/calculations';
import { parseTimeInput, validateTimeInput, formatTime } from '@/utils/time';
import { AlertCircle, Edit, Plus, ToggleLeft, ToggleRight, Eye, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

const RecordInput = () => {
  const { currentClassroom, updateClassroom, currentMode, setMode } = useApp();
  const { toast } = useToast();
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  if (!currentClassroom) return null;

  const activeStudents = currentClassroom.students
    .filter(s => !s.isHidden)
    .sort((a, b) => a.number - b.number);

  const getInputKey = (studentId: string, slotIndex: number) => 
    `${studentId}_${slotIndex}`;

  const getCellId = (studentId: string, slotIndex: number) =>
    `cell-${studentId}-${slotIndex}`;

  // Core save function (debounce-independent)
  const saveRecord = useCallback(async (student: Student, slotIndex: number, value: string) => {
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
      recordDate: new Date(),
      slotIndex,
    };

    const updatedRecords = student.records.filter(r => r.slotIndex !== slotIndex);
    updatedRecords.push(newRecord);

    const updatedStudents = currentClassroom.students.map(s =>
      s.id === student.id ? { ...s, records: updatedRecords } : s
    );

    const key = getInputKey(student.id, slotIndex);
    try {
      await updateClassroom(currentClassroom.id, {
        students: updatedStudents,
      }, false);

      setInputValues(prev => ({ ...prev, [key]: '' }));
      setErrors(prev => ({ ...prev, [key]: '' }));
    } catch (error) {
      console.error('Failed to save record:', error);
      setErrors(prev => ({ ...prev, [key]: '저장 실패' }));
      toast({
        title: "저장 실패",
        description: "기록 저장 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    }
  }, [currentClassroom, updateClassroom, toast]);

  // Flush any pending debounced save immediately
  const flushSave = useCallback((student: Student, slotIndex: number, value: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
    if (value.trim()) {
      void saveRecord(student, slotIndex, value);
    }
  }, [saveRecord]);

  // Debounced auto-save (delayed to allow finishing the hundredths digits)
  const debouncedSave = useCallback((student: Student, slotIndex: number, value: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      void saveRecord(student, slotIndex, value);
    }, 2500);
  }, [saveRecord]);

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
      return;
    }

    const student = activeStudents.find(s => s.id === studentId);
    if (student) {
      flushSave(student, slotIndex, value);
    }
  }, [activeStudents, flushSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, studentId: string, slotIndex: number) => {
    const studentIndex = activeStudents.findIndex(s => s.id === studentId);

    const moveKeys = ['Enter', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (moveKeys.includes(e.key)) {
      const currentValue = (e.currentTarget as HTMLInputElement).value;
      const student = activeStudents.find(s => s.id === studentId);
      if (student && currentValue.trim()) {
        const validation = validateTimeInput(currentValue);
        if (validation.isValid) {
          flushSave(student, slotIndex, currentValue);
        }
      }
    }

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
      if (slotIndex < currentClassroom.maxRecordSlots - 1) {
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
      // Move to previous student in same column
      if (studentIndex > 0) {
        const prevStudent = activeStudents[studentIndex - 1];
        const prevCellId = getCellId(prevStudent.id, slotIndex);
        const prevInput = document.getElementById(prevCellId) as HTMLInputElement;
        prevInput?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Move to next student in same column
      if (studentIndex < activeStudents.length - 1) {
        const nextStudent = activeStudents[studentIndex + 1];
        const nextCellId = getCellId(nextStudent.id, slotIndex);
        const nextInput = document.getElementById(nextCellId) as HTMLInputElement;
        nextInput?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      // Move to previous column (previous slot)
      if (slotIndex > 0) {
        const prevCellId = getCellId(studentId, slotIndex - 1);
        const prevInput = document.getElementById(prevCellId) as HTMLInputElement;
        prevInput?.focus();
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      // Move to next column (next slot)
      if (slotIndex < currentClassroom.maxRecordSlots - 1) {
        const nextCellId = getCellId(studentId, slotIndex + 1);
        const nextInput = document.getElementById(nextCellId) as HTMLInputElement;
        nextInput?.focus();
      }
    }
  }, [activeStudents, currentClassroom.maxRecordSlots, flushSave]);

  const getExistingRecord = (student: Student, slotIndex: number): StudentRecord | null => {
    return student.records.find(r => r.slotIndex === slotIndex) || null;
  };

  const clearRecord = (student: Student, slotIndex: number) => {
    const updatedRecords = student.records.filter(r => r.slotIndex !== slotIndex);
    
    const updatedStudents = currentClassroom.students.map(s =>
      s.id === student.id ? { ...s, records: updatedRecords } : s
    );

    updateClassroom(currentClassroom.id, {
      students: updatedStudents,
    }, false);

    // Clear input
    const key = getInputKey(student.id, slotIndex);
    setInputValues(prev => ({ ...prev, [key]: '' }));
  };

  const addRecordSlot = () => {
    if (currentClassroom.maxRecordSlots >= 15) {
      toast({
        title: "최대 회차 제한",
        description: "최대 15회까지만 추가할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    updateClassroom(currentClassroom.id, {
      maxRecordSlots: currentClassroom.maxRecordSlots + 1,
    });
    
    toast({
      title: "회차 추가 완료",
      description: `${currentClassroom.maxRecordSlots + 1}회차가 추가되었습니다.`,
    });
  };

  const deleteLastRecordSlot = () => {
    if (currentClassroom.maxRecordSlots <= 1) {
      toast({
        title: "삭제 불가",
        description: "최소 1회차는 유지되어야 합니다.",
        variant: "destructive",
      });
      return;
    }

    const lastSlotIndex = currentClassroom.maxRecordSlots - 1;
    
    // Count records that will be deleted
    const recordsToDelete = currentClassroom.students.reduce((count, student) => {
      return count + student.records.filter(r => r.slotIndex === lastSlotIndex).length;
    }, 0);

    // Remove all records from the last slot
    const updatedStudents = currentClassroom.students.map(student => ({
      ...student,
      records: student.records.filter(r => r.slotIndex !== lastSlotIndex)
    }));

    updateClassroom(currentClassroom.id, {
      students: updatedStudents,
      maxRecordSlots: currentClassroom.maxRecordSlots - 1,
    }, false);

    toast({
      title: "회차 삭제 완료",
      description: `${currentClassroom.maxRecordSlots}회차와 관련 기록 ${recordsToDelete}개가 삭제되었습니다.`,
    });

    setShowDeleteDialog(false);
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
    <div className="space-y-6">
      {/* Header with Mode Toggle and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">기록 관리</h3>
          <p className="text-muted-foreground mb-4">
            {currentMode === 'input' 
              ? "시간 형식: 1:23.45 (분:초.백분의초), 72.34 (초.백분의초), DNF (기록없음)"
              : "학생들의 기록을 확인하세요. 수정하려면 입력 모드로 전환하세요."
            }
          </p>
          {currentMode === 'input' && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd>
                <span>다음 학생</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-muted rounded text-xs">Tab</kbd>
                <span>다음 회차</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-muted rounded text-xs">↑↓</kbd>
                <span>학생 이동</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-muted rounded text-xs">←→</kbd>
                <span>회차 이동</span>
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
            className={`transition-all duration-200 ${
              currentMode === 'view' 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                : 'border-2 border-primary text-primary hover:bg-primary/10'
            }`}
          >
            {currentMode === 'view' ? (
              <>
                <Edit className="h-4 w-4 mr-2" />
                입력 모드로 전환
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                보기 모드로 전환
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
                disabled={currentClassroom.maxRecordSlots >= 15}
              >
                <Plus className="h-4 w-4 mr-2" />
                회차 추가
              </Button>
              
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentClassroom.maxRecordSlots <= 1}
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
                      {currentClassroom.maxRecordSlots}회차를 삭제하시겠습니까?
                      <br />
                      <span className="font-medium text-foreground">
                        해당 회차의 모든 기록이 함께 삭제됩니다.
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

      {/* Excel-style Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[70vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12 bg-muted/50 sticky left-0 z-20 border-r">번호</TableHead>
                  <TableHead className="w-28 bg-muted/50 sticky left-12 z-20 border-r">이름</TableHead>
                  {Array.from({ length: currentClassroom.maxRecordSlots }, (_, i) => (
                    <TableHead key={i} className="w-20 text-center">
                      {i + 1}회차
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeStudents.map((student, studentIndex) => (
                  <TableRow key={student.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium bg-muted/20 sticky left-0 z-10 border-r">
                      <Badge variant="outline">{student.number}</Badge>
                    </TableCell>
                    <TableCell className="font-medium bg-muted/20 sticky left-12 z-10 border-r">
                      {student.name}
                    </TableCell>
                    {Array.from({ length: currentClassroom.maxRecordSlots }, (_, slotIndex) => {
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
                                placeholder="00.00"
                                value={inputValues[key] || ''}
                                onChange={(e) => handleInputChange(student.id, slotIndex, e.target.value)}
                                onBlur={(e) => handleInputBlur(student.id, slotIndex, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, student.id, slotIndex)}
                                disabled={currentMode !== 'input'}
                                className={`h-8 text-sm ${
                                  hasError 
                                    ? 'border-destructive bg-destructive/5' 
                                    : hasInput 
                                      ? 'border-primary bg-primary/5' 
                                      : 'border-border'
                                } ${currentMode !== 'input' ? 'cursor-not-allowed opacity-50' : ''}`}
                              />
                              {hasError && (
                                <div className="absolute top-full left-0 z-50 mt-1 p-2 bg-destructive text-destructive-foreground text-xs rounded shadow-lg whitespace-nowrap">
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
        </CardContent>
      </Card>

      {/* Mobile View for small screens */}
      <div className="md:hidden">
        <div className="space-y-4">
          {activeStudents.map(student => (
            <Card key={student.id} className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Badge variant="outline">{student.number}번</Badge>
                <span className="font-semibold">{student.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: currentClassroom.maxRecordSlots }, (_, slotIndex) => {
                  const existingRecord = getExistingRecord(student, slotIndex);
                  const key = getInputKey(student.id, slotIndex);
                  const hasError = !!errors[key];

                  return (
                    <div key={slotIndex} className="space-y-1">
                      <label className="text-xs text-muted-foreground">{slotIndex + 1}회차</label>
                      {existingRecord ? (
                        <div className="flex items-center justify-between p-2 bg-success/10 rounded text-sm">
                          <span className="font-medium">
                            {existingRecord.isDNF ? 'DNF' : formatTime(existingRecord.time!)}
                          </span>
                          {currentMode === 'input' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => clearRecord(student, slotIndex)}
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div>
                          <Input
                            placeholder="00.00"
                            value={inputValues[key] || ''}
                            onChange={(e) => handleInputChange(student.id, slotIndex, e.target.value)}
                            onBlur={(e) => handleInputBlur(student.id, slotIndex, e.target.value)}
                            disabled={currentMode !== 'input'}
                            className={`h-8 text-sm ${hasError ? 'border-destructive' : ''} ${
                              currentMode !== 'input' ? 'cursor-not-allowed opacity-50' : ''
                            }`}
                          />
                          {hasError && (
                            <p className="text-xs text-destructive mt-1">{errors[key]}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {activeStudents.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">활성 상태인 학생이 없습니다.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecordInput;