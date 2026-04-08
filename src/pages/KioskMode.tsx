import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Plus, Timer, Save, Loader2, Play, CheckSquare } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import KioskStudentCard, { KioskStudent } from '@/components/KioskStudentCard';
import KioskAddStudentModal from '@/components/KioskAddStudentModal';
import { saveSpeedRecordsBatch } from '@/utils/supabaseApi';

const KioskMode: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId');
  const { user, classrooms, refreshClassrooms } = useApp();
  const selectedClassroom = classrooms.find(c => c.id === classId);

  const storageKey = classId ? `kiosk_speed_students_${classId}` : 'kiosk_speed_students';

  const [kioskStudents, setKioskStudents] = useState<KioskStudent[]>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(kioskStudents));
  }, [kioskStudents, storageKey]);

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
      await saveSpeedRecordsBatch(
        [{ studentId: student.studentId, timeMs: student.elapsedTime }],
        student.classroomId
      );
      
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

  const handleSaveAllRecords = useCallback(async () => {
    if (isSavingAll) return;

    const studentsToSave = kioskStudents.filter(
      s => (s.status === 'paused' || s.status === 'actions') && s.elapsedTime > 0
    );

    if (studentsToSave.length === 0) {
      toast.warning('저장할 기록이 없습니다.');
      return;
    }

    setIsSavingAll(true);

    try {
      // 학급별로 그룹핑
      const byClass = new Map<string, { studentId: string; timeMs: number }[]>();
      for (const s of studentsToSave) {
        const arr = byClass.get(s.classroomId) || [];
        arr.push({ studentId: s.studentId, timeMs: s.elapsedTime });
        byClass.set(s.classroomId, arr);
      }

      await Promise.all(
        Array.from(byClass.entries()).map(([classroomId, records]) =>
          saveSpeedRecordsBatch(records, classroomId)
        )
      );
      
      setKioskStudents(prev =>
        prev.map(s =>
          studentsToSave.find(saved => saved.id === s.id)
            ? { ...s, status: 'idle' as const, startTime: null, elapsedTime: 0 }
            : s
        )
      );

      toast.success(`${studentsToSave.length}명의 기록이 저장되었습니다.`);
      refreshClassrooms();
    } catch (error) {
      console.error('Failed to save records:', error);
      toast.error('기록 저장에 실패했습니다.');
    } finally {
      setIsSavingAll(false);
    }
  }, [kioskStudents, refreshClassrooms, isSavingAll]);

  const savableCount = kioskStudents.filter(
    s => (s.status === 'paused' || s.status === 'actions') && s.elapsedTime > 0
  ).length;

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const idleSelectedCount = kioskStudents.filter(
    s => selectedIds.has(s.id) && s.status === 'idle'
  ).length;

  const handleSimultaneousStart = useCallback(() => {
    const now = Date.now();
    setKioskStudents(prev =>
      prev.map(s =>
        selectedIds.has(s.id) && s.status === 'idle'
          ? { ...s, status: 'running' as const, startTime: now, elapsedTime: 0 }
          : s
      )
    );
    setSelectedIds(new Set());
    setIsSelectMode(false);
    toast.success(`${idleSelectedCount}명 동시 시작!`);
  }, [selectedIds, idleSelectedCount]);

  const existingStudentIds = kioskStudents.map(s => s.studentId);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const headerTitle = selectedClassroom
    ? `${selectedClassroom.grade}-${selectedClassroom.className} 속도측정`
    : '키오스크 모드';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 relative">
      {/* Morning Run 워터마크 */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-20">
        <span className="text-[12vw] font-bold text-primary/10 select-none tracking-widest">
          Morning Run
        </span>
      </div>
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/kiosk/speed/select')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                학급 선택
              </Button>
              <span className="text-muted-foreground">|</span>
              <div className="flex items-center space-x-2">
                <Timer className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {headerTitle}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            variant="outline"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            학생 추가
          </Button>
          {kioskStudents.length > 0 && (
            <>
              <Button
                onClick={() => {
                  setIsSelectMode(prev => !prev);
                  setSelectedIds(new Set());
                }}
                variant={isSelectMode ? "default" : "outline"}
                size="lg"
              >
                <CheckSquare className="h-5 w-5 mr-2" />
                {isSelectMode ? '선택 취소' : '선택 모드'}
              </Button>
              {isSelectMode && (
                <Button
                  onClick={handleSimultaneousStart}
                  size="lg"
                  disabled={idleSelectedCount === 0}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Play className="h-5 w-5 mr-2" />
                  동시 시작 {idleSelectedCount > 0 && `(${idleSelectedCount}명)`}
                </Button>
              )}
              <Button
                onClick={handleSaveAllRecords}
                size="lg"
                disabled={savableCount === 0 || isSavingAll}
              >
                {isSavingAll ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    일괄 저장 {savableCount > 0 && `(${savableCount}명)`}
                  </>
                )}
              </Button>
            </>
          )}
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
                isSelectMode={isSelectMode}
                isSelected={selectedIds.has(student.id)}
                onToggleSelect={handleToggleSelect}
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
        classroomId={classId || undefined}
      />
    </div>
  );
};

export default KioskMode;
