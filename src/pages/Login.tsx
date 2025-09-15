import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { Timer, Zap } from 'lucide-react';

const Login = () => {
  const { user, login } = useApp();
  const [username, setUsername] = useState('teacher01');
  const [password, setPassword] = useState('1234');
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate loading delay
    setTimeout(() => {
      login(username, password);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <div className="relative">
              <Timer className="h-8 w-8 text-primary" />
              <Zap className="h-4 w-4 text-accent absolute -top-1 -right-1" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              SpeedUp
            </h1>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            달리기 기록 관리
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            학생들의 달리기 기록을 입력하고 관리해보세요
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">아이디</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="teacher01"
                required
                className="transition-all duration-300 focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="1234"
                required
                className="transition-all duration-300 focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <Button
              type="submit"
              variant="speed"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              <strong>데모 계정:</strong> teacher01 / 1234
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;