// Supabase API functions to replace localStorage operations

import { supabase } from "@/integrations/supabase/client";
import { ClassRoom, Student, Record } from "@/types";
import { toYMD } from "./time";

// Timeout utility for Supabase requests
function withTimeout<T>(promise: Promise<T>, ms: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms)
    )
  ]);
}

export type DatabaseClassroom = {
  id: string;
  user_id: string;
  school: string;
  grade: number;
  class_name: string;
  max_record_slots: number;
  ranking_type: string | null;
  total_activity_days: number;
  created_at: string;
  updated_at: string;
};

export type DatabaseStudent = {
  id: string;
  classroom_id: string;
  number: number;
  name: string;
  is_hidden: boolean;
  created_at: string;
};

export type DatabaseRecord = {
  id: string;
  student_id: string;
  time_ms: number | null;
  is_dnf: boolean;
  slot_index: number;
  recorded_at: string;
  record_date: string;
  is_attendance: boolean;
};

// Convert database types to app types
const convertDbClassroomToAppClassroom = (
  dbClassroom: DatabaseClassroom,
  students: Student[]
): ClassRoom => ({
  id: dbClassroom.id,
  school: dbClassroom.school,
  grade: dbClassroom.grade,
  className: dbClassroom.class_name,
  students,
  maxRecordSlots: dbClassroom.max_record_slots,
  rankingType: dbClassroom.ranking_type === 'slowest' ? 'slowest' : 'fastest',
  totalActivityDays: dbClassroom.total_activity_days ?? 0,
  createdAt: new Date(dbClassroom.created_at),
  updatedAt: new Date(dbClassroom.updated_at),
});

const convertDbStudentToAppStudent = (
  dbStudent: DatabaseStudent,
  records: Record[]
): Student => ({
  id: dbStudent.id,
  number: dbStudent.number,
  name: dbStudent.name,
  records,
  isHidden: dbStudent.is_hidden,
});

const convertDbRecordToAppRecord = (dbRecord: DatabaseRecord): Record => ({
  id: dbRecord.id,
  time: dbRecord.time_ms,
  isDNF: dbRecord.is_dnf,
  recordedAt: new Date(dbRecord.recorded_at),
  slotIndex: dbRecord.slot_index,
  recordDate: new Date(dbRecord.record_date + 'T00:00:00'),
  isAttendance: dbRecord.is_attendance,
});

// API Functions
export async function getClassrooms(): Promise<ClassRoom[]> {
  console.log('📡 학급 목록 요청 시작');
  
  const { data: classrooms, error: classroomsError } = await withTimeout(
    Promise.resolve(
      supabase
        .from('classrooms')
        .select('*')
        .order('created_at', { ascending: false })
    )
  );

  if (classroomsError) {
    console.error('❌ 학급 목록 조회 실패:', classroomsError);
    throw classroomsError;
  }

  console.log('✅ 학급 목록 조회 완료:', classrooms?.length || 0, '개');

  if (!classrooms || classrooms.length === 0) {
    return [];
  }

  // Fetch students and records for each classroom
  console.log('📡 학생 및 기록 데이터 요청 시작');
  const classroomsWithStudents = await Promise.all(
    classrooms.map(async (classroom, index) => {
      console.log(`📚 학급 ${index + 1}/${classrooms.length}: ${classroom.class_name} 처리 중`);
      
      const { data: students, error: studentsError } = await withTimeout(
        Promise.resolve(
          supabase
            .from('students')
            .select('*')
            .eq('classroom_id', classroom.id)
            .order('number')
        )
      );

      if (studentsError) {
        console.error('❌ 학생 목록 조회 실패:', studentsError);
        throw studentsError;
      }

      console.log(`👥 학급 ${classroom.class_name}: ${students?.length || 0}명 학생 조회`);

      const studentsWithRecords = await Promise.all(
        (students || []).map(async (student, studentIndex) => {
          console.log(`📊 학생 ${studentIndex + 1}/${students?.length}: ${student.name} 기록 조회 중`);
          
          const { data: records, error: recordsError } = await withTimeout(
            Promise.resolve(
              supabase
                .from('records')
                .select('*')
                .eq('student_id', student.id)
                .order('slot_index')
            )
          );

          if (recordsError) {
            console.error('❌ 기록 조회 실패:', recordsError);
            throw recordsError;
          }

          const appRecords = (records || []).map(convertDbRecordToAppRecord);
          console.log(`📈 학생 ${student.name}: ${appRecords.length}개 기록 조회`);
          return convertDbStudentToAppStudent(student, appRecords);
        })
      );

      console.log(`✅ 학급 ${classroom.class_name} 처리 완료`);
      return convertDbClassroomToAppClassroom(classroom, studentsWithRecords);
    })
  );

  console.log('🎉 모든 데이터 로딩 완료!');
  return classroomsWithStudents;
}

