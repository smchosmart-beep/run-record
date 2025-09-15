import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useApp } from '@/contexts/AppContext';
import { Student } from '@/types';
import { calculateStudentStats } from '@/utils/calculations';
import { formatTime } from '@/utils/time';
import { reorderStudentNumbers, validateStudentNumber, getNextStudentNumber, reorderAfterDeletion } from '@/utils/studentUtils';
import { Plus, Eye, EyeOff, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
const StudentList = () => {
  const {
    currentClassroom,
    updateClassroom,
    currentMode
  } = useApp();
  const {
    toast
  } = useToast();
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editingStudentNumber, setEditingStudentNumber] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [showNumberConfirmDialog, setShowNumberConfirmDialog] = useState(false);
  const [numberChangePreview, setNumberChangePreview] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentNumber, setNewStudentNumber] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  if (!currentClassroom) return null;
  const students = [...currentClassroom.students].sort((a, b) => a.number - b.number);
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

  const handleNumberEditSave = (studentId: string) => {
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
      // 번호 변경 미리보기 생성
      const { updatedStudents, preview } = reorderStudentNumbers(
        currentClassroom.students, 
        studentId, 
        newNumber
      );

      if (preview.totalChanges <= 1) {
        // 변경사항이 1개 이하면 즉시 적용
        applyNumberChange(updatedStudents);
      } else {
        // 변경사항이 많으면 확인 다이얼로그 표시
        setNumberChangePreview({ updatedStudents, preview, studentId, newNumber });
        setShowNumberConfirmDialog(true);
      }
    } catch (error) {
      toast({
        title: "번호 변경 오류",
        description: error instanceof Error ? error.message : "번호 변경 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const applyNumberChange = (updatedStudents: Student[]) => {
    updateClassroom(currentClassroom.id, {
      students: updatedStudents,
    });
    
    setEditingStudentNumber(null);
    setEditNumber('');
    setShowNumberConfirmDialog(false);
    setNumberChangePreview(null);
    
    toast({
      title: "번호 변경 완료",
      description: "학생 번호가 성공적으로 변경되었습니다."
    });
  };

  const handleNumberEditCancel = () => {
    setEditingStudentNumber(null);
    setEditNumber('');
  };

  const handleNumberConfirmApply = () => {
    if (numberChangePreview) {
      applyNumberChange(numberChangePreview.updatedStudents);
    }
  };

  const handleNumberConfirmCancel = () => {
    setShowNumberConfirmDialog(false);
    setNumberChangePreview(null);
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

  const handleDeleteConfirm = () => {
    if (!studentToDelete) return;

    const updatedStudents = reorderAfterDeletion(currentClassroom.students, studentToDelete.id);
    
    updateClassroom(currentClassroom.id, {
      students: updatedStudents
    });

    toast({
      title: "학생 삭제 완료",
      description: `${studentToDelete.name}이 삭제되었습니다.`
    });

    setShowDeleteDialog(false);
    setStudentToDelete(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setStudentToDelete(null);
  };
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-foreground">학생 명단</h3>
          <p className="text-muted-foreground">
            총 {students.filter(s => !s.isHidden).length}명의 활성 학생
          </p>
        </div>
        
        {currentMode === 'input' && (
          <Button onClick={handleAddStudent} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>학생 추가</span>
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
        return <Card key={student.id} className={`transition-all duration-300 ${student.isHidden ? 'opacity-50 grayscale' : 'hover:shadow-lg'}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
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
                        <Badge 
                          variant="outline" 
                          className={`text-xs cursor-pointer hover:bg-muted/50 ${currentMode === 'input' ? 'hover:border-primary' : ''}`}
                          onClick={() => currentMode === 'input' && handleNumberEditStart(student)}
                        >
                          {student.number}번
                        </Badge>
                      )}
                      {student.isHidden && <Badge variant="secondary" className="text-xs">
                          숨김
                        </Badge>}
                    </div>
                    
                    {isEditing ? <div className="space-y-2">
                        <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => {
                    if (e.key === 'Enter') handleEditSave(student.id);
                    if (e.key === 'Escape') handleEditCancel();
                  }} className="text-lg font-semibold" autoFocus />
                        <div className="flex space-x-2">
                          <Button size="sm" variant="success" onClick={() => handleEditSave(student.id)}>
                            저장
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleEditCancel}>
                            취소
                          </Button>
                        </div>
                      </div> : <CardTitle className="text-lg">{student.name}</CardTitle>}
                  </div>
                  
                  {currentMode === 'input' && !isEditing && !isEditingNumber && <div className="flex space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEditStart(student)} className="h-8 w-8 p-0">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleVisibility(student)} className="h-8 w-8 p-0">
                        {student.isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteStudent(student)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-xs text-muted-foreground">최고 기록</p>
                      <p className="font-bold text-primary">
                        {stats.personalBest ? formatTime(stats.personalBest) : '--'}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-xs text-muted-foreground">평균 기록</p>
                      <p className="font-bold text-secondary">
                        {stats.averageTime ? formatTime(stats.averageTime) : '--'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Record count */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      유효 기록: <span className="font-semibold">{stats.validRecordsCount}</span>개
                    </p>
                  </div>

                  {/* Recent records */}
                  {student.records.length > 0 && <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">최근 기록</p>
                      <div className="flex flex-wrap gap-1">
                        {student.records.filter(r => r.time !== null || r.isDNF).slice(-3).map(record => <Badge key={record.id} variant={record.isDNF ? "destructive" : "secondary"} className="text-xs">
                              {record.isDNF ? 'DNF' : formatTime(record.time!)}
                            </Badge>)}
                      </div>
                    </div>}
                </div>
              </CardContent>
            </Card>;
      })}
      </div>

      {students.length === 0 && <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">등록된 학생이 없습니다.</p>
          </CardContent>
        </Card>}

      {/* 번호 변경 확인 다이얼로그 */}
      <AlertDialog open={showNumberConfirmDialog} onOpenChange={setShowNumberConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>번호 변경 확인</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>번호를 변경하면 다른 학생들의 번호도 자동으로 조정됩니다.</p>
                {numberChangePreview && (
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">변경될 학생들:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {numberChangePreview.preview.affectedStudents.map((student: any) => (
                        <div key={student.id} className="text-sm p-2 bg-muted rounded">
                          <span className="font-medium">{student.name}</span>: 
                          <span className="ml-1">{student.oldNumber}번</span>
                          <span className="mx-1">→</span>
                          <span className="font-semibold text-primary">{student.newNumber}번</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      총 {numberChangePreview.preview.totalChanges}명의 번호가 변경됩니다.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleNumberConfirmCancel}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleNumberConfirmApply}>변경하기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                    • 뒤에 있는 학생들의 번호가 자동으로 앞당겨집니다
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
    </div>;
};
export default StudentList;