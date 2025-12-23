import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Timer, Search, X, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { searchStudentsAcrossClassrooms, saveMultiClassRecords, SearchStudentResult } from '@/utils/supabaseApi';
import Stopwatch from './Stopwatch';

interface SelectedStudent {
  id: string;
  number: number;
  name: string;
  classroomId: string;
  classroomLabel: string;
}

interface DashboardStopwatchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const DashboardStopwatch: React.FC<DashboardStopwatchProps> = ({
  open,
  onOpenChange,
  onComplete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchStudentResult[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<SelectedStudent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isStopwatchOpen, setIsStopwatchOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 검색 실행
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchStudentsAcrossClassrooms(searchQuery);
      // 이미 선택된 학생 제외
      const filtered = results.filter(
        r => !selectedStudents.some(s => s.id === r.student.id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('검색 실패:', error);
      toast.error('검색 중 오류가 발생했습니다');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, selectedStudents]);

  // 엔터 키로 검색
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 학생 추가
  const handleAddStudent = (result: SearchStudentResult) => {
    const newStudent: SelectedStudent = {
      id: result.student.id,
      number: result.student.number,
      name: result.student.name,
      classroomId: result.classroom.id,
      classroomLabel: `${result.classroom.grade}-${result.classroom.className}`,
    };
    setSelectedStudents(prev => [...prev, newStudent]);
    setSearchResults(prev => prev.filter(r => r.student.id !== result.student.id));
    setSearchQuery('');
  };

  // 학생 제거
  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  // 스톱워치 시작
  const handleStartStopwatch = () => {
    if (selectedStudents.length === 0) {
      toast.error('학생을 선택해주세요');
      return;
    }
    setIsStopwatchOpen(true);
  };

  // 스톱워치 완료 및 기록 저장
  const handleStopwatchComplete = async (times: number[]) => {
    setIsStopwatchOpen(false);
    setIsSaving(true);

    try {
      // 각 학생에게 기록 할당 (순서대로)
      const records = selectedStudents.map((student, index) => ({
        studentId: student.id,
        classroomId: student.classroomId,
        timeMs: times[index],
      }));

      await saveMultiClassRecords(records);

      // 학급별 저장 결과 메시지 생성
      const byClass = records.reduce((acc, r) => {
        const student = selectedStudents.find(s => s.id === r.studentId)!;
        if (!acc[student.classroomLabel]) {
          acc[student.classroomLabel] = 0;
        }
        acc[student.classroomLabel]++;
        return acc;
      }, {} as { [label: string]: number });

      const summaryParts = Object.entries(byClass).map(
        ([label, count]) => `${label} ${count}명`
      );
      toast.success(`기록 저장 완료! (${summaryParts.join(', ')})`);

      // 상태 초기화 및 완료 콜백
      setSelectedStudents([]);
      setSearchResults([]);
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('기록 저장 실패:', error);
      toast.error('기록 저장 중 오류가 발생했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  // 모달 닫을 때 초기화
  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedStudents([]);
    }
    onOpenChange(isOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              통합 스톱워치
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* 검색 영역 */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="학생 이름 또는 번호 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? '검색 중...' : '검색'}
              </Button>
            </div>

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <Card className="p-2">
                <p className="text-xs text-muted-foreground mb-2 px-2">
                  검색 결과 ({searchResults.length}명)
                </p>
                <ScrollArea className="max-h-32">
                  <div className="space-y-1">
                    {searchResults.map((result) => (
                      <div
                        key={result.student.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {result.classroom.grade}-{result.classroom.className}
                          </Badge>
                          <span className="text-sm font-medium">
                            {result.student.number}번 {result.student.name}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddStudent(result)}
                          className="h-7 px-2"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            )}

            {/* 선택된 학생 목록 */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">
                  선택된 학생 ({selectedStudents.length}명)
                </p>
                {selectedStudents.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedStudents([])}
                    className="text-xs text-muted-foreground h-6 px-2"
                  >
                    전체 삭제
                  </Button>
                )}
              </div>
              
              <ScrollArea className="flex-1 min-h-[120px]">
                {selectedStudents.length === 0 ? (
                  <div className="flex items-center justify-center h-[100px] text-muted-foreground text-sm">
                    학생을 검색해서 추가해주세요
                  </div>
                ) : (
                  <div className="space-y-2 pr-2">
                    {selectedStudents.map((student, index) => (
                      <Card key={student.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
                              {index + 1}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {student.classroomLabel}
                            </Badge>
                            <span className="font-medium">
                              {student.number}번 {student.name}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveStudent(student.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* 스톱워치 시작 버튼 */}
            <Button
              size="lg"
              variant="speed"
              onClick={handleStartStopwatch}
              disabled={selectedStudents.length === 0 || isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>저장 중...</>
              ) : (
                <>
                  <Timer className="h-5 w-5 mr-2" />
                  스톱워치 시작 ({selectedStudents.length}명)
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 스톱워치 모달 */}
      <Stopwatch
        open={isStopwatchOpen}
        onOpenChange={setIsStopwatchOpen}
        selectedStudentCount={selectedStudents.length}
        onComplete={handleStopwatchComplete}
        rankingType="fastest"
      />
    </>
  );
};

export default DashboardStopwatch;