export async function createClassroom(classroom: Omit<ClassRoom, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassRoom> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

// Create classroom
  const { data: newClassroom, error: classroomError } = await supabase
    .from('classrooms')
    .insert({
      user_id: user.user.id,
      school: classroom.school,
      grade: classroom.grade,
      class_name: classroom.className,
      max_record_slots: classroom.maxRecordSlots,
      ranking_type: classroom.rankingType || 'fastest',
    })
    .select()
    .single();

  if (classroomError) {
    console.error('Error creating classroom:', classroomError);
    throw classroomError;
  }

  // Create students
  if (classroom.students.length > 0) {
    const studentsToInsert = classroom.students.map((student) => ({
      classroom_id: newClassroom.id,
      number: student.number,
      name: student.name,
      is_hidden: student.isHidden,
    }));

    const { data: newStudents, error: studentsError } = await supabase
      .from('students')
      .insert(studentsToInsert)
      .select();

    if (studentsError) {
      console.error('Error creating students:', studentsError);
      throw studentsError;
    }

    // Create records for students if they have any
    const recordsToInsert: any[] = [];
    classroom.students.forEach((student, studentIndex) => {
      student.records.forEach((record) => {
        recordsToInsert.push({
          student_id: newStudents![studentIndex].id,
          time_ms: record.time,
          is_dnf: record.isDNF,
          slot_index: record.slotIndex,
          recorded_at: record.recordedAt.toISOString(),
          record_date: toYMD(record.recordDate),
        });
      });
    });

    if (recordsToInsert.length > 0) {
      const { error: recordsError } = await supabase
        .from('records')
        .insert(recordsToInsert);

      if (recordsError) {
        console.error('Error creating records:', recordsError);
        throw recordsError;
      }
    }
  }

  // Fetch the complete classroom with students and records
  const [createdClassroom] = await Promise.all([
    getClassrooms().then(classrooms => classrooms.find(c => c.id === newClassroom.id))
  ]);

  if (!createdClassroom) {
    throw new Error('Failed to retrieve created classroom');
  }

  return createdClassroom;
}

export async function updateClassroom(classroomId: string, updates: Partial<ClassRoom>): Promise<void> {
  const updateData: any = {};

  if (updates.school !== undefined) updateData.school = updates.school;
  if (updates.grade !== undefined) updateData.grade = updates.grade;
  if (updates.className !== undefined) updateData.class_name = updates.className;
  if (updates.maxRecordSlots !== undefined) updateData.max_record_slots = updates.maxRecordSlots;
  if (updates.rankingType !== undefined) updateData.ranking_type = updates.rankingType;
  if (updates.totalActivityDays !== undefined) updateData.total_activity_days = updates.totalActivityDays;

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from('classrooms')
      .update(updateData)
      .eq('id', classroomId);

    if (error) {
      console.error('Error updating classroom:', error);
      throw error;
    }
  }

  // Handle students updates if provided
  if (updates.students) {
    // Get current students
    const { data: currentStudents } = await supabase
      .from('students')
      .select('*')
      .eq('classroom_id', classroomId);

    // Update existing students or create new ones
    await Promise.all(
      updates.students.map(async (student) => {
        const existingStudent = currentStudents?.find(s => s.id === student.id);
        
        if (existingStudent) {
          // Update existing student (exclude number field - use updateStudentNumberAtomically for number changes)
          const { error: updateError } = await supabase
            .from('students')
            .update({
              name: student.name,
              is_hidden: student.isHidden,
            })
            .eq('id', student.id);

          if (updateError) {
            console.error('Error updating student:', updateError);
            throw updateError;
          }
        } else {
          // Create new student
          const { data: newStudent, error: createError } = await supabase
            .from('students')
            .insert({
              classroom_id: classroomId,
              number: student.number,
              name: student.name,
              is_hidden: student.isHidden,
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating student:', createError);
            throw createError;
          }

          // Update student id for record operations
          student.id = newStudent.id;
        }

        // Handle records for this student
        await updateStudentRecords(student.id, student.records);
      })
    );
  }
}

