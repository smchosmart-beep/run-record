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
import { AlertCircle, Edit, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RecordInput = () => {
  const { currentClassroom, updateClassroom, currentMode, setMode } = useApp();
  const { toast } = useToast();
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  if (!currentClassroom) return null;

  const activeStudents = currentClassroom.students
    .filter(s => !s.isHidden)
    .sort((a, b) => a.number - b.number);

  const getInputKey = (studentId: string, slotIndex: number) => 
    `${studentId}_${slotIndex}`;

  const getCellId = (studentId: string, slotIndex: number) =>
    `cell-${studentId}-${slotIndex}`;

  // Debounced auto-save function
  const debouncedSave = useCallback((student: Student, slotIndex: number, value: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
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
        slotIndex,
      };

      // Remove any existing record for this slot
      const updatedRecords = student.records.filter(r => r.slotIndex !== slotIndex);
      updatedRecords.push(newRecord);

      const updatedStudents = currentClassroom.students.map(s =>
        s.id === student.id ? { ...s, records: updatedRecords } : s
      );

      updateClassroom({
        ...currentClassroom,
        students: updatedStudents,
        updatedAt: new Date(),
      });

      // Clear input and error
      const key = getInputKey(student.id, slotIndex);
      setInputValues(prev => ({ ...prev, [key]: '' }));
      setErrors(prev => ({ ...prev, [key]: '' }));
    }, 1000);
  }, [currentClassroom, updateClassroom]);

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
    }
  }, [activeStudents, currentClassroom.maxRecordSlots]);

  const getExistingRecord = (student: Student, slotIndex: number): StudentRecord | null => {
    return student.records.find(r => r.slotIndex === slotIndex) || null;
  };

  const clearRecord = (student: Student, slotIndex: number) => {
    const updatedRecords = student.records.filter(r => r.slotIndex !== slotIndex);
    
    const updatedStudents = currentClassroom.students.map(s =>
      s.id === student.id ? { ...s, records: updatedRecords } : s
    );

    updateClassroom({
      ...currentClassroom,
      students: updatedStudents,
      updatedAt: new Date(),
    });

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

    updateClassroom({
      ...currentClassroom,
      maxRecordSlots: currentClassroom.maxRecordSlots + 1,
      updatedAt: new Date(),
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
                <kbd className="px-2 py-1 bg-muted rounded text-xs">Shift+Tab</kbd>
                <span>이전 회차</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <Button
            onClick={() => setMode(currentMode === 'input' ? 'view' : 'input')}
            variant={currentMode === 'input' ? 'default' : 'outline'}
            size="sm"
          >
            {currentMode === 'input' ? (
              <>
                <ToggleRight className="h-4 w-4 mr-2" />
                입력 모드
              </>
            ) : (
              <>
                <ToggleLeft className="h-4 w-4 mr-2" />
                보기 모드
              </>
            )}
          </Button>
          
          {/* Add Slot Button */}
          {currentMode === 'input' && (
            <Button
              onClick={addRecordSlot}
              variant="outline"
              size="sm"
              disabled={currentClassroom.maxRecordSlots >= 15}
            >
              <Plus className="h-4 w-4 mr-2" />
              회차 추가
            </Button>
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