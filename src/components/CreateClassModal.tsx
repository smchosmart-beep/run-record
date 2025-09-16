import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { ClassRoom, Student } from '@/types';
import { generateClassId, generateStudentId, generateRecordId } from '@/utils/calculations';
import { useToast } from '@/hooks/use-toast';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateClassModal: React.FC<CreateClassModalProps> = ({ isOpen, onClose }) => {
  const { addClassroom, setCurrentClassroom } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [studentNames, setStudentNames] = useState('');
  const [rankingType, setRankingType] = useState<'fastest' | 'slowest'>('fastest');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation
      if (!school || !grade || !className || !studentCount) {
        toast({
          title: "입력 오류",
          description: "모든 필수 항목을 입력해주세요.",
          variant: "destructive",
        });
        return;
      }

      const gradeNum = parseInt(grade);
      const countNum = parseInt(studentCount);

      if (gradeNum < 1 || gradeNum > 12) {
        toast({
          title: "학년 오류",
          description: "학년은 1-12 사이의 숫자여야 합니다.",
          variant: "destructive",
        });
        return;
      }

      if (countNum < 1 || countNum > 50) {
        toast({
          title: "학생 수 오류",
          description: "학생 수는 1-50명 사이여야 합니다.",
          variant: "destructive",
        });
        return;
      }

      // Parse student names
      const names = studentNames
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);

      if (names.length !== countNum) {
        toast({
          title: "학생 이름 오류",
          description: `입력된 이름 개수(${names.length}개)와 학생 수(${countNum}명)가 일치하지 않습니다.`,
          variant: "destructive",
        });
        return;
      }

      // Validate student names
      const invalidNames = names.filter(name => 
        name.length > 30 || !/^[가-힣a-zA-Z\s\-]+$/.test(name)
      );

      if (invalidNames.length > 0) {
        toast({
          title: "이름 형식 오류",
          description: `잘못된 이름 형식: ${invalidNames.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Create students
      const students: Student[] = names.map((name, index) => ({
        id: generateStudentId(),
        number: index + 1,
        name,
        records: [],
        isHidden: false,
      }));

      // Create classroom
      const newClassroom: ClassRoom = {
        id: generateClassId(),
        school: school.trim(),
        grade: gradeNum,
        className: className.trim(),
        students,
        maxRecordSlots: 5,
        rankingType,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addClassroom(newClassroom);
      setCurrentClassroom(newClassroom);

      // Reset form
      setSchool('');
      setGrade('');
      setClassName('');
      setStudentCount('');
      setStudentNames('');
      setRankingType('fastest');
      
      onClose();
      
      // Navigate to classroom page to show student list
      navigate('/classroom');
    } catch (error) {
      toast({
        title: "생성 실패",
        description: "학급 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    
    setSchool('');
    setGrade('');
    setClassName('');
    setStudentCount('');
    setStudentNames('');
    setRankingType('fastest');
    onClose();
  };

  const generateSampleNames = () => {
    const count = parseInt(studentCount) || 5;
    const sampleNames = [
      '김하늘', '이민준', '박서윤', '정유진', '최지호',
      '김도윤', '이서연', '박예준', '정하은', '최시우',
      '김서준', '이채원', '박준혁', '정다은', '최하율',
      '김윤서', '이도현', '박서현', '정하준', '최서진'
    ];
    
    const names = sampleNames.slice(0, Math.min(count, 20));
    setStudentNames(names.join('\n'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 학급 만들기</DialogTitle>
          <DialogDescription>
            학급 정보와 학생 명단을 입력하여 새로운 학급을 생성하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="school">학교명 *</Label>
              <Input
                id="school"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="예: 상명초등학교"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">학년 *</Label>
              <Input
                id="grade"
                type="number"
                min="1"
                max="12"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="예: 3"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="className">반 *</Label>
              <Input
                id="className"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="예: 2반"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentCount">학생 수 *</Label>
              <Input
                id="studentCount"
                type="number"
                min="1"
                max="50"
                value={studentCount}
                onChange={(e) => setStudentCount(e.target.value)}
                placeholder="예: 25"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rankingType">랭킹 유형 *</Label>
            <Select value={rankingType} onValueChange={(value: 'fastest' | 'slowest') => setRankingType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="랭킹 방식을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fastest">시간 빠른 순</SelectItem>
                <SelectItem value="slowest">시간 느린 순</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {rankingType === 'fastest' 
                ? '• 시간 빠른 순: 50m 달리기, 100m 달리기 등 빠른 시간이 좋은 종목에 사용' 
                : '• 시간 느린 순: 플랭크 버티기, 벽 앉기 등 오래 버티는 것이 좋은 종목에 사용'
              }
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="studentNames">학생 이름 목록 *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateSampleNames}
                disabled={!studentCount}
              >
                샘플 이름 생성
              </Button>
            </div>
            <Textarea
              id="studentNames"
              value={studentNames}
              onChange={(e) => setStudentNames(e.target.value)}
              placeholder={`한 줄에 한 명씩 입력하세요:\n김하늘\n이민준\n박서윤`}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              각 줄에 학생 이름을 하나씩 입력하세요. 
              {studentCount && ` (${parseInt(studentCount) || 0}명 필요)`}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="speed"
              disabled={isLoading}
            >
              {isLoading ? '생성 중...' : '학급 생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateClassModal;