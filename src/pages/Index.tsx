import { Timer, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-4">
        <div className="flex justify-center items-center space-x-3 mb-8">
          <div className="relative">
            <Timer className="h-16 w-16 text-primary" />
            <Zap className="h-8 w-8 text-accent absolute -top-2 -right-2" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            SpeedUp
          </h1>
        </div>
        
        <h2 className="text-3xl font-bold text-foreground mb-4">
          달리기 기록 관리 시스템
        </h2>
        
        <p className="text-xl text-muted-foreground mb-8">
          학생들의 달리기 기록을 쉽게 입력하고 순위를 확인해보세요
        </p>
        
        <div className="space-y-4">
          <Button 
            variant="speed" 
            size="lg" 
            className="text-lg px-8 py-3"
            onClick={() => window.location.href = '/login'}
          >
            시작하기
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
