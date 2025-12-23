import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ClassRoom } from '@/types';
import { Users, Calendar, Timer, ArrowRight, Trash2, Edit } from 'lucide-react';
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
      <CardHeader className="py-3 px-4">
        <div className="space-y-1">
          {/* 상단: 학교명 + 편집 버튼 vs 학년도 + 삭제 버튼 */}
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                {classroom.school}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
                aria-label="학급 정보 수정"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditModalOpen(true);
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="text-right">
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 mr-1" />
                  {(() => {
                    const year = classroom.createdAt.getFullYear();
                    const month = classroom.createdAt.getMonth();
                    return month < 2 ? year - 1 : year;
                  })()}학년도
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label="학급 삭제"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
          
          {/* 하단: 학급명 */}
          <CardDescription className="text-sm font-medium text-left">
            {classroom.grade}학년 {classroom.className}
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 pb-3 pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-primary mr-1" />
              <span className="text-lg font-bold text-primary">{activeStudents.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">학생</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center">
              <Timer className="h-3.5 w-3.5 text-secondary mr-1" />
              <span className="text-lg font-bold text-secondary">{totalRecords}</span>
            </div>
            <p className="text-xs text-muted-foreground">기록</p>
          </div>
        </div>

        {bestTime && holders.length > 0 && (
          <div className="bg-muted/50 rounded-md p-2 text-center">
            <p className="text-xs text-muted-foreground">
              {classroom.rankingType === 'slowest' ? '최장 기록' : '최고 기록'}
            </p>
            <p className="font-bold text-base text-gold">
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