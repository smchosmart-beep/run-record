import { Student } from '@/types';

export interface NumberChangePreview {
  affectedStudents: Array<{
    id: string;
    name: string;
    oldNumber: number;
    newNumber: number;
  }>;
  totalChanges: number;
}

/**
 * 학생 번호 변경 시 다른 학생들의 번호를 자동으로 재정렬하는 함수
 * @param students 전체 학생 목록
 * @param targetStudentId 번호를 변경할 학생 ID
 * @param newNumber 새로운 번호
 * @returns 업데이트된 학생 목록과 변경 내역
 */
export function reorderStudentNumbers(
  students: Student[], 
  targetStudentId: string, 
  newNumber: number
): { updatedStudents: Student[]; preview: NumberChangePreview } {
  const sortedStudents = [...students].sort((a, b) => a.number - b.number);
  const targetStudent = students.find(s => s.id === targetStudentId);
  
  if (!targetStudent) {
    throw new Error('대상 학생을 찾을 수 없습니다.');
  }

  const oldNumber = targetStudent.number;
  
  // 번호가 같으면 변경 없음
  if (oldNumber === newNumber) {
    return {
      updatedStudents: students,
      preview: { affectedStudents: [], totalChanges: 0 }
    };
  }

  const updatedStudents: Student[] = [];
  const affectedStudents: NumberChangePreview['affectedStudents'] = [];

  sortedStudents.forEach(student => {
    if (student.id === targetStudentId) {
      // 대상 학생의 번호 변경
      updatedStudents.push({ ...student, number: newNumber });
      affectedStudents.push({
        id: student.id,
        name: student.name,
        oldNumber: oldNumber,
        newNumber: newNumber
      });
    } else {
      let newStudentNumber = student.number;

      // 번호가 증가하는 경우 (16 → 51)
      if (newNumber > oldNumber) {
        // 기존 번호보다 뒤에 있는 모든 학생들을 새 번호 뒤로 연속 배치
        if (student.number > oldNumber) {
          const offset = student.number - oldNumber; // 17-16=1, 18-16=2, ...
          newStudentNumber = newNumber + offset; // 51+1=52, 51+2=53, ...
          affectedStudents.push({
            id: student.id,
            name: student.name,
            oldNumber: student.number,
            newNumber: newStudentNumber
          });
        }
      } 
      // 번호가 감소하는 경우 (51 → 16)
      else {
        // 새 번호 이상이면서 기존 번호보다 작은 모든 학생들을 뒤로 밀기
        if (student.number >= newNumber && student.number < oldNumber) {
          newStudentNumber = student.number + 1;
          affectedStudents.push({
            id: student.id,
            name: student.name,
            oldNumber: student.number,
            newNumber: newStudentNumber
          });
        }
      }

      updatedStudents.push({ ...student, number: newStudentNumber });
    }
  });

  // 번호 순으로 정렬
  updatedStudents.sort((a, b) => a.number - b.number);

  return {
    updatedStudents,
    preview: {
      affectedStudents,
      totalChanges: affectedStudents.length
    }
  };
}

/**
 * 번호 변경 미리보기 생성
 * @param students 전체 학생 목록
 * @param targetStudentId 번호를 변경할 학생 ID
 * @param newNumber 새로운 번호
 * @returns 변경될 학생들의 미리보기
 */
export function getNumberChangePreview(
  students: Student[], 
  targetStudentId: string, 
  newNumber: number
): NumberChangePreview {
  try {
    const { preview } = reorderStudentNumbers(students, targetStudentId, newNumber);
    return preview;
  } catch (error) {
    return { affectedStudents: [], totalChanges: 0 };
  }
}

/**
 * 번호 유효성 검사
 * @param number 검사할 번호
 * @returns 유효성 검사 결과
 */
export function validateStudentNumber(number: number): { isValid: boolean; message?: string } {
  if (number < 1) {
    return { isValid: false, message: '번호는 1 이상이어야 합니다.' };
  }
  
  if (number > 999) {
    return { isValid: false, message: '번호는 999 이하여야 합니다.' };
  }

  if (!Number.isInteger(number)) {
    return { isValid: false, message: '번호는 정수여야 합니다.' };
  }

  return { isValid: true };
}

/**
 * 새 학생을 추가할 때 사용할 번호를 계산
 * @param students 전체 학생 목록
 * @returns 새 학생에게 할당할 번호
 */
export function getNextStudentNumber(students: Student[]): number {
  if (students.length === 0) return 1;
  
  const maxNumber = Math.max(...students.map(s => s.number));
  return maxNumber + 1;
}

/**
 * 학생 삭제 시 번호 재정렬
 * @param students 전체 학생 목록
 * @param deletedStudentId 삭제될 학생 ID
 * @returns 업데이트된 학생 목록
 */
export function reorderAfterDeletion(students: Student[], deletedStudentId: string): Student[] {
  const deletedStudent = students.find(s => s.id === deletedStudentId);
  if (!deletedStudent) return students;

  const deletedNumber = deletedStudent.number;
  
  return students
    .filter(s => s.id !== deletedStudentId) // 삭제된 학생 제외
    .map(student => {
      // 삭제된 학생보다 번호가 큰 학생들의 번호를 1씩 감소
      if (student.number > deletedNumber) {
        return { ...student, number: student.number - 1 };
      }
      return student;
    })
    .sort((a, b) => a.number - b.number);
}