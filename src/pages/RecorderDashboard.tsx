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

      // Get the classroom assigned to this recorder
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('classroom_id, classrooms(id, school, grade, class_name, max_record_slots)')
        .eq('user_id', user!.id)
        .eq('role', 'recorder')
        .single();

      if (roleError) throw roleError;

      if (!roleData || !roleData.classrooms) {
        throw new Error('할당된 학급을 찾을 수 없습니다');
      }

      setClassroomInfo(roleData.classrooms);
    } catch (error: any) {
      console.error('Error loading classroom info:', error);
      // If user is not a recorder, redirect to dashboard
      navigate('/dashboard');
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
