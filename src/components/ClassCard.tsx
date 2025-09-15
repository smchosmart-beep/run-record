import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClassRoom } from '@/types';
import { Users, Calendar, Trophy, ArrowRight } from 'lucide-react';
import { calculateClassRankings, getClassBestRecord } from '@/utils/calculations';
import { formatTime } from '@/utils/time';

interface ClassCardProps {
  classroom: ClassRoom;
  onSelect: () => void;
}

const ClassCard: React.FC<ClassCardProps> = ({ classroom, onSelect }) => {
  const activeStudents = classroom.students.filter(s => !s.isHidden);
  const studentsWithRecords = activeStudents.filter(s => 
    s.records.some(r => r.time !== null && !r.isDNF)
  );
  
  const { byPersonalBest } = calculateClassRankings(activeStudents);
  const { time: bestTime, holders } = getClassBestRecord(activeStudents);
  
  const totalRecords = activeStudents.reduce((sum, s) => 
    sum + s.records.filter(r => r.time !== null && !r.isDNF).length, 0
  );

  return (
    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {classroom.school}
            </CardTitle>
            <CardDescription className="text-base font-medium">
              {classroom.grade}학년 {classroom.className}
            </CardDescription>
          </div>
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
            <p className="text-xs text-muted-foreground mb-1">최고 기록</p>
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
    </Card>
  );
};

export default ClassCard;