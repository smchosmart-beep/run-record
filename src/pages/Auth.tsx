import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Zap } from "lucide-react";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupPassword, setSignupPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkUser();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      toast.error("모든 필드를 입력해주세요");
      return;
    }

    setIsLoading(true);
    try {
      // Convert username to email format for Supabase
      const email = `${loginUsername}@speedup.app`;
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("사용자명 또는 비밀번호가 틀렸습니다");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("이메일 확인이 필요합니다. 관리자에게 문의하거나 Supabase 대시보드에서 이메일 확인을 비활성화해주세요.", {
            duration: 8000,
            description: "Authentication > Providers > Email에서 'Confirm email' 설정을 OFF로 변경"
          });
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("로그인되었습니다!");
      navigate('/dashboard');
    } catch (error: any) {
      toast.error("로그인 중 오류가 발생했습니다");
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupPassword || !signupUsername) {
      toast.error("모든 필드를 입력해주세요");
      return;
    }

    if (signupPassword.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다");
      return;
    }

    setIsLoading(true);
    try {
      // Convert username to email format for Supabase
      const email = `${signupUsername}@speedup.app`;
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: signupUsername,
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast.error("이미 사용 중인 사용자명입니다");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("회원가입이 완료되었습니다! 바로 로그인할 수 있습니다.");
      // Switch to login tab after successful signup
    } catch (error: any) {
      toast.error("회원가입 중 오류가 발생했습니다");
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SpeedUp
            </h1>
            <p className="text-sm text-muted-foreground">달리기 기록 관리</p>
          </div>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="space-y-1 pb-4">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">로그인</TabsTrigger>
                <TabsTrigger value="signup">회원가입</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <CardTitle>로그인</CardTitle>
                  <CardDescription>
                    계정에 로그인하여 학급 관리를 시작하세요
                  </CardDescription>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-username">사용자명</Label>
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="사용자명"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">비밀번호</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? "로그인 중..." : "로그인"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4">
                  <CardTitle>회원가입</CardTitle>
                  <CardDescription>
                    새 계정을 만들어 시작하세요
                  </CardDescription>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">사용자명</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="홍길동"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">비밀번호</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="6자 이상"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? "가입 중..." : "회원가입"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>테스트용 계정</p>
          <p>사용자명: demo</p>
          <p>비밀번호: demo123</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;