import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, ClassRoom, AppMode } from '@/types';
import { supabase } from "@/integrations/supabase/client";
import { getClassrooms, createClassroom, updateClassroom, deleteClassroom, getUserProfile } from '@/utils/supabaseApi';
import { toast } from 'sonner';
import type { Session } from '@supabase/supabase-js';

interface AppContextType {
  user: User | null;
  session: Session | null;
  classrooms: ClassRoom[];
  currentClassroom: ClassRoom | null;
  currentMode: AppMode;
  isLoading: boolean;
  logout: () => Promise<void>;
  setCurrentClassroom: (classroom: ClassRoom | null) => void;
  setMode: (mode: AppMode) => void;
  addClassroom: (classroom: ClassRoom) => Promise<void>;
  updateClassroom: (classroomId: string, updates: Partial<ClassRoom>) => Promise<void>;
  deleteClassroom: (classroomId: string) => Promise<void>;
  refreshClassrooms: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [classrooms, setClassrooms] = useState<ClassRoom[]>([]);
  const [currentClassroom, setCurrentClassroomState] = useState<ClassRoom | null>(null);
  const [currentMode, setCurrentMode] = useState<AppMode>('view');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Fetch user profile
          try {
            const profile = await getUserProfile();
            setUser({
              id: profile.id,
              username: profile.username,
            });
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        } else {
          setUser(null);
          setClassrooms([]);
          setCurrentClassroomState(null);
        }
        
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load classrooms when user is authenticated
  useEffect(() => {
    if (user && session) {
      refreshClassrooms();
    }
  }, [user, session]);

  const refreshClassrooms = async () => {
    if (!user || !session) return;

    try {
      setIsLoading(true);
      const data = await getClassrooms();
      setClassrooms(data);
    } catch (error) {
      console.error('Error loading classrooms:', error);
      toast.error('학급 데이터를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        toast.error('로그아웃 중 오류가 발생했습니다');
        return;
      }
      
      // Clear local state
      setUser(null);
      setSession(null);
      setClassrooms([]);
      setCurrentClassroomState(null);
      setCurrentMode('view');
      
      toast.success('로그아웃되었습니다');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('로그아웃 중 오류가 발생했습니다');
    }
  };

  const setCurrentClassroom = (classroom: ClassRoom | null) => {
    setCurrentClassroomState(classroom);
  };

  const setMode = (mode: AppMode) => {
    setCurrentMode(mode);
  };

  const addClassroom = async (classroom: ClassRoom) => {
    try {
      setIsLoading(true);
      const newClassroom = await createClassroom(classroom);
      setClassrooms(prev => [newClassroom, ...prev]);
      toast.success('학급이 성공적으로 생성되었습니다');
    } catch (error) {
      console.error('Error creating classroom:', error);
      toast.error('학급 생성에 실패했습니다');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateClassroomData = async (classroomId: string, updates: Partial<ClassRoom>) => {
    try {
      console.log('Updating classroom:', classroomId, updates);
      await updateClassroom(classroomId, updates);
      
      // Update local state
      setClassrooms(prev =>
        prev.map(classroom =>
          classroom.id === classroomId
            ? { ...classroom, ...updates, updatedAt: new Date() }
            : classroom
        )
      );
      
      // Update current classroom if it's the one being updated
      if (currentClassroom?.id === classroomId) {
        setCurrentClassroomState(prev => 
          prev ? { ...prev, ...updates, updatedAt: new Date() } : null
        );
      }
      
      toast.success('학급 정보가 업데이트되었습니다');
    } catch (error: any) {
      console.error('Error updating classroom:', error);
      
      // Provide more specific error messages
      let errorMessage = '학급 업데이트에 실패했습니다';
      if (error?.message?.includes('uuid')) {
        errorMessage = 'ID 형식 오류로 저장에 실패했습니다';
      } else if (error?.message?.includes('foreign key')) {
        errorMessage = '데이터 관계 오류로 저장에 실패했습니다';
      } else if (error?.message?.includes('RLS')) {
        errorMessage = '권한 오류로 저장에 실패했습니다';
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  const deleteClassroomData = async (classroomId: string) => {
    try {
      await deleteClassroom(classroomId);
      
      // Update local state
      setClassrooms(prev => prev.filter(classroom => classroom.id !== classroomId));
      
      // If the deleted classroom was the current one, clear it
      if (currentClassroom?.id === classroomId) {
        setCurrentClassroom(null);
      }
      
      toast.success('학급이 삭제되었습니다');
    } catch (error) {
      console.error('Error deleting classroom:', error);
      toast.error('학급 삭제에 실패했습니다');
      throw error;
    }
  };

  const value = {
    user,
    session,
    classrooms,
    currentClassroom,
    currentMode,
    isLoading,
    logout,
    setCurrentClassroom,
    setMode,
    addClassroom: addClassroom,
    updateClassroom: updateClassroomData,
    deleteClassroom: deleteClassroomData,
    refreshClassrooms,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export { AppProvider };