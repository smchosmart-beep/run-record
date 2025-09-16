import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ClassRoom } from '@/types';
import { Users, Calendar, Trophy, ArrowRight, Trash2, Edit } from 'lucide-react';
import EditClassModal from '@/components/EditClassModal';
import { calculateClassRankings, getClassBestRecord } from '@/utils/calculations';
import { formatTime } from '@/utils/time';
import { useApp } from '@/contexts/AppContext';

interface ClassCardProps {
  classroom: ClassRoom;
  onSelect: () => void;
}

const ClassCard: React.FC<ClassCardProps> = ({ classroom, onSelect }) => {
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { deleteClassroom } = useApp();
  
  const activeStudents = classroom.students.filter(s => !s.isHidden);
  const studentsWithRecords = activeStudents.filter(s => 
    s.records.some(r => r.time !== null && !r.isDNF)
  );
  
  const { byPersonalBest } = calculateClassRankings(activeStudents, classroom.rankingType || 'fastest');
  const { time: bestTime, holders } = getClassBestRecord(activeStudents, classroom.rankingType || 'fastest');
  
  const totalRecords = activeStudents.reduce((sum, s) => 
    sum + s.records.filter(r => r.time !== null && !r.isDNF).length, 0
  );

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteClassroom(classroom.id);
    } catch (error) {
      console.error('Failed to delete classroom:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                aria-label="학급 정보 수정"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditModalOpen(true);
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <div>
                <CardTitle className="text-lg">
                  {classroom.school}
                </CardTitle>
                <CardDescription className="text-base font-medium">
                  {classroom.grade}학년 {classroom.className}
                </CardDescription>
              </div>
            </div>
          </div>
            <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                {(() => {
                  const year = classroom.createdAt.getFullYear();
                  const month = classroom.createdAt.getMonth(); // 0-based (0=January)
                  // 3월(month=2) 이전이면 이전 학년도
                  return month < 2 ? year - 1 : year;
                })()}학년도
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label="학급 삭제"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>학급 삭제 확인</AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>{classroom.school} {classroom.grade}학년 {classroom.className}</strong>을(를) 삭제하시겠습니까?
                    <br />
                    <br />
                    <span className="text-destructive font-medium">
                      해당 학급의 모든 학생과 기록이 영구히 삭제됩니다.
                    </span>
                    <br />
                    이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDelete}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? '삭제 중...' : '삭제'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="h-4 w-4 text-primary mr-1" />
            </div>
            <p className="text-2xl font-bold text-primary">{activeStudents.length}</p>
            <p className="text-xs text-muted-foreground">학생</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Trophy className="h-4 w-4 text-secondary mr-1" />
            </div>
            <p className="text-2xl font-bold text-secondary">{totalRecords}</p>
            <p className="text-xs text-muted-foreground">기록</p>
          </div>
        </div>

        {bestTime && holders.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">
              {classroom.rankingType === 'slowest' ? '최장 기록' : '최고 기록'}
            </p>
            <p className="font-bold text-lg text-gold">
              {formatTime(bestTime)}
            </p>
            <p className="text-xs text-muted-foreground">
              {holders[0].name}
              {holders.length > 1 && ` 외 ${holders.length - 1}명`}
            </p>
          </div>
        )}

        <Button 
          onClick={onSelect}
          variant="speed"
          className="w-full group-hover:shadow-md"
        >
          학급 관리
          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
      
      <EditClassModal
        classroom={classroom}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />
    </Card>
  );
};

export default ClassCard;