export async function deleteClassroom(classroomId: string): Promise<void> {
  const { error } = await supabase
    .from('classrooms')
    .delete()
    .eq('id', classroomId);

  if (error) {
    console.error('Error deleting classroom:', error);
    throw error;
  }
}

export async function deleteStudent(studentId: string): Promise<void> {
  // 학생의 모든 기록을 먼저 삭제
  const { error: recordsError } = await supabase
    .from('records')
    .delete()
    .eq('student_id', studentId);

  if (recordsError) {
    console.error('Error deleting student records:', recordsError);
    throw recordsError;
  }

  // 학생 삭제
  const { error: studentError } = await supabase
    .from('students')
    .delete()
    .eq('id', studentId);

  if (studentError) {
    console.error('Error deleting student:', studentError);
    throw studentError;
  }
}

/**
 * 학생 번호를 원자적으로 변경/스왑하는 함수
 * - 동일 반(classroom) 내 번호 중복을 안전하게 처리 (스왑 지원)
 * - 임시 음수 번호를 사용해 중간 충돌 방지
 * - 실패 시 최대한 롤백 시도
 */
export async function updateStudentNumberAtomically(
  studentId: string,
  classroomId: string,
  newNumber: number
): Promise<void> {
  // 현재 학생 정보 조회 (기존 번호 확보)
  const { data: target, error: targetErr } = await supabase
    .from('students')
    .select('id, number')
    .eq('id', studentId)
    .eq('classroom_id', classroomId)
    .single();

  if (targetErr || !target) {
    console.error('학생 조회 실패:', targetErr);
    throw targetErr || new Error('학생을 찾을 수 없습니다');
  }

  const oldNumber = target.number as number;
  if (oldNumber === newNumber) return; // 변경 없음

  // 임시 음수 번호 생성 (충돌 가능성 극히 낮음)
  const tempA = -Math.floor(Date.now() % 1_000_000 + Math.random() * 1_000 + 1);

  // 새 번호를 이미 가진 학생(점유자) 조회
  const { data: occupant, error: occErr } = await supabase
    .from('students')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('number', newNumber)
    .maybeSingle();

  if (occErr) {
    console.error('점유자 조회 실패:', occErr);
    throw occErr;
  }

  // 1) 대상 학생을 임시 번호로 이동
  const { error: step1 } = await supabase
    .from('students')
    .update({ number: tempA })
    .eq('id', studentId)
    .eq('classroom_id', classroomId);
  if (step1) {
    console.error('임시 번호 설정 실패:', step1);
    throw step1;
  }

  let occupantUpdated = false;
  try {
    // 2) 점유자가 있으면 점유자를 oldNumber로 이동 (스왑 준비)
    if (occupant?.id) {
      const { error: step2 } = await supabase
        .from('students')
        .update({ number: oldNumber })
        .eq('id', occupant.id)
        .eq('classroom_id', classroomId);
      if (step2) {
        console.error('점유자 이동 실패, 롤백 시도:', step2);
        // 롤백: 대상 학생을 원래 번호로 되돌림
        await supabase.from('students').update({ number: oldNumber }).eq('id', studentId).eq('classroom_id', classroomId);
        throw step2;
      }
      occupantUpdated = true;
    }

    // 3) 대상 학생을 새 번호로 설정
    const { error: step3 } = await supabase
      .from('students')
      .update({ number: newNumber })
      .eq('id', studentId)
      .eq('classroom_id', classroomId);
    if (step3) {
      console.error('대상 최종 번호 설정 실패, 롤백 시도:', step3);
      // 롤백: 점유자를 다시 newNumber로, 대상 학생을 oldNumber로
      if (occupantUpdated && occupant?.id) {
        await supabase.from('students').update({ number: newNumber }).eq('id', occupant.id).eq('classroom_id', classroomId);
      }
      await supabase.from('students').update({ number: oldNumber }).eq('id', studentId).eq('classroom_id', classroomId);
      throw step3;
    }
  } catch (e) {
    throw e;
  }
}

/**
 * (호환용) 기존 안전 변경 함수: classroomId를 조회하여 원자적 변경 호출
 */
export async function updateStudentNumberSafely(studentId: string, newNumber: number): Promise<void> {
  const { data: s, error } = await supabase
    .from('students')
    .select('classroom_id')
    .eq('id', studentId)
    .single();
  if (error || !s) {
    console.error('학생의 반 조회 실패:', error);
    throw error || new Error('학생 정보를 찾을 수 없습니다');
  }
  return updateStudentNumberAtomically(studentId, s.classroom_id as string, newNumber);
}

