import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Save, X } from 'lucide-react';
import { formatTime } from '@/utils/time';

export type KioskStudentStatus = 'idle' | 'running' | 'paused' | 'actions';

export interface KioskStudent {
  id: string;
  studentId: string;
  number: number;
  name: string;
  classroomId: string;
  classroomLabel: string;
  status: KioskStudentStatus;
  startTime: number | null;
  elapsedTime: number;
}

interface KioskStudentCardProps {
  student: KioskStudent;
  onUpdate: (id: string, updates: Partial<KioskStudent>) => void;
  onRemove: (id: string) => void;
  onSaveRecord: (student: KioskStudent) => void;
}

const KioskStudentCard: React.FC<KioskStudentCardProps> = ({
  student,
  onUpdate,
  onRemove,
  onSaveRecord,
}) => {
  const [displayTime, setDisplayTime] = useState(student.elapsedTime);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (student.status === 'running' && student.startTime) {
      const updateTime = () => {
        const now = Date.now();
        const elapsed = student.elapsedTime + (now - student.startTime!);
        setDisplayTime(elapsed);
        animationRef.current = requestAnimationFrame(updateTime);
      };
      animationRef.current = requestAnimationFrame(updateTime);
    } else {
      setDisplayTime(student.elapsedTime);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [student.status, student.startTime, student.elapsedTime]);

  const handleCardClick = () => {
    if (student.status === 'actions') return;

    switch (student.status) {
      case 'idle':
        onUpdate(student.id, {
          status: 'running',
          startTime: Date.now(),
          elapsedTime: 0,
        });
        break;
      case 'running':
        const currentElapsed = student.elapsedTime + (Date.now() - student.startTime!);
        onUpdate(student.id, {
          status: 'paused',
          startTime: null,
          elapsedTime: currentElapsed,
        });
        break;
      case 'paused':
        onUpdate(student.id, { status: 'actions' });
        break;
    }
  };

  const handleResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(student.id, {
      status: 'running',
      startTime: Date.now(),
    });
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(student.id, {
      status: 'idle',
      startTime: null,
      elapsedTime: 0,
    });
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveRecord(student);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(student.id);
  };

  const getCardStyle = () => {
    switch (student.status) {
      case 'running':
        return 'border-primary bg-primary/10 animate-pulse';
      case 'paused':
        return 'border-warning bg-warning/10';
      case 'actions':
        return 'border-secondary bg-secondary/10';
      default:
        return 'border-border hover:border-primary/50';
    }
  };

  return (
    <Card
      className={`relative p-4 cursor-pointer transition-all duration-300 ${getCardStyle()}`}
      onClick={handleCardClick}
    >
      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Student Info */}
      <div className="text-center mb-3">
        <p className="text-xs text-muted-foreground">{student.classroomLabel}</p>
        <p className="text-lg font-bold">{student.number}번</p>
        <p className="text-sm font-medium truncate">{student.name}</p>
      </div>

      {/* Stopwatch Display */}
      <div className="text-center mb-3">
        <p className="text-2xl font-mono font-bold text-primary">
          {formatTime(displayTime)}
        </p>
      </div>

      {/* Status Indicator */}
      {student.status === 'idle' && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">탭하여 시작</p>
        </div>
      )}

      {student.status === 'running' && (
        <div className="text-center">
          <Play className="h-5 w-5 mx-auto text-primary animate-pulse" />
        </div>
      )}

      {student.status === 'paused' && (
        <div className="text-center">
          <Pause className="h-5 w-5 mx-auto text-warning" />
          <p className="text-xs text-muted-foreground mt-1">탭하여 옵션 보기</p>
        </div>
      )}

      {/* Action Buttons */}
      {student.status === 'actions' && (
        <div className="flex flex-col gap-2 mt-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleResume}
          >
            <Play className="h-4 w-4 mr-1" />
            재시작
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            초기화
          </Button>
          <Button
            size="sm"
            variant="default"
            className="w-full"
            onClick={handleSave}
          >
            <Save className="h-4 w-4 mr-1" />
            기록 저장
          </Button>
        </div>
      )}
    </Card>
  );
};

export default KioskStudentCard;
