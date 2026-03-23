import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApp } from '@/contexts/AppContext';
import { Plus, LogOut, Users, Timer, RefreshCw, School, Monitor } from 'lucide-react';
import CreateClassModal from '@/components/CreateClassModal';
import ClassCard from '@/components/ClassCard';
import DashboardStopwatch from '@/components/DashboardStopwatch';

const Dashboard = () => {
  const { user, logout, classrooms, setCurrentClassroom, authLoading, dataLoading, refreshClassrooms } = useApp();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStopwatchOpen, setIsStopwatchOpen] = useState(false);
  const navigate = useNavigate();

  // 인증 로딩 중일 때만 전체화면 스피너 표시
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleClassSelect = (classroom: any) => {
    setCurrentClassroom(classroom);
    navigate('/classroom');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Timer className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  RRR
                </h1>
              </div>
              <span className="text-muted-foreground">|</span>
              <span className="text-foreground font-medium">{user.username}</span>
            </div>
            
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            대시보드
          </h2>
          <p className="text-muted-foreground">
            학급을 선택하거나 새로운 학급을 생성해서 시작하세요
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardContent className="px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-sky-100 rounded-lg">
                    <School className="h-6 w-6 text-foreground" />
                  </div>
                  <p className="text-xl font-bold text-muted-foreground">학급 수</p>
                </div>
                <p className="text-xl font-bold">{classrooms.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardContent className="px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-sky-100 rounded-lg">
                    <Users className="h-6 w-6 text-foreground" />
                  </div>
                  <p className="text-xl font-bold text-muted-foreground">등록 학생 수</p>
                </div>
                <p className="text-xl font-bold">
                  {classrooms.reduce((sum, c) => sum + c.students.length, 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardContent className="px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-sky-100 rounded-lg">
                    <Timer className="h-6 w-6 text-foreground" />
                  </div>
                  <p className="text-xl font-bold text-muted-foreground">총 기록 수</p>
                </div>
                <p className="text-xl font-bold">
                  {classrooms.reduce((sum, c) => 
                    sum + c.students.reduce((studentSum, s) => 
                      studentSum + s.records.filter(r => r.time !== null).length, 0
                    ), 0
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Classes Section */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <h3 className="text-2xl font-bold text-foreground whitespace-nowrap">학급 목록</h3>
          <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <Button onClick={() => navigate('/kiosk')} variant="outline" className="flex-1 sm:flex-initial shadow-md">
              <Monitor className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">키오스크</span>
            </Button>
            <Button onClick={() => setIsStopwatchOpen(true)} variant="outline" className="flex-1 sm:flex-initial shadow-md">
              <Timer className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">스톱워치</span>
            </Button>
            <Button onClick={refreshClassrooms} variant="outline" className="flex-1 sm:flex-initial" disabled={dataLoading}>
              <RefreshCw className={`h-4 w-4 sm:mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">새로고침</span>
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)} variant="speed" className="flex-1 sm:flex-initial shadow-lg">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">학급추가</span>
            </Button>
          </div>
        </div>

        {/* 데이터 로딩 중일 때 스켈레톤 표시 */}
        {dataLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6">
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : classrooms.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">아직 생성된 학급이 없습니다</CardTitle>
              <CardDescription className="mb-4">
                첫 번째 학급을 만들어서 학생들의 달리기 기록 관리를 시작해보세요
              </CardDescription>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                variant="speed"
                size="lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                첫 학급 만들기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map(classroom => (
              <ClassCard
                key={classroom.id}
                classroom={classroom}
                onSelect={() => handleClassSelect(classroom)}
              />
            ))}
          </div>
        )}
      </main>

      <CreateClassModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <DashboardStopwatch
        open={isStopwatchOpen}
        onOpenChange={setIsStopwatchOpen}
        onComplete={refreshClassrooms}
      />
    </div>
  );
};

export default Dashboard;