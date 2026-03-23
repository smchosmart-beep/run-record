import React from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, School } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const KioskClassSelect: React.FC = () => {
  const navigate = useNavigate();
  const { mode } = useParams<{ mode: string }>();
  const { user, classrooms } = useApp();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (mode !== 'speed' && mode !== 'attendance') {
    return <Navigate to="/kiosk" replace />;
  }

  const modeLabel = mode === 'speed' ? '속도측정' : '출석체크';

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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/kiosk')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              모드 선택
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16 relative z-30">
        <h1 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {modeLabel} - 학급 선택
        </h1>
        <p className="text-center text-muted-foreground mb-12">
          키오스크를 사용할 학급을 선택하세요
        </p>

        {classrooms.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-muted-foreground">
              <School className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">등록된 학급이 없습니다</p>
              <p className="text-sm">대시보드에서 학급을 먼저 추가하세요</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {classrooms.map(classroom => {
              const visibleStudents = classroom.students.filter(s => !s.isHidden);
              return (
                <Card
                  key={classroom.id}
                  className="p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-primary text-center"
                  onClick={() => navigate(`/kiosk/${mode}?classId=${classroom.id}`)}
                >
                  <School className="h-12 w-12 mx-auto mb-3 text-primary" />
                  <p className="text-sm text-muted-foreground">{classroom.school}</p>
                  <h2 className="text-2xl font-bold">{classroom.grade}학년 {classroom.className}반</h2>
                  <p className="text-muted-foreground mt-2">
                    학생 {visibleStudents.length}명
                  </p>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default KioskClassSelect;
