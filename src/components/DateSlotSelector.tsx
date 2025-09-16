import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, Clock, Users, AlertTriangle } from 'lucide-react';

interface DateSlotSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudentCount: number;
  onSelect: (date: Date, slotIndex: number) => void;
}

const DateSlotSelector: React.FC<DateSlotSelectorProps> = ({
  open,
  onOpenChange,
  selectedStudentCount,
  onSelect
}) => {
  const { currentClassroom } = useApp();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  if (!currentClassroom) return null;

  // Group records by date and calculate available slots
  const recordsByDate = useMemo(() => {
    const grouped: { [dateKey: string]: { date: Date; maxSlots: number; records: any[] } } = {};
    
    currentClassroom.students.forEach(student => {
      student.records.forEach(record => {
        const dateKey = format(record.recordDate, 'yyyy-MM-dd');
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = {
            date: record.recordDate,
            maxSlots: 1,
            records: []
          };
        }
        
        grouped[dateKey].records.push(record);
        grouped[dateKey].maxSlots = Math.max(
          grouped[dateKey].maxSlots, 
          record.slotIndex + 1
        );
      });
    });

    return grouped;
  }, [currentClassroom]);

  const availableDates = Object.keys(recordsByDate).sort((a, b) => b.localeCompare(a));

  const handleSelect = () => {
    if (selectedDate && selectedSlot !== null) {
      onSelect(selectedDate, selectedSlot);
      onOpenChange(false);
      setSelectedDate(null);
      setSelectedSlot(null);
    }
  };

  const getSlotRecordCount = (dateKey: string, slotIndex: number) => {
    return recordsByDate[dateKey].records.filter(r => r.slotIndex === slotIndex).length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            기록일 및 회차 선택
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            선택한 {selectedStudentCount}명의 학생 기록을 저장할 날짜와 회차를 선택하세요.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Selection */}
          <div>
            <h4 className="font-medium mb-3">기록 세션 선택</h4>
            {availableDates.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">생성된 기록 세션이 없습니다.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    기록 관리 메뉴에서 기록 세션을 먼저 생성해주세요.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableDates.map(dateKey => {
                  const session = recordsByDate[dateKey];
                  const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === dateKey;
                  
                  return (
                    <Card 
                      key={dateKey}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => {
                        setSelectedDate(session.date);
                        setSelectedSlot(null);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="font-medium">
                            {format(session.date, "M월 d일 (E)", { locale: ko })}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {session.maxSlots}회차
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              총 {session.records.length}개 기록
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Slot Selection */}
          {selectedDate && (
            <div>
              <h4 className="font-medium mb-3">회차 선택</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Array.from({ length: recordsByDate[format(selectedDate, 'yyyy-MM-dd')].maxSlots }, (_, index) => {
                  const slotIndex = index;
                  const dateKey = format(selectedDate, 'yyyy-MM-dd');
                  const existingRecordCount = getSlotRecordCount(dateKey, slotIndex);
                  const hasExistingRecords = existingRecordCount > 0;
                  const isSelected = selectedSlot === slotIndex;
                  
                  return (
                    <Card 
                      key={slotIndex}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedSlot(slotIndex)}
                    >
                      <CardContent className="p-3 text-center">
                        <div className="font-medium">{slotIndex + 1}회차</div>
                        {hasExistingRecords && (
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span className="text-xs text-amber-600">
                              {existingRecordCount}개 기록
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {selectedSlot !== null && getSlotRecordCount(format(selectedDate, 'yyyy-MM-dd'), selectedSlot) > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">덮어쓰기 경고</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    이 회차에는 이미 기록이 있습니다. 새로운 기록으로 덮어쓰여집니다.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button 
              onClick={handleSelect}
              disabled={!selectedDate || selectedSlot === null}
            >
              스톱워치 시작
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DateSlotSelector;