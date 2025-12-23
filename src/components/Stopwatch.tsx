import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatTime } from '@/utils/time';
import { Play, Square, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StopwatchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudentCount: number;
  onComplete: (times: number[]) => void;
  rankingType?: 'fastest' | 'slowest';
}

const Stopwatch: React.FC<StopwatchProps> = ({
  open,
  onOpenChange,
  selectedStudentCount,
  onComplete,
  rankingType = 'fastest'
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [recordedTimes, setRecordedTimes] = useState<number[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      handleReset();
    }
  }, [open]);

  // Update current time when running
  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(Date.now() - startTime);
      }, 10); // Update every 10ms for smooth display
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, startTime]);

  const handleStart = () => {
    const now = Date.now();
    setStartTime(now);
    setCurrentTime(0);
    setIsRunning(true);
    setHasStarted(true);
    setRecordedTimes([]);
  };

  const handleStop = () => {
    if (!isRunning || !startTime) return;

    const stopTime = Date.now() - startTime;
    const newRecordedTimes = [...recordedTimes, stopTime];
    setRecordedTimes(newRecordedTimes);

    // If this was the last stop, finish the stopwatch
    if (newRecordedTimes.length >= selectedStudentCount) {
      setIsRunning(false);
      setTimeout(() => {
        onComplete(newRecordedTimes);
      }, 500); // Small delay to show the final time
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setStartTime(null);
    setCurrentTime(0);
    setRecordedTimes([]);
    setHasStarted(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const remainingStops = selectedStudentCount - recordedTimes.length;
  const canStop = isRunning && remainingStops > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full h-full max-h-none m-0 p-0 rounded-none border-none bg-background">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b bg-card">
            <div className="text-center">
              <h2 className="text-lg font-semibold">스톱워치</h2>
              <p className="text-sm text-muted-foreground">
                {selectedStudentCount}명의 학생 기록 측정
              </p>
            </div>
          </div>

          {/* Main Timer Display */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
            {/* Current Time Display */}
            <div className="text-center mb-6">
              <div className="text-6xl md:text-8xl font-mono font-bold text-primary tabular-nums">
                {formatTime(currentTime)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                현재 시간
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="w-full max-w-sm mb-8">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>기록된 횟수</span>
                <span>{recordedTimes.length} / {selectedStudentCount}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(recordedTimes.length / selectedStudentCount) * 100}%` }}
                />
              </div>
            </div>

            {/* Fixed Position Start/Stop Buttons */}
            <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2">
              {!hasStarted ? (
                <Button
                  onClick={handleStart}
                  size="lg"
                  className="w-32 h-32 rounded-full text-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex flex-col items-center">
                    <Play className="h-8 w-8 mb-2" />
                    시작
                  </div>
                </Button>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <Button
                    onClick={handleStop}
                    disabled={!canStop}
                    size="lg"
                    variant={canStop ? "destructive" : "secondary"}
                    className={cn(
                      "w-32 h-32 rounded-full text-xl font-semibold shadow-lg transition-all",
                      canStop && "hover:shadow-xl animate-pulse"
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <Square className="h-8 w-8 mb-2" />
                      정지
                    </div>
                  </Button>
                  
                  {remainingStops > 0 && (
                    <p className="text-sm text-muted-foreground text-center whitespace-nowrap">
                      {remainingStops}번 더 정지할 수 있습니다
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recorded Times */}
          <div className="p-4 border-t bg-card">
            <h3 className="text-sm font-medium mb-3">기록된 시간</h3>
            <div className="grid grid-cols-2 gap-2 h-32 overflow-y-auto">
              {recordedTimes.length === 0 ? (
                <div className="col-span-2 flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">
                    아직 기록이 없습니다
                  </p>
                </div>
              ) : (
                recordedTimes.map((time, index) => {
                  // rankingType에 따라 등수 계산
                  const rank = rankingType === 'slowest' 
                    ? recordedTimes.length - index  // 느린순: 나중에 정지한 것이 1등
                    : index + 1;                     // 빠른순: 먼저 정지한 것이 1등
                  
                  return (
                    <Card key={index} className="p-2">
                      <div className="text-center">
                        <Badge variant="outline" className="text-xs mb-1">
                          {rank}등
                        </Badge>
                        <div className="font-mono text-sm font-semibold">
                          {formatTime(time)}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="p-4 border-t bg-card">
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleReset} disabled={isRunning}>
                <RotateCcw className="h-4 w-4 mr-2" />
                리셋
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Stopwatch;