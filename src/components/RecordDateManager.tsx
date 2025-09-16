import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useApp } from '@/contexts/AppContext';
import { RecordSession as RecordSessionComponent } from './RecordSession';
import { format, startOfDay, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecordSession } from '@/types';
import { getRecordSessions, upsertRecordSession } from '@/utils/supabaseApi';
import { useToast } from '@/hooks/use-toast';

const RecordDateManager = () => {
  const { currentClassroom } = useApp();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [recordSessions, setRecordSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  if (!currentClassroom) return null;

  // Fetch record sessions from database
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const sessions = await getRecordSessions(currentClassroom.id);
        setRecordSessions(sessions);
      } catch (error) {
        console.error('기록 세션 조회 실패:', error);
      }
    };

    fetchSessions();
  }, [currentClassroom.id]);

  // Group records by date and merge with database sessions
  const recordsByDate = useMemo(() => {
    const grouped: { [date: string]: RecordSession } = {};
    
    // First, add records from students
    currentClassroom.students.forEach(student => {
      student.records.forEach(record => {
        const dateKey = format(record.recordDate, 'yyyy-MM-dd');
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = {
            id: `session-${dateKey}`,
            date: record.recordDate,
            maxSlots: 1,
            records: [],
            studentCount: 0
          };
        }
        
        grouped[dateKey].records.push(record);
        grouped[dateKey].maxSlots = Math.max(
          grouped[dateKey].maxSlots, 
          record.slotIndex + 1
        );
      });
    });

    // Calculate student count for each date with records
    Object.keys(grouped).forEach(dateKey => {
      const studentIds = new Set(grouped[dateKey].records.map(r => 
        currentClassroom.students.find(s => s.records.some(sr => sr.id === r.id))?.id
      ));
      grouped[dateKey].studentCount = studentIds.size;
    });

    // Merge with database record sessions (including empty ones)
    recordSessions.forEach(session => {
      const dateKey = session.session_date;
      const sessionDate = new Date(session.session_date + 'T00:00:00');
      
      if (grouped[dateKey]) {
        // Update maxSlots from database if it's higher
        grouped[dateKey].maxSlots = Math.max(
          grouped[dateKey].maxSlots,
          session.slots_count
        );
      } else {
        // Create session entry for dates with no records but have sessions
        grouped[dateKey] = {
          id: `session-${dateKey}`,
          date: sessionDate,
          maxSlots: session.slots_count,
          records: [],
          studentCount: 0
        };
      }
    });

    return grouped;
  }, [currentClassroom, recordSessions]);

  // Get available dates (dates with records)
  const availableDates = useMemo(() => {
    return Object.keys(recordsByDate).sort((a, b) => b.localeCompare(a));
  }, [recordsByDate]);

  // Current session for selected date
  const currentSession = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return recordsByDate[dateKey] || null;
  }, [selectedDate, recordsByDate]);

  // Create new session for selected date
  const createNewSession = async () => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    
    if (recordsByDate[dateKey]) {
      // Session already exists, just show it
      return;
    }

    setLoading(true);
    try {
      // Create session in database
      await upsertRecordSession(currentClassroom.id, selectedDate, currentClassroom.maxRecordSlots);
      
      // Refresh sessions from database
      const updatedSessions = await getRecordSessions(currentClassroom.id);
      setRecordSessions(updatedSessions);
      
      toast({
        title: "기록 세션 생성 완료",
        description: `${format(selectedDate, "M월 d일", { locale: ko })} 기록 세션이 생성되었습니다.`,
      });
    } catch (error) {
      console.error('기록 세션 생성 실패:', error);
      toast({
        title: "생성 실패",
        description: "기록 세션 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">기록 관리</h3>
          <p className="text-muted-foreground">
            날짜별로 기록을 관리하고 입력할 수 있습니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Picker */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "yyyy년 M월 d일", { locale: ko })
                ) : (
                  <span>날짜를 선택하세요</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(startOfDay(date));
                    setIsCalendarOpen(false);
                  }
                }}
                initialFocus
                className="pointer-events-auto"
                locale={ko}
              />
            </PopoverContent>
          </Popover>

          {/* Create New Session Button */}
          {!currentSession && (
            <Button onClick={createNewSession} disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              {loading ? "생성 중..." : "새 기록 세션"}
            </Button>
          )}
        </div>
      </div>

      {/* Available Sessions Overview */}
      {availableDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              기록 세션 목록
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableDates.map(dateKey => {
                const session = recordsByDate[dateKey];
                const isSelected = format(selectedDate, 'yyyy-MM-dd') === dateKey;
                
                return (
                  <Card 
                    key={dateKey}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      isSelected && "ring-2 ring-primary bg-primary/5"
                    )}
                    onClick={() => setSelectedDate(new Date(dateKey + 'T00:00:00'))}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="font-medium">
                          {format(session.date, "M월 d일 (E)", { locale: ko })}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {session.studentCount}명
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {session.maxSlots}회차
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          총 {session.records.length}개 기록
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Session or Empty State */}
      {currentSession ? (
        <RecordSessionComponent 
          session={currentSession}
          selectedDate={selectedDate}
        />
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="text-6xl opacity-20">📅</div>
              <div>
                <h4 className="text-lg font-medium text-muted-foreground">
                  {format(selectedDate, "yyyy년 M월 d일", { locale: ko })} 기록이 없습니다
                </h4>
                <p className="text-sm text-muted-foreground mt-2">
                  새 기록 세션을 만들어 기록을 입력해보세요.
                </p>
              </div>
              <Button onClick={createNewSession} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                {loading ? "생성 중..." : "새 기록 세션 만들기"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecordDateManager;