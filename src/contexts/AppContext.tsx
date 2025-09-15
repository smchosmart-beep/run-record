// App Context for global state management

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppData, User, ClassRoom, AppMode } from '@/types';
import { loadAppData, saveAppData } from '@/utils/storage';
import { useToast } from '@/hooks/use-toast';

interface AppContextType {
  // State
  user: User | null;
  classrooms: ClassRoom[];
  currentClassroom: ClassRoom | null;
  currentMode: AppMode;
  
  // Actions
  login: (username: string, password: string) => boolean;
  logout: () => void;
  setCurrentClassroom: (classroom: ClassRoom | null) => void;
  setMode: (mode: AppMode) => void;
  addClassroom: (classroom: ClassRoom) => void;
  updateClassroom: (classroom: ClassRoom) => void;
  deleteClassroom: (classId: string) => void;
  saveData: () => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [appData, setAppData] = useState<AppData>(() => loadAppData());
  const [currentClassroom, setCurrentClassroomState] = useState<ClassRoom | null>(null);
  const { toast } = useToast();

  // Load current classroom on startup
  useEffect(() => {
    if (appData.user?.currentClassId) {
      const classroom = appData.classrooms.find(c => c.id === appData.user?.currentClassId);
      setCurrentClassroomState(classroom || null);
    }
  }, [appData.user?.currentClassId, appData.classrooms]);

  const login = (username: string, password: string): boolean => {
    // Simple authentication for Stage 1
    if (username === 'teacher01' && password === '1234') {
      const user: User = {
        id: 'user_1',
        username,
      };
      
      setAppData(prev => ({ ...prev, user }));
      toast({
        title: "로그인 성공",
        description: `${username}님, 환영합니다!`,
      });
      return true;
    }
    
    toast({
      title: "로그인 실패",
      description: "아이디 또는 비밀번호가 잘못되었습니다.",
      variant: "destructive",
    });
    return false;
  };

  const logout = () => {
    setAppData(prev => ({ ...prev, user: null }));
    setCurrentClassroomState(null);
    toast({
      title: "로그아웃",
      description: "성공적으로 로그아웃되었습니다.",
    });
  };

  const setCurrentClassroom = (classroom: ClassRoom | null) => {
    setCurrentClassroomState(classroom);
    
    if (appData.user) {
      const updatedUser = { ...appData.user, currentClassId: classroom?.id };
      setAppData(prev => ({ ...prev, user: updatedUser }));
    }
  };

  const setMode = (mode: AppMode) => {
    setAppData(prev => ({ ...prev, currentMode: mode }));
  };

  const addClassroom = (classroom: ClassRoom) => {
    setAppData(prev => ({
      ...prev,
      classrooms: [...prev.classrooms, classroom]
    }));
    
    toast({
      title: "학급 생성 완료",
      description: `${classroom.school} ${classroom.grade}학년 ${classroom.className}반이 생성되었습니다.`,
    });
  };

  const updateClassroom = (classroom: ClassRoom) => {
    setAppData(prev => ({
      ...prev,
      classrooms: prev.classrooms.map(c => c.id === classroom.id ? classroom : c)
    }));
    
    // Update current classroom if it's the one being updated
    if (currentClassroom?.id === classroom.id) {
      setCurrentClassroomState(classroom);
    }
  };

  const deleteClassroom = (classId: string) => {
    setAppData(prev => ({
      ...prev,
      classrooms: prev.classrooms.filter(c => c.id !== classId)
    }));
    
    if (currentClassroom?.id === classId) {
      setCurrentClassroomState(null);
    }
    
    toast({
      title: "학급 삭제 완료",
      description: "학급이 삭제되었습니다.",
    });
  };

  const saveData = (): boolean => {
    const success = saveAppData(appData);
    if (success) {
      toast({
        title: "저장 완료",
        description: "데이터가 성공적으로 저장되었습니다.",
      });
    } else {
      toast({
        title: "저장 실패",
        description: "데이터 저장에 실패했습니다.",
        variant: "destructive",
      });
    }
    return success;
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveAppData(appData);
    }, 30000);

    return () => clearInterval(interval);
  }, [appData]);

  const contextValue: AppContextType = {
    user: appData.user,
    classrooms: appData.classrooms,
    currentClassroom,
    currentMode: appData.currentMode,
    login,
    logout,
    setCurrentClassroom,
    setMode,
    addClassroom,
    updateClassroom,
    deleteClassroom,
    saveData,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}