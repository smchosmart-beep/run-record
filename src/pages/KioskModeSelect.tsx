import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Timer, CheckCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const KioskModeSelect: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useApp();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

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
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              대시보드
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16 relative z-30">
        <h1 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          키오스크 모드 선택
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <Card
            className="p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-primary text-center"
            onClick={() => navigate('/kiosk/speed')}
          >
            <Timer className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">속도측정</h2>
            <p className="text-muted-foreground">
              스톱워치로 학생별 기록을 측정합니다
            </p>
          </Card>

          <Card
            className="p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-primary text-center"
            onClick={() => navigate('/kiosk/attendance')}
          >
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">출석체크</h2>
            <p className="text-muted-foreground">
              학생들의 출석 여부를 체크합니다
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default KioskModeSelect;
