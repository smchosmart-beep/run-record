import { Timer, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useApp();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-4">
        <div className="flex justify-center items-center space-x-3 mb-8 py-4 overflow-visible">
          <div className="relative">
            <Timer className="h-16 w-16 text-primary" />
            <Zap className="h-8 w-8 text-accent absolute -top-2 -right-2" />
          </div>
          <h1 className="text-5xl font-bold leading-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent py-2">
            Run Record Ranking
          </h1>
        </div>
        
        <h2 className="text-3xl font-bold text-foreground mb-4">
          달리기 기록 관리 시스템
        </h2>
        
        <p className="text-xl text-muted-foreground mb-8">
          학생들의 달리기 기록을 쉽게 입력하고 순위를 확인해보세요
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => navigate('/features')}
            size="lg"
            variant="outline"
            className="border-2"
          >
            주요 기능
          </Button>
          <Button 
            onClick={() => navigate('/auth')}
            size="lg" 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            시작하기
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
        
        <div className="mt-16 pt-8 border-t border-muted-foreground/20">
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>기획자 : 배구왕 조태현 선생님</p>
            <p>개발자 : 파튀김</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
