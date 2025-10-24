import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RecordDateManager from '@/components/RecordDateManager';
import { LogOut, Calendar } from 'lucide-react';

export default function RecorderDashboard() {
  const navigate = useNavigate();
  const { 
    user, 
    session, 
    logout, 
    authLoading, 
    dataLoading,
    classrooms,
    currentClassroom,
    setCurrentClassroom 
  } = useApp();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/auth');
    }
  }, [session, authLoading, navigate]);

  // Set current classroom when classrooms load
  useEffect(() => {
    if (classrooms.length > 0 && !currentClassroom) {
      setCurrentClassroom(classrooms[0]);
    }
  }, [classrooms, currentClassroom, setCurrentClassroom]);

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  // Loading state
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // No classroom assigned
  if (!dataLoading && classrooms.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>⚠️ 학급 정보 없음</CardTitle>
            <CardDescription>할당된 학급을 찾을 수 없습니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              교사에게 학급 배정을 요청하세요.
            </p>
            <Button onClick={handleLogout} className="w-full">
              로그아웃
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Classroom not yet loaded
  if (!currentClassroom) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Calendar className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-bold">
                  {currentClassroom.school} {currentClassroom.grade}학년 {currentClassroom.className}반
                </h1>
                <p className="text-sm text-muted-foreground">기록 입력</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📝 기록 관리</CardTitle>
              <CardDescription>
                학생들의 기록을 입력하고 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecordDateManager />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
