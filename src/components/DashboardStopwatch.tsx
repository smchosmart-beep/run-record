import React, { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Timer, Search, X, Plus, Check, ArrowLeft, Users } from 'lucide-react';
import { toast } from 'sonner';
import { searchStudentsAcrossClassrooms, saveMultiClassRecords, SearchStudentResult } from '@/utils/supabaseApi';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
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
  const { classrooms } = useApp();
  
  // 2단계 네비게이션: null = 학급 선택, classroomId = 학생 선택
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchStudentResult[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<SelectedStudent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isStopwatchOpen, setIsStopwatchOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 현재 선택된 학급 정보
  const selectedClassroom = useMemo(
    () => classrooms.find(c => c.id === selectedClassroomId),
    [classrooms, selectedClassroomId]
  );

  // 선택된 학생 ID Set (빠른 lookup용)
  const selectedStudentIds = useMemo(
    () => new Set(selectedStudents.map(s => s.id)),
    [selectedStudents]
  );

  // 선택 순서 맵
  const selectionOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    selectedStudents.forEach((s, idx) => map.set(s.id, idx + 1));
    return map;
  }, [selectedStudents]);

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
        r => !selectedStudentIds.has(r.student.id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('검색 실패:', error);
      toast.error('검색 중 오류가 발생했습니다');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, selectedStudentIds]);

  // 엔터 키로 검색
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 학생 추가 (검색 결과에서)
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

  // 학생 토글 (키오스크 모드에서)
  const handleToggleStudent = (student: { id: string; number: number; name: string }, classroomId: string, classroomLabel: string) => {
    if (selectedStudentIds.has(student.id)) {
      // 이미 선택됨 → 제거
      setSelectedStudents(prev => prev.filter(s => s.id !== student.id));
    } else {
      // 선택되지 않음 → 추가
      setSelectedStudents(prev => [...prev, {
        id: student.id,
        number: student.number,
        name: student.name,
        classroomId,
        classroomLabel,
      }]);
    }
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
      setSelectedClassroomId(null);
    }
    onOpenChange(isOpen);
  };

  // 학생 선택 화면의 학생들
  const visibleStudents = useMemo(() => {
    if (!selectedClassroom) return [];
    return selectedClassroom.students
      .filter(s => !s.isHidden)
      .sort((a, b) => a.number - b.number);
  }, [selectedClassroom]);

  const classroomLabel = selectedClassroom 
    ? `${selectedClassroom.grade}-${selectedClassroom.className}` 
    : '';

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              통합 스톱워치
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {selectedClassroomId === null ? (
              /* ========== 1단계: 학급 선택 화면 ========== */
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
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

                {/* 학급 카드 그리드 */}
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    학급을 선택하세요
                  </p>
                  <ScrollArea className="h-full max-h-[240px]">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
                      {classrooms.map(classroom => {
                        const studentCount = classroom.students.filter(s => !s.isHidden).length;
                        return (
                          <Card
                            key={classroom.id}
                            onClick={() => setSelectedClassroomId(classroom.id)}
                            className="p-4 cursor-pointer hover:bg-muted/50 transition-all hover:scale-105 hover:shadow-md"
                          >
                            <div className="text-center">
                              <span className="text-xl font-bold">
                                {classroom.grade}-{classroom.className}
                              </span>
                              <p className="text-sm text-muted-foreground mt-1">
                                {studentCount}명
                              </p>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              /* ========== 2단계: 학생 선택 화면 ========== */
              <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                {/* 뒤로가기 버튼 */}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setSelectedClassroomId(null)}
                  className="w-full sm:w-auto self-start"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  학급 선택으로 돌아가기
                </Button>

                {/* 학급명 헤더 */}
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">
                    {classroomLabel} 학생 선택
                  </h3>
                  <Badge variant="outline">{visibleStudents.length}명</Badge>
                </div>

                {/* 학생 카드 그리드 */}
                <ScrollArea className="flex-1 max-h-[280px]">
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2 p-1">
                    {visibleStudents.map(student => {
                      const isSelected = selectedStudentIds.has(student.id);
                      const selectionOrder = selectionOrderMap.get(student.id);

                      return (
                        <Card
                          key={student.id}
                          onClick={() => handleToggleStudent(student, selectedClassroomId, classroomLabel)}
                          className={cn(
                            "p-3 cursor-pointer transition-all hover:scale-105 relative",
                            "flex flex-col items-center justify-center text-center min-h-[72px]",
                            isSelected 
                              ? "ring-2 ring-primary bg-primary/10 shadow-md" 
                              : "hover:bg-muted/50"
                          )}
                        >
                          {/* 선택 순서 뱃지 */}
                          {isSelected && selectionOrder && (
                            <Badge 
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 flex items-center justify-center text-xs"
                              variant="default"
                            >
                              {selectionOrder}
                            </Badge>
                          )}
                          <span className="text-lg font-bold">{student.number}번</span>
                          <span className="text-sm truncate w-full">{student.name}</span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary mt-1" />
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* 선택된 학생 목록 */}
            <div className="border-t pt-3">
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
              
              <ScrollArea className="max-h-24">
                {selectedStudents.length === 0 ? (
                  <div className="flex items-center justify-center h-12 text-muted-foreground text-sm">
                    학생을 선택해주세요
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedStudents.map((student, index) => (
                      <Badge 
                        key={student.id}
                        variant="secondary"
                        className="px-2 py-1 text-sm cursor-pointer hover:bg-destructive/20 transition-colors"
                        onClick={() => handleRemoveStudent(student.id)}
                      >
                        <span className="mr-1 text-muted-foreground">{index + 1}.</span>
                        <span className="text-xs text-muted-foreground mr-1">[{student.classroomLabel}]</span>
                        {student.number}번 {student.name}
                        <X className="h-3 w-3 ml-1.5 opacity-60" />
                      </Badge>
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