export async function updateStudentRecords(studentId: string, records: Record[]): Promise<void> {
  // Delete existing records for this student
  const { error: deleteError } = await supabase
    .from('records')
    .delete()
    .eq('student_id', studentId);

  if (deleteError) {
    console.error('Error deleting existing records:', deleteError);
    throw deleteError;
  }

  // Insert new records
  if (records.length > 0) {
    const recordsToInsert = records.map((record) => ({
      student_id: studentId,
      time_ms: record.time,
      is_dnf: record.isDNF,
      slot_index: record.slotIndex,
      recorded_at: record.recordedAt.toISOString(),
      record_date: toYMD(record.recordDate),
    }));

    const { error: insertError } = await supabase
      .from('records')
      .insert(recordsToInsert);

    if (insertError) {
      console.error('Error inserting records:', insertError);
      throw insertError;
    }
  }
}

// Record Sessions API Functions
export async function getRecordSessions(classroomId: string) {
  console.log('📡 기록 세션 목록 요청:', classroomId);
  
  const { data: sessions, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('record_sessions')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('session_date', { ascending: false })
    )
  );

  if (error) {
    console.error('❌ 기록 세션 조회 실패:', error);
    throw error;
  }

  console.log('✅ 기록 세션 조회 완료:', sessions?.length || 0, '개');
  return sessions || [];
}

export async function upsertRecordSession(classroomId: string, sessionDate: Date, slotsCount: number) {
  console.log('📡 기록 세션 생성/업데이트:', {
    classroomId,
    sessionDate: toYMD(sessionDate),
    slotsCount
  });
  
  const { data: session, error } = await supabase
    .from('record_sessions')
    .upsert({
      classroom_id: classroomId,
      session_date: toYMD(sessionDate),
      slots_count: slotsCount
    }, {
      onConflict: 'classroom_id,session_date'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ 기록 세션 저장 실패:', error);
    throw error;
  }

  console.log('✅ 기록 세션 저장 완료:', session);
  return session;
}

export async function updateRecordSessionSlots(classroomId: string, sessionDate: Date, slotsCount: number) {
  console.log('📡 기록 세션 회차 업서트(보장) 실행:', {
    classroomId,
    sessionDate: toYMD(sessionDate),
    slotsCount
  });
  const res = await upsertRecordSession(classroomId, sessionDate, slotsCount);
  console.log('✅ 기록 세션 회차 업서트 완료');
  return res;
}

export async function deleteRecordSession(classroomId: string, sessionDate: Date) {
  console.log('📡 기록 세션 삭제:', {
    classroomId,
    sessionDate: toYMD(sessionDate)
  });
  
  // 트랜잭션으로 처리: 먼저 records 삭제, 그 다음 record_sessions 삭제
  const sessionDateStr = toYMD(sessionDate);
  
  // 먼저 해당 교실의 학생 ID들을 조회
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id')
    .eq('classroom_id', classroomId);

  if (studentsError) {
    console.error('❌ 학생 조회 실패:', studentsError);
    throw studentsError;
  }

  const studentIds = students?.map(s => s.id) || [];

  // 해당 날짜의 모든 기록 삭제
  if (studentIds.length > 0) {
    const { error: recordsError } = await supabase
      .from('records')
      .delete()
      .eq('record_date', sessionDateStr)
      .in('student_id', studentIds);

    if (recordsError) {
      console.error('❌ 기록 삭제 실패:', recordsError);
      throw recordsError;
    }
  }

  // 기록 세션 삭제
  const { error: sessionError } = await supabase
    .from('record_sessions')
    .delete()
    .eq('classroom_id', classroomId)
    .eq('session_date', sessionDateStr);

  if (sessionError) {
    console.error('❌ 기록 세션 삭제 실패:', sessionError);
    throw sessionError;
  }

  console.log('✅ 기록 세션 삭제 완료');
}

export async function getUserProfile() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.user.id)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }

  return {
    id: profile.id,
    username: profile.username,
  };
}

// 모든 학급에서 학생 검색 (이름 또는 번호로)
export interface SearchStudentResult {
  student: {
    id: string;
    number: number;
    name: string;
    classroomId: string;
  };
  classroom: {
    id: string;
    grade: number;
    className: string;
    school: string;
  };
}

