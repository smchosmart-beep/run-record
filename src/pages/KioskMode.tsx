import React, { useState, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Plus, Timer } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import KioskStudentCard, { KioskStudent } from '@/components/KioskStudentCard';
import KioskAddStudentModal from '@/components/KioskAddStudentModal';
import { saveMultiClassRecords, MultiClassRecordInput } from '@/utils/supabaseApi';

const KioskMode: React.FC = () => {
  const navigate = useNavigate();
  const { user, classrooms, refreshClassrooms } = useApp();
  const [kioskStudents, setKioskStudents] = useState<KioskStudent[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // Note: selectedDate and selectedSlot are no longer needed as saveMultiClassRecords handles this automatically

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleAddStudents = (students: KioskStudent[]) => {
    setKioskStudents(prev => [...prev, ...students]);
    toast.success(`${students.length}명의 학생이 추가되었습니다.`);
  };

  const handleUpdateStudent = useCallback((id: string, updates: Partial<KioskStudent>) => {
    setKioskStudents(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const handleRemoveStudent = useCallback((id: string) => {
    setKioskStudents(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleSaveRecord = useCallback(async (student: KioskStudent) => {
    try {
      const recordData = [{
        studentId: student.studentId,
        classroomId: student.classroomId,
        timeMs: student.elapsedTime,
      }];

      await saveMultiClassRecords(recordData);
      
      // Remove or reset the student card after saving
      setKioskStudents(prev =>
        prev.map(s =>
          s.id === student.id
            ? { ...s, status: 'idle' as const, startTime: null, elapsedTime: 0 }
            : s
        )
      );

      toast.success(`${student.name} 기록이 저장되었습니다.`);
      refreshClassrooms();
    } catch (error) {
      console.error('Failed to save record:', error);
      toast.error('기록 저장에 실패했습니다.');
    }
  }, [refreshClassrooms]);

  const existingStudentIds = kioskStudents.map(s => s.studentId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                대시보드
              </Button>
              <span className="text-muted-foreground">|</span>
              <div className="flex items-center space-x-2">
                <Timer className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  키오스크 모드
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Button */}
        <div className="mb-6">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            <Plus className="h-5 w-5 mr-2" />
            학생 추가
          </Button>
        </div>

        {/* Student Cards Grid */}
        {kioskStudents.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-muted-foreground">
              <Timer className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">추가된 학생이 없습니다</p>
              <p className="text-sm">+ 학생 추가 버튼을 눌러 학생을 추가하세요</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {kioskStudents.map(student => (
              <KioskStudentCard
                key={student.id}
                student={student}
                onUpdate={handleUpdateStudent}
                onRemove={handleRemoveStudent}
                onSaveRecord={handleSaveRecord}
              />
            ))}
          </div>
        )}
      </main>

      <KioskAddStudentModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onAddStudents={handleAddStudents}
        existingStudentIds={existingStudentIds}
      />
    </div>
  );
};

export default KioskMode;
