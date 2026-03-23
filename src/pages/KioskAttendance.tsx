import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Plus, CheckCircle, Save, Loader2, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import KioskAddStudentModal from '@/components/KioskAddStudentModal';
import { KioskStudent } from '@/components/KioskStudentCard';
import { saveMultiClassRecords } from '@/utils/supabaseApi';

type AttendanceStatus = 'unchecked' | 'present' | 'absent';

interface AttendanceStudent extends KioskStudent {
  attendanceStatus: AttendanceStatus;
}

const KioskAttendance: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshClassrooms } = useApp();
  const [students, setStudents] = useState<AttendanceStudent[]>(() => {
    try {
      const saved = sessionStorage.getItem('kiosk_attendance_students');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddStudents = useCallback((newStudents: KioskStudent[]) => {
    const attendanceStudents: AttendanceStudent[] = newStudents.map(s => ({
      ...s,
      attendanceStatus: 'unchecked' as AttendanceStatus,
    }));
    setStudents(prev => [...prev, ...attendanceStudents]);
    toast.success(`${newStudents.length}명의 학생이 추가되었습니다.`);
  }, []);

  const handleToggleAttendance = useCallback((id: string) => {
    setStudents(prev =>
      prev.map(s => {
        if (s.id !== id) return s;
        const next: AttendanceStatus =
          s.attendanceStatus === 'unchecked' ? 'present' :
          s.attendanceStatus === 'present' ? 'absent' : 'unchecked';
        return { ...s, attendanceStatus: next };
      })
    );
  }, []);

  const handleRemoveStudent = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStudents(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleSaveAll = useCallback(async () => {
    if (isSaving) return;

    const presentStudents = students.filter(s => s.attendanceStatus === 'present');
    if (presentStudents.length === 0) {
      toast.warning('출석 체크된 학생이 없습니다.');
      return;
    }

    setIsSaving(true);
    try {
      const records = presentStudents.map(s => ({
        studentId: s.studentId,
        classroomId: s.classroomId,
        timeMs: 0,
        isAttendance: true,
      }));

      await saveMultiClassRecords(records);

      // Reset all to unchecked after save
      setStudents(prev =>
        prev.map(s => ({ ...s, attendanceStatus: 'unchecked' as AttendanceStatus }))
      );

      toast.success(`${presentStudents.length}명의 출석이 저장되었습니다.`);
      refreshClassrooms();
    } catch (error) {
      console.error('Failed to save attendance:', error);
      toast.error('출석 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [students, isSaving, refreshClassrooms]);

  const presentCount = students.filter(s => s.attendanceStatus === 'present').length;
  const absentCount = students.filter(s => s.attendanceStatus === 'absent').length;
  const existingStudentIds = students.map(s => s.studentId);

  const getCardStyle = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return 'border-green-500 bg-green-500/10 ring-2 ring-green-500/30';
      case 'absent':
        return 'border-destructive bg-destructive/10 ring-2 ring-destructive/30';
      default:
        return 'border-border hover:border-primary/50';
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'absent':
        return <X className="h-8 w-8 text-destructive" />;
      default:
        return <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return '출석';
      case 'absent': return '결석';
      default: return '탭하여 출석';
    }
  };

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
                onClick={() => navigate('/kiosk')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                모드 선택
              </Button>
              <span className="text-muted-foreground">|</span>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  출석체크 키오스크
                </h1>
              </div>
            </div>
            {students.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-600 font-medium">출석 {presentCount}</span>
                <span className="text-destructive font-medium">결석 {absentCount}</span>
                <span className="text-muted-foreground">미체크 {students.length - presentCount - absentCount}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-30">
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
          {students.length > 0 && (
            <Button
              onClick={handleSaveAll}
              size="lg"
              disabled={presentCount === 0 || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  출석 저장 {presentCount > 0 && `(${presentCount}명)`}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Student Cards Grid */}
        {students.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">추가된 학생이 없습니다</p>
              <p className="text-sm">+ 학생 추가 버튼을 눌러 학생을 추가하세요</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {students.map(student => (
              <Card
                key={student.id}
                className={`relative p-3 cursor-pointer transition-all duration-200 ${getCardStyle(student.attendanceStatus)}`}
                onClick={() => handleToggleAttendance(student.id)}
              >
                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-0.5 right-0.5 h-5 w-5 text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleRemoveStudent(student.id, e)}
                >
                  <X className="h-3 w-3" />
                </Button>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{student.classroomLabel}</p>
                  <p className="text-lg font-bold">{student.number}번</p>
                  <p className="text-xs font-medium truncate mb-2">{student.name}</p>
                  <div className="flex flex-col items-center gap-1">
                    {getStatusIcon(student.attendanceStatus)}
                    <p className="text-xs text-muted-foreground">
                      {getStatusLabel(student.attendanceStatus)}
                    </p>
                  </div>
                </div>
              </Card>
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

export default KioskAttendance;
