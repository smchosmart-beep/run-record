import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useApp } from '@/contexts/AppContext';
import { Student, Record } from '@/types';
import { calculateStudentStats, getBestTimeForRanking } from '@/utils/calculations';
import { formatTime } from '@/utils/time';
import { reorderStudentNumbers, validateStudentNumber, getNextStudentNumber } from '@/utils/studentUtils';
import { Plus, Eye, EyeOff, Hash, Type, Trash2, Edit, Undo2, Timer, CheckSquare, Maximize2, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteStudent, updateStudentNumberAtomically } from '@/utils/supabaseApi';
import StudentChart from './StudentChart';
import DateSlotSelector from './DateSlotSelector';
import Stopwatch from './Stopwatch';
import RecordAssignment from './RecordAssignment';
import ExpandedChartModal from './ExpandedChartModal';

const calculateClassTimeRange = (students: Student[]): [number, number] | null => {
  let minTime = Infinity;
  let maxTime = -Infinity;
  
  students.forEach(student => {
    student.records.forEach(record => {
      if (record.time !== null && !record.isDNF) {
        minTime = Math.min(minTime, record.time);
        maxTime = Math.max(maxTime, record.time);
      }
    });
  });
  
  if (minTime === Infinity) return null;
  
  // 5% 여백 추가
  const range = maxTime - minTime;
  const padding = Math.max(range * 0.05, 500); // 최소 0.5초 여백
  
  return [minTime - padding, maxTime + padding];
};
const StudentList = () => {
  const { currentClassroom, updateClassroom, currentMode, refreshClassrooms, setMode } = useApp();
  const {
    toast
  } = useToast();
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editingStudentNumber, setEditingStudentNumber] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentNumber, setNewStudentNumber] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  
  // Stopwatch related states
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [showStopwatch, setShowStopwatch] = useState(false);
  const [showRecordAssignment, setShowRecordAssignment] = useState(false);
  const [selectedDateSlot, setSelectedDateSlot] = useState<{ date: Date; slotIndex: number } | null>(null);
  const [recordedTimes, setRecordedTimes] = useState<number[]>([]);
  const [expandedChartStudent, setExpandedChartStudent] = useState<Student | null>(null);
  if (!currentClassroom) return null;
  const students = [...currentClassroom.students].sort((a, b) => a.number - b.number);
  const classTimeRange = calculateClassTimeRange(students);
  const handleEditStart = (student: Student) => {
    if (currentMode !== 'input') return;
    setEditingStudent(student.id);
    setEditName(student.name);
  };
  const handleEditSave = (studentId: string) => {
    if (!editName.trim()) {
      toast({
        title: "이름 오류",
        description: "학생 이름을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }
    const updatedStudents = currentClassroom.students.map(student => student.id === studentId ? {
      ...student,
      name: editName.trim()
    } : student);
    updateClassroom(currentClassroom.id, {
      students: updatedStudents,
    });
    setEditingStudent(null);
    setEditName('');
    toast({
      title: "수정 완료",
      description: "학생 이름이 변경되었습니다."
    });
  };
  const handleEditCancel = () => {
    setEditingStudent(null);
    setEditName('');
  };

  const handleNumberEditStart = (student: Student) => {
    if (currentMode !== 'input') return;
    setEditingStudentNumber(student.id);
    setEditNumber(student.number.toString());
  };

  const handleNumberEditSave = async (studentId: string) => {
    const newNumber = parseInt(editNumber);
    
    // 유효성 검사
    const validation = validateStudentNumber(newNumber);
    if (!validation.isValid) {
      toast({
        title: "번호 오류",
        description: validation.message,
        variant: "destructive"
      });
      return;
    }

    try {
      // 반 내 스왑을 포함한 원자적 변경 수행
      await updateStudentNumberAtomically(studentId, currentClassroom.id, newNumber);

      // 최신 데이터로 새로 고침 (전체 업데이트 호출 지양)
      await refreshClassrooms();
      
      setEditingStudentNumber(null);
      setEditNumber('');
      
      toast({
        title: "번호 변경 완료",
        description: "학생 번호가 성공적으로 변경되었습니다."
      });
    } catch (error) {
      console.error('Error updating student number:', error);
      toast({
        title: "번호 변경 실패",
        description: "번호 변경 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleNumberEditCancel = () => {
    setEditingStudentNumber(null);
    setEditNumber('');
  };
  const handleToggleVisibility = (student: Student) => {
    if (currentMode !== 'input') return;
    const updatedStudents = currentClassroom.students.map(s => s.id === student.id ? {
      ...s,
      isHidden: !s.isHidden
    } : s);
    updateClassroom(currentClassroom.id, {
      students: updatedStudents,
    });
    toast({
      title: student.isHidden ? "학생 활성화" : "학생 숨김",
      description: `${student.name}이 ${student.isHidden ? '활성화' : '숨김 처리'}되었습니다.`
    });
  };
  const addRecordSlot = () => {
    if (currentMode !== 'input') return;
    updateClassroom(currentClassroom.id, {
      maxRecordSlots: currentClassroom.maxRecordSlots + 1,
    });
    toast({
      title: "기록 슬롯 추가",
      description: `기록 슬롯이 ${currentClassroom.maxRecordSlots + 1}개로 증가했습니다.`
    });
  };

  const handleAddStudent = () => {
    setShowAddForm(true);
    setNewStudentName('');
    setNewStudentNumber(getNextStudentNumber(currentClassroom.students).toString());
  };

  const handleAddStudentSave = () => {
    if (!newStudentName.trim()) {
      toast({
        title: "이름 오류",
        description: "학생 이름을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    const studentNumber = parseInt(newStudentNumber);
    const validation = validateStudentNumber(studentNumber);
    if (!validation.isValid) {
      toast({
        title: "번호 오류",
        description: validation.message,
        variant: "destructive"
      });
      return;
    }

    // 새 학생 객체 생성
    const newStudent: Student = {
      id: crypto.randomUUID(),
      name: newStudentName.trim(),
      number: studentNumber,
      records: Array.from({ length: currentClassroom.maxRecordSlots }, (_, index) => ({
        id: crypto.randomUUID(),
        time: null,
        isDNF: false,
        recordedAt: new Date(),
        recordDate: new Date(), // Add current date
        slotIndex: index
      })),
      isHidden: false
    };

    // 번호 중복 확인 및 재정렬
    const existingStudent = currentClassroom.students.find(s => s.number === studentNumber);
    let updatedStudents;
    
    if (existingStudent) {
      // 기존 번호가 있으면 재정렬 로직 사용
      const tempStudents = [...currentClassroom.students, newStudent];
      const { updatedStudents: reorderedStudents } = reorderStudentNumbers(
        tempStudents,
        newStudent.id,
        studentNumber
      );
      updatedStudents = reorderedStudents;
    } else {
      // 기존 번호가 없으면 그냥 추가
      updatedStudents = [...currentClassroom.students, newStudent];
    }

    updateClassroom(currentClassroom.id, {
      students: updatedStudents
    });

    setShowAddForm(false);
    setNewStudentName('');
    setNewStudentNumber('');
    
    toast({
      title: "학생 추가 완료",
      description: `${newStudent.name}이 추가되었습니다.`
    });
  };

  const handleAddStudentCancel = () => {
    setShowAddForm(false);
    setNewStudentName('');
    setNewStudentNumber('');
  };

  const handleDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;

    try {
      // 데이터베이스에서 직접 학생과 기록 삭제
      await deleteStudent(studentToDelete.id);
      
      // 로컬 상태에서도 학생 제거
      const updatedStudents = currentClassroom.students.filter(s => s.id !== studentToDelete.id);
      
      updateClassroom(currentClassroom.id, {
        students: updatedStudents
      });

      toast({
        title: "학생 삭제 완료",
        description: `${studentToDelete.name}이 삭제되었습니다.`
      });
    } catch (error) {
      console.error('Error deleting student:', error);
      toast({
        title: "삭제 실패",
        description: "학생 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }

    setShowDeleteDialog(false);
    setStudentToDelete(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setStudentToDelete(null);
  };

  const toggleCardFlip = (studentId: string) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Stopwatch handlers
  const handleStudentSelect = (studentId: string, checked: boolean) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(studentId);
      } else {
        newSet.delete(studentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const visibleStudents = students.filter(s => !s.isHidden);
    const allSelected = visibleStudents.every(s => selectedStudents.has(s.id));
    
    if (allSelected) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(visibleStudents.map(s => s.id)));
    }
  };

  const handleStartStopwatch = () => {
    if (selectedStudents.size === 0) {
      toast({
        title: "학생 선택 필요",
        description: "기록을 측정할 학생을 먼저 선택해주세요.",
        variant: "destructive"
      });
      return;
    }
    setShowDateSelector(true);
  };

  const handleDateSlotSelect = (date: Date, slotIndex: number) => {
    setSelectedDateSlot({ date, slotIndex });
    setShowDateSelector(false);
    setShowStopwatch(true);
  };

  const handleStopwatchComplete = (times: number[]) => {
    setRecordedTimes(times);
    setShowStopwatch(false);
    setShowRecordAssignment(true);
  };

  const handleRecordAssignment = async (assignments: { studentId: string; time: number; rank: number }[]) => {
    if (!selectedDateSlot) return;

    try {
      // Update records for each assigned student
      const updatedStudents = currentClassroom.students.map(student => {
        const assignment = assignments.find(a => a.studentId === student.id);
        if (!assignment) return student;

        // Update the specific record slot
        const updatedRecords = student.records.map(record => {
          if (record.slotIndex === selectedDateSlot.slotIndex && 
              record.recordDate.toDateString() === selectedDateSlot.date.toDateString()) {
            return {
              ...record,
              time: assignment.time,
              isDNF: false,
              recordedAt: new Date()
            };
          }
          return record;
        });

        // If no existing record found, create a new one
        const hasExistingRecord = student.records.some(r => 
          r.slotIndex === selectedDateSlot.slotIndex && 
          r.recordDate.toDateString() === selectedDateSlot.date.toDateString()
        );

        if (!hasExistingRecord) {
          const newRecord: Record = {
            id: crypto.randomUUID(),
            time: assignment.time,
            isDNF: false,
            recordedAt: new Date(),
            recordDate: selectedDateSlot.date,
            slotIndex: selectedDateSlot.slotIndex
          };
          updatedRecords.push(newRecord);
        }

        return {
          ...student,
          records: updatedRecords
        };
      });

      // Update the classroom
      await updateClassroom(currentClassroom.id, {
        students: updatedStudents
      });

      // Reset all stopwatch states
      setSelectedStudents(new Set());
      setShowRecordAssignment(false);
      setSelectedDateSlot(null);
      setRecordedTimes([]);

      toast({
        title: "기록 저장 완료",
        description: `${assignments.length}명의 학생 기록이 저장되었습니다.`
      });

    } catch (error) {
      console.error('Error saving records:', error);
      toast({
        title: "저장 실패",
        description: "기록 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // Get selected students data
  const selectedStudentsData = Array.from(selectedStudents)
    .map(id => students.find(s => s.id === id))
    .filter(Boolean) as Student[];
  return <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-4">
          {/* 1. Add Student Button */}
          {currentMode === 'input' && (
            <Button onClick={handleAddStudent} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>학생 추가</span>
            </Button>
          )}

          {/* 2. Mode Toggle */}
          <Button
            onClick={() => setMode(currentMode === 'input' ? 'view' : 'input')}
            variant={currentMode === 'view' ? 'default' : 'outline'}
            className={`transition-all duration-200 ${
              currentMode === 'view' 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                : 'border-2 border-primary text-primary hover:bg-primary/10'
            }`}
          >
            {currentMode === 'view' ? (
              <>
                <Edit className="h-4 w-4 mr-2" />
                학생 추가/수정
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                학생 추가/수정 종료
              </>
            )}
          </Button>

          {/* Input mode description - only shown in input mode */}
          {currentMode === 'input' && (
            <div className="text-sm font-semibold text-foreground text-center mt-2 flex items-center justify-center gap-1">
              학생을 추가하거나 정보를 수정할 수 있습니다
            </div>
          )}

          {/* 3. Select All Button - 항상 표시 */}
          {students.filter(s => !s.isHidden).length > 0 && (
            <Button
              onClick={handleSelectAll}
              variant="outline"
              className="border-2 border-primary text-primary hover:bg-primary/10"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              {students.filter(s => !s.isHidden).every(s => selectedStudents.has(s.id)) ? '전체 해제' : '전체 선택'}
            </Button>
          )}

          {/* Stopwatch Button */}
          {selectedStudents.size > 0 && (
            <Button
              onClick={handleStartStopwatch}
              variant="default"
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Timer className="h-4 w-4 mr-2" />
              스톱워치 ({selectedStudents.size}명)
            </Button>
          )}
        </div>

      {/* Add Student Form */}
      {showAddForm && (
        <Card className="border-2 border-dashed border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg">새 학생 추가</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">이름</label>
              <Input
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="학생 이름을 입력하세요"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddStudentSave();
                  if (e.key === 'Escape') handleAddStudentCancel();
                }}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">번호</label>
              <Input
                type="number"
                value={newStudentNumber}
                onChange={(e) => setNewStudentNumber(e.target.value)}
                placeholder="학생 번호"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddStudentSave();
                  if (e.key === 'Escape') handleAddStudentCancel();
                }}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleAddStudentSave} variant="default">
                추가
              </Button>
              <Button onClick={handleAddStudentCancel} variant="outline">
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map(student => {
        const stats = calculateStudentStats(student);
        const isEditing = editingStudent === student.id;
        const isEditingNumber = editingStudentNumber === student.id;
        const isFlipped = flippedCards.has(student.id);
        return <Card key={student.id} className={`card-flip transition-all duration-500 ${student.isHidden ? 'opacity-50 grayscale' : 'hover:shadow-lg'} ${isFlipped ? 'flipped' : ''} ${selectedStudents.has(student.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
              {/* Card Front */}
              <div className={`card-face card-front ${isFlipped ? 'hidden' : ''}`}>
                <div 
                  className="cursor-pointer"
                  onClick={() => {
                    if (!student.isHidden && !isEditing && !isEditingNumber) {
                      // 모드와 관계없이 카드 클릭 시 학생 선택 (스톱워치용)
                      handleStudentSelect(student.id, !selectedStudents.has(student.id));
                    }
                  }}
                >
                   <CardHeader className="pb-2">
                     <div className="flex justify-between items-center">
                        {/* 휴지통 버튼 - 왼쪽으로 이동 */}
                        {currentMode === 'input' && !student.isHidden && !isEditing && !isEditingNumber && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStudent(student);
                            }}
                            className="mr-2 h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                       
                        <div className="flex-1">
                          {/* Number and Name on same line */}
                          <div className="flex items-center space-x-2">
                           {isEditingNumber ? (
                             <div className="flex items-center space-x-1">
                               <Input 
                                 type="number" 
                                 value={editNumber} 
                                 onChange={e => setEditNumber(e.target.value)}
                                 onKeyDown={e => {
                                   if (e.key === 'Enter') handleNumberEditSave(student.id);
                                   if (e.key === 'Escape') handleNumberEditCancel();
                                 }}
                                 className="w-16 h-6 text-xs px-1"
                                 autoFocus
                               />
                               <Button 
                                 size="sm" 
                                 variant="success" 
                                 onClick={() => handleNumberEditSave(student.id)}
                                 className="h-6 px-2 text-xs"
                               >
                                 저장
                               </Button>
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 onClick={handleNumberEditCancel}
                                 className="h-6 px-2 text-xs"
                               >
                                 취소
                               </Button>
                             </div>
                           ) : (
                             <div className="flex items-center space-x-2">
                               <Badge 
                                 variant="outline" 
                                 className="text-xs flex-shrink-0"
                               >
                                 {student.number}번
                               </Badge>
                               {isEditing ? (
                                 <div className="space-y-2 flex-1">
                                   <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => {
                                     if (e.key === 'Enter') handleEditSave(student.id);
                                     if (e.key === 'Escape') handleEditCancel();
                                   }} className="text-sm font-semibold" autoFocus />
                                   <div className="flex space-x-2">
                                     <Button size="sm" variant="success" onClick={() => handleEditSave(student.id)}>
                                       저장
                                     </Button>
                                     <Button size="sm" variant="outline" onClick={handleEditCancel}>
                                       취소
                                     </Button>
                                   </div>
                                 </div>
                               ) : (
                                 <h3 className="text-sm font-semibold">{student.name}</h3>
                               )}
                             </div>
                           )}
                           {student.isHidden && <Badge variant="secondary" className="text-xs">
                               숨김
                             </Badge>}
                         </div>
                      </div>
                      
                      {currentMode === 'input' && !isEditing && !isEditingNumber && <div className="flex space-x-1">
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleNumberEditStart(student); }} className="h-8 w-8 p-0" title="번호 수정">
                            <Hash className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEditStart(student); }} className="h-8 w-8 p-0" title="이름 수정">
                            <Type className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleToggleVisibility(student); }} className="h-8 w-8 p-0">
                            {student.isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); toggleCardFlip(student.id); }} className="h-8 w-8 p-0" title="차트 보기">
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                        </div>}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {/* Statistics - Single Line */}
                      <div className="text-center text-sm bg-muted/50 rounded p-2">
                         <span className="font-bold text-primary">
                           {currentClassroom.rankingType === 'slowest' ? '최장' : '최고'}: {(() => {
                             const bestTime = getBestTimeForRanking(student.records, currentClassroom.rankingType || 'fastest');
                             return bestTime ? formatTime(bestTime) : '--';
                           })()}
                         </span>
                        <span className="mx-2 text-muted-foreground">|</span>
                        <span className="font-bold text-secondary">
                          평균: {stats.averageTime ? formatTime(stats.averageTime) : '--'}
                        </span>
                      </div>

                      {/* Recent records */}
                      {student.records.length > 0 && <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">최근 기록</p>
                          <div className="flex flex-wrap gap-1">
                            {student.records.filter(r => r.time !== null || r.isDNF).slice(-5).map(record => <Badge key={record.id} variant={record.isDNF ? "destructive" : "secondary"} className="text-xs">
                                  {record.isDNF ? 'DNF' : formatTime(record.time!)}
                                </Badge>)}
                          </div>
                        </div>}
                    </div>
                  </CardContent>
                </div>
              </div>

              {/* Card Back */}
              <div className={`card-face card-back ${!isFlipped ? 'hidden' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {student.number}번
                      </Badge>
                      <CardTitle className="text-lg">{student.name}</CardTitle>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedChartStudent(student);
                        }}
                        className="h-6 w-6 p-0"
                        title="확대보기"
                      >
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => toggleCardFlip(student.id)}
                      className="h-8 w-8 p-0"
                      title="뒤집기"
                    >
                      <Undo2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">날짜별 {currentClassroom.rankingType === 'slowest' ? '최장' : '최고'}기록</p>
                    <StudentChart student={student} yAxisDomain={classTimeRange} />
                  </div>
                </CardContent>
              </div>
            </Card>;
      })}
      </div>

      {students.length === 0 && <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">등록된 학생이 없습니다.</p>
          </CardContent>
        </Card>}

      {/* 학생 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>학생 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {studentToDelete && (
                <div className="space-y-2">
                  <p><strong>{studentToDelete.name}</strong>을(를) 삭제하시겠습니까?</p>
                  <p className="text-sm text-muted-foreground">
                    • 학생의 모든 기록이 함께 삭제됩니다
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • 학생 번호는 그대로 유지됩니다
                  </p>
                  <p className="text-sm text-destructive font-medium">
                    이 작업은 되돌릴 수 없습니다.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stopwatch Modals */}
      <DateSlotSelector
        open={showDateSelector}
        onOpenChange={setShowDateSelector}
        selectedStudentCount={selectedStudents.size}
        onSelect={handleDateSlotSelect}
      />

      <Stopwatch
        open={showStopwatch}
        onOpenChange={setShowStopwatch}
        selectedStudentCount={selectedStudents.size}
        onComplete={handleStopwatchComplete}
        rankingType={currentClassroom?.rankingType as 'fastest' | 'slowest' || 'fastest'}
      />

      <RecordAssignment
        open={showRecordAssignment}
        onOpenChange={setShowRecordAssignment}
        recordedTimes={recordedTimes}
        selectedStudents={selectedStudentsData}
        onSave={handleRecordAssignment}
        rankingType={currentClassroom?.rankingType as 'fastest' | 'slowest' || 'fastest'}
      />

      <ExpandedChartModal
        open={expandedChartStudent !== null}
        onOpenChange={(open) => !open && setExpandedChartStudent(null)}
        student={expandedChartStudent}
        yAxisDomain={classTimeRange}
      />
    </div>;
};
export default StudentList;