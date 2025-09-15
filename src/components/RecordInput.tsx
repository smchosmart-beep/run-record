import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { Student, Record as StudentRecord } from '@/types';
import { generateRecordId } from '@/utils/calculations';
import { parseTimeInput, validateTimeInput, formatTime } from '@/utils/time';
import { Save, RotateCcw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RecordInput = () => {
  const { currentClassroom, updateClassroom, currentMode } = useApp();
  const { toast } = useToast();
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentSlot, setCurrentSlot] = useState(0);

  if (!currentClassroom) return null;

  const activeStudents = currentClassroom.students
    .filter(s => !s.isHidden)
    .sort((a, b) => a.number - b.number);

  const getInputKey = (studentId: string, slotIndex: number) => 
    `${studentId}_${slotIndex}`;

  const handleInputChange = useCallback((studentId: string, slotIndex: number, value: string) => {
    const key = getInputKey(studentId, slotIndex);
    setInputValues(prev => ({ ...prev, [key]: value }));
    
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  }, [errors]);

  const handleInputBlur = useCallback((studentId: string, slotIndex: number, value: string) => {
    if (!value.trim()) return;
    
    const validation = validateTimeInput(value);
    const key = getInputKey(studentId, slotIndex);
    
    if (!validation.isValid && validation.error) {
      setErrors(prev => ({ ...prev, [key]: validation.error! }));
    }
  }, []);

  const saveRecord = (student: Student, slotIndex: number) => {
    const key = getInputKey(student.id, slotIndex);
    const inputValue = inputValues[key]?.trim();

    if (!inputValue) {
      toast({
        title: "입력 오류",
        description: "기록을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const validation = validateTimeInput(inputValue);
    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, [key]: validation.error! }));
      return;
    }

    const isDNF = inputValue.toUpperCase() === 'DNF';
    const time = isDNF ? null : parseTimeInput(inputValue);

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
    setInputValues(prev => ({ ...prev, [key]: '' }));
    setErrors(prev => ({ ...prev, [key]: '' }));

    toast({
      title: "기록 저장",
      description: `${student.name}의 기록이 저장되었습니다.`,
    });
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

    toast({
      title: "기록 삭제",
      description: `${student.name}의 기록이 삭제되었습니다.`,
    });
  };

  const getExistingRecord = (student: Student, slotIndex: number): StudentRecord | null => {
    return student.records.find(r => r.slotIndex === slotIndex) || null;
  };

  if (currentMode !== 'input') {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle className="text-xl mb-2">입력 모드로 전환하세요</CardTitle>
          <p className="text-muted-foreground">
            기록을 입력하려면 상단의 "입력 모드" 버튼을 클릭하세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-foreground mb-2">기록 입력</h3>
        <p className="text-muted-foreground mb-4">
          시간 형식: 1:23.45 (분:초.백분의초), 72.34 (초.백분의초), DNF (기록없음)
        </p>
        
        {/* Slot Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Array.from({ length: currentClassroom.maxRecordSlots }, (_, i) => (
            <Button
              key={i}
              variant={currentSlot === i ? "speed" : "outline"}
              size="sm"
              onClick={() => setCurrentSlot(i)}
            >
              {i + 1}회차
            </Button>
          ))}
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {activeStudents.map(student => {
          const existingRecord = getExistingRecord(student, currentSlot);
          const key = getInputKey(student.id, currentSlot);
          const hasError = !!errors[key];

          return (
            <Card key={student.id} className="p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{student.number}번</Badge>
                  <span className="font-semibold">{student.name}</span>
                </div>
                <Badge variant="secondary">{currentSlot + 1}회차</Badge>
              </div>

              <div className="space-y-3">
                {existingRecord ? (
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="font-medium">
                      {existingRecord.isDNF ? 'DNF' : formatTime(existingRecord.time!)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => clearRecord(student, currentSlot)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      삭제
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="1:23.45 또는 DNF"
                      value={inputValues[key] || ''}
                      onChange={(e) => handleInputChange(student.id, currentSlot, e.target.value)}
                      onBlur={(e) => handleInputBlur(student.id, currentSlot, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveRecord(student, currentSlot);
                        }
                      }}
                      className={hasError ? 'border-destructive' : ''}
                    />
                    {hasError && (
                      <p className="text-sm text-destructive">{errors[key]}</p>
                    )}
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => saveRecord(student, currentSlot)}
                      disabled={!inputValues[key]?.trim()}
                      className="w-full"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      저장
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Card>
          <CardHeader>
            <CardTitle>{currentSlot + 1}회차 기록 입력</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeStudents.map(student => {
                const existingRecord = getExistingRecord(student, currentSlot);
                const key = getInputKey(student.id, currentSlot);
                const hasError = !!errors[key];

                return (
                  <div key={student.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <div className="flex items-center space-x-3 w-32">
                      <Badge variant="outline">{student.number}번</Badge>
                      <span className="font-medium">{student.name}</span>
                    </div>

                    <div className="flex-1">
                      {existingRecord ? (
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-lg">
                            {existingRecord.isDNF ? 'DNF' : formatTime(existingRecord.time!)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {existingRecord.recordedAt.toLocaleString()}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => clearRecord(student, currentSlot)}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            삭제
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 max-w-xs">
                            <Input
                              placeholder="1:23.45 또는 DNF"
                              value={inputValues[key] || ''}
                              onChange={(e) => handleInputChange(student.id, currentSlot, e.target.value)}
                              onBlur={(e) => handleInputBlur(student.id, currentSlot, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveRecord(student, currentSlot);
                                }
                              }}
                              className={hasError ? 'border-destructive' : ''}
                            />
                            {hasError && (
                              <p className="text-sm text-destructive mt-1">{errors[key]}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => saveRecord(student, currentSlot)}
                            disabled={!inputValues[key]?.trim()}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            저장
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
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