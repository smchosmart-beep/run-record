import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Student } from '@/types';
import { formatTime } from '@/utils/time';
import { Trophy, User, CheckCircle } from 'lucide-react';

interface RecordAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordedTimes: number[];
  selectedStudents: Student[];
  onSave: (assignments: { studentId: string; time: number; rank: number }[]) => void;
}

const RecordAssignment: React.FC<RecordAssignmentProps> = ({
  open,
  onOpenChange,
  recordedTimes,
  selectedStudents,
  onSave
}) => {
  const [assignments, setAssignments] = useState<{ [timeIndex: number]: string }>({});

  // Sort times in ascending order (fastest first) with original indices
  const sortedTimesWithIndex = recordedTimes
    .map((time, index) => ({ time, originalIndex: index }))
    .sort((a, b) => a.time - b.time);

  const handleAssignment = (timeIndex: number, studentId: string) => {
    const newAssignments = { ...assignments };
    
    // Remove previous assignment of this student (if any)
    Object.keys(newAssignments).forEach(key => {
      if (newAssignments[parseInt(key)] === studentId) {
        delete newAssignments[parseInt(key)];
      }
    });
    
    // Assign student to this time
    if (studentId) {
      newAssignments[timeIndex] = studentId;
    }
    
    setAssignments(newAssignments);
  };

  const handleSave = () => {
    const assignmentList = sortedTimesWithIndex.map((timeData, rank) => {
      const studentId = assignments[timeData.originalIndex];
      if (!studentId) return null;
      
      return {
        studentId,
        time: timeData.time,
        rank: rank + 1
      };
    }).filter(Boolean) as { studentId: string; time: number; rank: number }[];

    onSave(assignmentList);
    onOpenChange(false);
    setAssignments({});
  };

  const canSave = Object.keys(assignments).length === recordedTimes.length;
  const assignedStudentIds = new Set(Object.values(assignments));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            기록 배정
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            측정된 시간을 각 학생에게 배정해주세요.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Assignment Cards */}
          <div className="space-y-3">
            {sortedTimesWithIndex.map((timeData, rank) => {
              const selectedStudentId = assignments[timeData.originalIndex];
              const selectedStudent = selectedStudents.find(s => s.id === selectedStudentId);
              
              return (
                <Card key={timeData.originalIndex} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      {/* Rank and Time */}
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={rank === 0 ? "default" : rank === 1 ? "secondary" : "outline"}
                            className="min-w-[3rem] justify-center"
                          >
                            {rank + 1}등
                          </Badge>
                          <div className="font-mono text-lg font-bold">
                            {formatTime(timeData.time)}
                          </div>
                        </div>
                      </div>

                      {/* Student Assignment */}
                      <div className="flex items-center space-x-3">
                        <Select
                          value={selectedStudentId || ""}
                          onValueChange={(value) => handleAssignment(timeData.originalIndex, value)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="학생을 선택하세요">
                              {selectedStudent && (
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4" />
                                  <span>{selectedStudent.number}번 {selectedStudent.name}</span>
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {selectedStudents.map(student => (
                              <SelectItem 
                                key={student.id} 
                                value={student.id}
                                disabled={assignedStudentIds.has(student.id) && selectedStudentId !== student.id}
                              >
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4" />
                                  <span>{student.number}번 {student.name}</span>
                                  {assignedStudentIds.has(student.id) && selectedStudentId !== student.id && (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>배정 진행률:</span>
              <span className="font-medium">
                {Object.keys(assignments).length} / {recordedTimes.length}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(Object.keys(assignments).length / recordedTimes.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              기록 저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecordAssignment;