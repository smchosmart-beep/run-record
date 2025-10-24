import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RecordDateManager from '@/components/RecordDateManager';
import { LogOut, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function RecorderDashboard() {
  const navigate = useNavigate();
  const { user, session, logout, authLoading } = useApp();
  const [classroomInfo, setClassroomInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/auth');
      return;
    }

    if (session && user) {
      loadClassroomInfo();
    }
  }, [session, user, authLoading, navigate]);

  const loadClassroomInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Get the classroom_id from user_roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('classroom_id')
        .eq('user_id', user!.id)
        .eq('role', 'recorder')
        .single();

      if (roleError) throw roleError;

      if (!roleData || !roleData.classroom_id) {
        throw new Error('할당된 학급을 찾을 수 없습니다');
      }

      // Step 2: Get the classroom information directly
      const { data: classroomData, error: classroomError } = await supabase
        .from('classrooms')
        .select('id, school, grade, class_name, max_record_slots')
        .eq('id', roleData.classroom_id)
        .single();

      if (classroomError) throw classroomError;

      if (!classroomData) {
        throw new Error('학급 정보를 불러올 수 없습니다');
      }

      setClassroomInfo(classroomData);
    } catch (error: any) {
      console.error('Error loading classroom info:', error);
      setError(error.message || '학급 정보를 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>⚠️ 학급 정보 로딩 실패</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              할당된 학급을 찾을 수 없습니다. 교사에게 문의하세요.
            </p>
            <Button onClick={handleLogout} className="w-full">
              로그아웃
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!classroomInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>오류</CardTitle>
            <CardDescription>학급 정보를 불러올 수 없습니다</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogout}>로그아웃</Button>
          </CardContent>
        </Card>
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
                  {classroomInfo.school} {classroomInfo.grade}학년 {classroomInfo.class_name}반
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
