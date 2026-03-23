import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Users } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { KioskStudent } from './KioskStudentCard';

interface KioskAddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddStudents: (students: KioskStudent[]) => void;
  existingStudentIds: string[];
}

const KioskAddStudentModal: React.FC<KioskAddStudentModalProps> = ({
  open,
  onOpenChange,
  onAddStudents,
  existingStudentIds,
}) => {
  const { classrooms } = useApp();
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<KioskStudent[]>([]);

  const selectedClassroom = classrooms.find(c => c.id === selectedClassroomId);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedClassroomId(null);
      setSelectedStudents([]);
    }
    onOpenChange(isOpen);
  };

  const handleStudentToggle = (student: any, classroom: any) => {
    const kioskStudent: KioskStudent = {
      id: `${student.id}-${Date.now()}`,
      studentId: student.id,
      number: student.number,
      name: student.name,
      classroomId: classroom.id,
      classroomLabel: `${classroom.grade}-${classroom.className}`,
      status: 'idle',
      startTime: null,
      elapsedTime: 0,
    };

    const exists = selectedStudents.find(s => s.studentId === student.id);
    if (exists) {
      setSelectedStudents(prev => prev.filter(s => s.studentId !== student.id));
    } else {
      setSelectedStudents(prev => [...prev, kioskStudent]);
    }
  };

  const handleConfirm = () => {
    onAddStudents(selectedStudents);
    handleClose(false);
  };

  const isStudentSelected = (studentId: string) => {
    return selectedStudents.some(s => s.studentId === studentId);
  };

  const isStudentAlreadyAdded = (studentId: string) => {
    return existingStudentIds.includes(studentId);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            학생 추가
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {selectedClassroomId === null ? (
            // Classroom Selection View
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">학급을 선택하세요</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {classrooms.map(classroom => {
                  const visibleStudents = classroom.students.filter(s => !s.isHidden);
                  return (
                    <Card
                      key={classroom.id}
                      onClick={() => setSelectedClassroomId(classroom.id)}
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-all hover:scale-105 hover:shadow-md"
                    >
                      <div className="text-center">
                        <span className="text-xl font-bold">
                          {classroom.grade}-{classroom.className}
                        </span>
                        <p className="text-sm text-muted-foreground mt-1">
                          {visibleStudents.length}명
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            // Student Selection View
            <div className="space-y-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setSelectedClassroomId(null)}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                학급 선택으로 돌아가기
              </Button>

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {selectedClassroom?.grade}-{selectedClassroom?.className} 학생 선택
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!selectedClassroom) return;
                    const availableStudents = selectedClassroom.students
                      .filter(s => !s.isHidden && !isStudentAlreadyAdded(s.id));
                    const allSelected = availableStudents.every(s => isStudentSelected(s.id));
                    if (allSelected) {
                      const availableIds = new Set(availableStudents.map(s => s.id));
                      setSelectedStudents(prev => prev.filter(s => !availableIds.has(s.studentId)));
                    } else {
                      const newStudents = availableStudents
                        .filter(s => !isStudentSelected(s.id))
                        .map(s => ({
                          id: `${s.id}-${Date.now()}`,
                          studentId: s.id,
                          number: s.number,
                          name: s.name,
                          classroomId: selectedClassroom.id,
                          classroomLabel: `${selectedClassroom.grade}-${selectedClassroom.className}`,
                          status: 'idle' as const,
                          startTime: null,
                          elapsedTime: 0,
                        }));
                      setSelectedStudents(prev => [...prev, ...newStudents]);
                    }
                  }}
                >
                  {selectedClassroom && selectedClassroom.students
                    .filter(s => !s.isHidden && !isStudentAlreadyAdded(s.id))
                    .every(s => isStudentSelected(s.id))
                    ? '전체 해제' : '전체 선택'}
                </Button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {selectedClassroom?.students
                  .filter(s => !s.isHidden)
                  .sort((a, b) => a.number - b.number)
                  .map(student => {
                    const alreadyAdded = isStudentAlreadyAdded(student.id);
                    const selected = isStudentSelected(student.id);

                    return (
                      <Card
                        key={student.id}
                        onClick={() => !alreadyAdded && handleStudentToggle(student, selectedClassroom)}
                        className={`p-2 text-center cursor-pointer transition-all ${
                          alreadyAdded
                            ? 'opacity-50 cursor-not-allowed bg-muted'
                            : selected
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <p className="text-lg font-bold">{student.number}</p>
                        <p className="text-xs truncate">{student.name}</p>
                        {alreadyAdded && (
                          <p className="text-xs text-muted-foreground">추가됨</p>
                        )}
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Footer with selected count and confirm button */}
        <div className="border-t pt-4 mt-4 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            선택된 학생: {selectedStudents.length}명
          </p>
          <Button
            onClick={handleConfirm}
            disabled={selectedStudents.length === 0}
          >
            추가하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KioskAddStudentModal;
