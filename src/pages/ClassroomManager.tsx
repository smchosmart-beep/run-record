import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { ArrowLeft, Timer, Users, Trophy, BarChart3, Edit, Eye } from 'lucide-react';
import StudentList from '@/components/StudentList';
import RecordDateManager from '@/components/RecordDateManager';
import Rankings from '@/components/Rankings';

const ClassroomManager = () => {
  const { user, currentClassroom, currentMode, setMode, setCurrentClassroom, updateClassroom } = useApp();
  const [activeTab, setActiveTab] = useState('students');

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!currentClassroom) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleModeToggle = () => {
    setMode(currentMode === 'view' ? 'input' : 'view');
  };

  const handleRankingTypeChange = async (value: 'fastest' | 'slowest') => {
    if (!currentClassroom) return;
    try {
      await updateClassroom(currentClassroom.id, { rankingType: value });
      setCurrentClassroom({ ...currentClassroom, rankingType: value });
    } catch (e) {
      console.error('랭킹 유형 변경 실패', e);
    }
  };
  const activeStudents = currentClassroom.students.filter(s => !s.isHidden);
  const totalRecords = activeStudents.reduce((sum, s) => 
    sum + s.records.filter(r => r.time !== null && !r.isDNF).length, 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12 sm:h-14 lg:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                onClick={() => setCurrentClassroom(null)}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                aria-label="대시보드로 돌아가기"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-2">
                <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <div>
                  <h1 className="text-sm sm:text-base font-semibold text-foreground">
                    {currentClassroom.school}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {currentClassroom.grade}학년 {currentClassroom.className}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Select
                value={currentClassroom.rankingType ?? 'fastest'}
                onValueChange={(value) => handleRankingTypeChange(value as 'fastest' | 'slowest')}
              >
                <SelectTrigger className="w-[75px] sm:w-[140px] lg:w-[180px] text-xs sm:text-sm px-2 sm:px-3">
                  <SelectValue placeholder="랭킹 유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fastest" className="text-xs sm:text-sm">
                    <span className="sm:hidden">빠른순</span>
                    <span className="hidden sm:inline">시간 빠른 순</span>
                  </SelectItem>
                  <SelectItem value="slowest" className="text-xs sm:text-sm">
                    <span className="sm:hidden">느린순</span>
                    <span className="hidden sm:inline">시간 느린 순</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{activeStudents.length}</p>
                  <p className="text-sm text-muted-foreground">활성 학생</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{totalRecords}</p>
                  <p className="text-sm text-muted-foreground">총 기록</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Trophy className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xl font-bold">{currentClassroom.maxRecordSlots}</p>
                  <p className="text-sm text-muted-foreground">기록 슬롯</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="students">학생 명단</TabsTrigger>
            <TabsTrigger value="records">기록 관리</TabsTrigger>
            <TabsTrigger value="rankings">순위 보기</TabsTrigger>
          </TabsList>
          
          <TabsContent value="students">
            <StudentList />
          </TabsContent>
          
          <TabsContent value="records">
            <RecordDateManager />
          </TabsContent>
          
          <TabsContent value="rankings">
            <Rankings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ClassroomManager;