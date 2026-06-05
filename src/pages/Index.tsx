import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import heroAsset from "@/assets/rrr-hero.png.asset.json";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useApp();

  if (user) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center px-4 py-8">
      <div className="text-center max-w-3xl mx-auto">
        <img
          src={heroAsset.url}
          alt="RRR 달리기 기록 랭킹 - 학생들이 운동장을 달리고 태블릿으로 기록을 관리하는 모습"
          className="w-full h-auto max-w-2xl mx-auto rounded-2xl shadow-2xl mb-8"
        />

        <Button
          onClick={() => navigate('/auth')}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          시작하기
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>

        <div className="mt-12 pt-8 border-t border-muted-foreground/20">
          <p className="text-center text-sm text-muted-foreground">
            기획자 : 배구왕 조태현 선생님  /  개발자 : 파튀김
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