export async function searchStudentsAcrossClassrooms(query: string): Promise<SearchStudentResult[]> {
  if (!query.trim()) return [];

  console.log('📡 전체 학급 학생 검색:', query);

  // 현재 사용자의 모든 학급 조회
  const { data: classrooms, error: classroomsError } = await supabase
    .from('classrooms')
    .select('id, grade, class_name, school');

  if (classroomsError) {
    console.error('❌ 학급 조회 실패:', classroomsError);
    throw classroomsError;
  }

  if (!classrooms || classrooms.length === 0) return [];

  const classroomIds = classrooms.map(c => c.id);

  // 학생 검색 (이름 또는 번호)
  const isNumber = /^\d+$/.test(query.trim());
  
  let studentsQuery = supabase
    .from('students')
    .select('id, number, name, classroom_id, is_hidden')
    .in('classroom_id', classroomIds)
    .eq('is_hidden', false);

  if (isNumber) {
    studentsQuery = studentsQuery.eq('number', parseInt(query.trim()));
  } else {
    studentsQuery = studentsQuery.ilike('name', `%${query.trim()}%`);
  }

  const { data: students, error: studentsError } = await studentsQuery.limit(20);

  if (studentsError) {
    console.error('❌ 학생 검색 실패:', studentsError);
    throw studentsError;
  }

  console.log('✅ 검색 결과:', students?.length || 0, '명');

  // 결과 조합
  const results: SearchStudentResult[] = (students || []).map(student => {
    const classroom = classrooms.find(c => c.id === student.classroom_id)!;
    return {
      student: {
        id: student.id,
        number: student.number,
        name: student.name,
        classroomId: student.classroom_id,
      },
      classroom: {
        id: classroom.id,
        grade: classroom.grade,
        className: classroom.class_name,
        school: classroom.school,
      },
    };
  });

  return results;
}

// 학생의 오늘 날짜 기록 중 비어있는 첫 번째 슬롯 찾기
async function findFirstEmptySlotForStudent(
  studentId: string,
  classroomId: string,
  todayStr: string
): Promise<{ slotIndex: number; needNewSlot: boolean; currentSlotsCount: number }> {
  // 1. 오늘 날짜의 세션 정보 가져오기
  const { data: session } = await supabase
    .from('record_sessions')
    .select('slots_count')
    .eq('classroom_id', classroomId)
    .eq('session_date', todayStr)
    .maybeSingle();

  const totalSlots = session?.slots_count || 0;

  // 2. 학생의 오늘 기록 가져오기
  const { data: existingRecords } = await supabase
    .from('records')
    .select('slot_index')
    .eq('student_id', studentId)
    .eq('record_date', todayStr);

  const usedSlots = new Set((existingRecords || []).map(r => r.slot_index));

  // 3. 비어있는 첫 번째 슬롯 찾기
  for (let i = 0; i < totalSlots; i++) {
    if (!usedSlots.has(i)) {
      return { slotIndex: i, needNewSlot: false, currentSlotsCount: totalSlots };
    }
  }

  // 4. 모든 슬롯이 차있으면 새 슬롯 필요
  return { slotIndex: totalSlots, needNewSlot: true, currentSlotsCount: totalSlots };
}

// 세션의 slots_count를 특정 값으로 보장 (필요시 증가)
async function ensureSlotExists(classroomId: string, todayStr: string, requiredSlots: number): Promise<void> {
  const { data: session } = await supabase
    .from('record_sessions')
    .select('id, slots_count')
    .eq('classroom_id', classroomId)
    .eq('session_date', todayStr)
    .maybeSingle();

  if (!session) {
    // 세션이 없으면 생성
    await supabase.from('record_sessions').insert({
      classroom_id: classroomId,
      session_date: todayStr,
      slots_count: requiredSlots,
    });
  } else if (session.slots_count < requiredSlots) {
    // 기존 세션의 슬롯 수가 부족하면 증가
    await supabase
      .from('record_sessions')
      .update({ slots_count: requiredSlots })
      .eq('id', session.id);
  }
}

