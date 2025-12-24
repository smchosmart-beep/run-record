import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, CalendarDays, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Student } from '@/types';
import { calculateParticipationStats, ParticipationStats } from '@/utils/calculations';

const Attendance = () => {
  const { currentClassroom, updateClassroom, setCurrentClassroom } = useApp();
  const [totalDays, setTotalDays] = useState<string>(
    String(currentClassroom?.totalActivityDays ?? 0)
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!currentClassroom) return null;

  const activeStudents = currentClassroom.students.filter(s => !s.isHidden);
  const totalActivityDays = parseInt(totalDays) || 0;

  const participationData = useMemo(() => {
    return calculateParticipationStats(activeStudents, totalActivityDays);
  }, [activeStudents, totalActivityDays]);

  const handleSaveTotalDays = async () => {
    const days = parseInt(totalDays);
    if (isNaN(days) || days < 0) {
      toast.error('올바른 일수를 입력해주세요');
      return;
    }

    setIsSaving(true);
    try {
      await updateClassroom(currentClassroom.id, { totalActivityDays: days });
      setCurrentClassroom({ ...currentClassroom, totalActivityDays: days });
      toast.success('전체 활동일수가 저장되었습니다');
    } catch (error) {
      console.error('Failed to save total days:', error);
      toast.error('저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (stats: ParticipationStats) => {
    if (stats.participationDays === 0) {
      return <Badge variant="destructive">❌ 미참여</Badge>;
    }
    if (stats.participationRate >= 90) {
      return <Badge className="bg-amber-500 hover:bg-amber-600">🏆 완벽</Badge>;
    }
    if (stats.participationRate >= 70) {
      return <Badge className="bg-emerald-500 hover:bg-emerald-600">✅ 달성</Badge>;
    }
    return <Badge variant="secondary" className="bg-orange-200 text-orange-800">⚠️ 미달</Badge>;
  };

  // Summary stats
  const avgParticipation = participationData.length > 0
    ? Math.round(participationData.reduce((sum, p) => sum + p.participationRate, 0) / participationData.length)
    : 0;
  const perfectCount = participationData.filter(p => p.participationRate >= 90).length;
  const achievedCount = participationData.filter(p => p.participationRate >= 70 && p.participationRate < 90).length;

  return (
    <div className="space-y-6">
      {/* Total Days Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            전체 활동일수 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                value={totalDays}
                onChange={(e) => setTotalDays(e.target.value)}
                className="w-24 text-center"
                placeholder="0"
              />
              <span className="text-muted-foreground">일</span>
            </div>
            <Button onClick={handleSaveTotalDays} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-foreground" />
                </div>
                <p className="font-semibold text-muted-foreground">평균 참여율</p>
              </div>
              <p className="text-xl font-bold">{avgParticipation}%</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-lg">
                  <span className="text-lg">🏆</span>
                </div>
                <p className="font-semibold text-muted-foreground">완벽 달성</p>
              </div>
              <p className="text-xl font-bold">{perfectCount}명</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 rounded-lg">
                  <span className="text-lg">✅</span>
                </div>
                <p className="font-semibold text-muted-foreground">70% 이상</p>
              </div>
              <p className="text-xl font-bold">{achievedCount}명</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Participation Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            학생별 참여 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalActivityDays === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>먼저 전체 활동일수를 설정해주세요</p>
            </div>
          ) : participationData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>등록된 학생이 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">번호</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead className="text-center">참가일수</TableHead>
                    <TableHead className="text-center">전체일수</TableHead>
                    <TableHead className="text-center">참여율</TableHead>
                    <TableHead className="text-center">상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participationData.map((data) => (
                    <TableRow key={data.student.id}>
                      <TableCell className="text-center font-medium">
                        {data.student.number}
                      </TableCell>
                      <TableCell>{data.student.name}</TableCell>
                      <TableCell className="text-center">
                        {data.participationDays}
                      </TableCell>
                      <TableCell className="text-center">
                        {data.totalDays}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {data.participationRate}%
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(data)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
