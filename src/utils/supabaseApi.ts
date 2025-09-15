// Supabase API functions to replace localStorage operations

import { supabase } from "@/integrations/supabase/client";
import { ClassRoom, Student, Record } from "@/types";

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
          // Update existing student
          const { error: updateError } = await supabase
            .from('students')
            .update({
              number: student.number,
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