// 오늘 날짜의 기록 세션이 있는지 확인하고 없으면 생성 (슬롯 자동 증가 없음)
export async function ensureRecordSessionForToday(classroomId: string): Promise<{ slotIndex: number }> {
  const today = new Date();
  const todayStr = toYMD(today);

  console.log('📡 오늘 기록 세션 확인/생성:', { classroomId, date: todayStr });

  // 오늘 세션이 있는지 확인
  const { data: existingSession, error: sessionError } = await supabase
    .from('record_sessions')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('session_date', todayStr)
    .maybeSingle();

  if (sessionError) {
    console.error('❌ 세션 조회 실패:', sessionError);
    throw sessionError;
  }

  if (existingSession) {
    console.log('✅ 기존 세션 확인됨:', existingSession.slots_count, '슬롯');
    return { slotIndex: existingSession.slots_count - 1 };
  }

  // 새 세션 생성
  const { data: newSession, error: createError } = await supabase
    .from('record_sessions')
    .insert({
      classroom_id: classroomId,
      session_date: todayStr,
      slots_count: 1,
    })
    .select()
    .single();

  if (createError) {
    console.error('❌ 세션 생성 실패:', createError);
    throw createError;
  }

  console.log('✅ 새 세션 생성됨:', newSession);
  return { slotIndex: 0 };
}

// 여러 학급의 학생들에게 기록 저장
export interface MultiClassRecordInput {
  studentId: string;
  classroomId: string;
  timeMs: number;
  isAttendance?: boolean;
}

export async function saveMultiClassRecords(records: MultiClassRecordInput[]): Promise<void> {
  if (records.length === 0) return;

  console.log('📡 크로스-클래스 기록 저장 시작:', records.length, '개');

  const today = new Date();
  const todayStr = toYMD(today);

  // 각 학생별로 첫 번째 비어있는 슬롯 찾아서 기록
  for (const record of records) {
    // 1. 학생별로 비어있는 첫 번째 슬롯 찾기
    const { slotIndex, needNewSlot, currentSlotsCount } = await findFirstEmptySlotForStudent(
      record.studentId,
      record.classroomId,
      todayStr
    );

    // 2. 새 슬롯이 필요하면 세션 slots_count 증가
    if (needNewSlot) {
      await ensureSlotExists(record.classroomId, todayStr, currentSlotsCount + 1);
    } else if (currentSlotsCount === 0) {
      // 세션이 없는 경우 생성
      await ensureSlotExists(record.classroomId, todayStr, 1);
    }

    // 3. 해당 슬롯에 기록 저장
    const { error: insertError } = await supabase
      .from('records')
      .insert({
        student_id: record.studentId,
        time_ms: record.timeMs,
        is_dnf: false,
        slot_index: slotIndex,
        recorded_at: new Date().toISOString(),
        record_date: todayStr,
        is_attendance: record.isAttendance || false,
      });

    if (insertError) {
      console.error('❌ 기록 저장 실패:', insertError);
      throw insertError;
    }

    console.log(`✅ ${record.studentId} 학생 슬롯 ${slotIndex}에 기록 저장 완료`);
  }

  console.log('🎉 모든 크로스-클래스 기록 저장 완료');
}

// 속도측정 일괄 저장 (RPC 방식 - 고성능)
export async function saveSpeedRecordsBatch(
  records: { studentId: string; timeMs: number }[],
  classroomId: string
): Promise<void> {
  if (records.length === 0) return;

  console.log('📡 속도측정 일괄 저장 RPC 호출:', { classroomId, count: records.length });

  const todayStr = toYMD(new Date());

  const { error } = await supabase.rpc('batch_save_speed_records', {
    _student_ids: records.map(r => r.studentId),
    _time_ms_values: records.map(r => r.timeMs),
    _classroom_id: classroomId,
    _record_date: todayStr,
  });

  if (error) {
    console.error('❌ 속도측정 일괄 저장 실패:', error);
    throw error;
  }

  console.log('✅ 속도측정 일괄 저장 완료:', records.length, '명');
}

// 출석체크 일괄 저장 (RPC 방식 - 고성능)
export async function saveAttendanceBatch(studentIds: string[], classroomId: string): Promise<void> {
  if (studentIds.length === 0) return;

  console.log('📡 출석 일괄 저장 RPC 호출:', { classroomId, count: studentIds.length });

  const todayStr = toYMD(new Date());

  const { error } = await supabase.rpc('batch_save_attendance', {
    _student_ids: studentIds,
    _classroom_id: classroomId,
    _record_date: todayStr,
  });

  if (error) {
    console.error('❌ 출석 일괄 저장 실패:', error);
    throw error;
  }

  console.log('✅ 출석 일괄 저장 완료:', studentIds.length, '명');
}