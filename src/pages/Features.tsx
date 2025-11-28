import { Timer, Calendar, LineChart, Trophy, UserPlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Features = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Timer,
      title: "스톱워치 연동 측정",
      description: "여러 학생 동시 측정 후 자동으로 기록 입력",
    },
    {
      icon: Calendar,
      title: "날짜별 측정회차",
      description: "날짜마다 여러 회차(슬롯) 기록 관리",
    },
    {
      icon: LineChart,
      title: "개인 기록 그래프",
      description: "학생별 기록 변화를 그래프로 시각화",
    },
    {
      icon: Trophy,
      title: "전체 랭킹",
      description: "개인최고/평균 기준 학급 순위 자동 계산",
    },
    {
      icon: UserPlus,
      title: "기록용 계정",
      description: "다른 사람에게 기록 입력 권한만 부여",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center space-x-2">
            <Timer className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              RRR
            </span>
          </div>
          <Button 
            onClick={() => navigate('/auth')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            시작하기
          </Button>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            RRR 주요 기능
          </h1>
          <p className="text-xl text-muted-foreground">
            달리기 기록 관리를 위한 모든 기능
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button 
            onClick={() => navigate('/auth')}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            지금 시작하기
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Features;
