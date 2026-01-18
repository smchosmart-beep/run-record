import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Timer, Zap } from "lucide-react";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupPassword, setSignupPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");

  // 인증 상태 변경 감지하여 네비게이션  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ 인증 상태 변경 감지 - 대시보드로 이동');
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
    console.log('Starting login process for:', loginUsername);
    
    // Create timeout promise to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Login timeout')), 30000); // 30 second timeout
    });

    try {
      // Convert username to email format for Supabase
      const email = `${loginUsername}@speedup.app`;
      console.log('Attempting login with email:', email);
      
      // Race between login and timeout
      const { error } = await Promise.race([
        supabase.auth.signInWithPassword({
          email,
          password: loginPassword,
        }),
        timeoutPromise
      ]) as any;

      if (error) {
        console.error('Login error:', error);
        if (error.message.includes("Invalid login credentials")) {
          toast.error("ID 또는 비밀번호가 틀렸습니다");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("이메일 확인이 필요합니다. 관리자에게 문의하거나 Supabase 대시보드에서 이메일 확인을 비활성화해주세요.", {
            duration: 8000,
            description: "Authentication > Providers > Email에서 'Confirm email' 설정을 OFF로 변경"
          });
        } else if (error.message.includes("Network")) {
          toast.error("네트워크 연결을 확인해주세요");
        } else {
          toast.error(error.message);
        }
        return;
      }

      console.log('Login successful - waiting for auth state change');
      toast.success("로그인되었습니다!");
      // 네비게이션은 onAuthStateChange에서 처리
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message === 'Login timeout') {
        toast.error("로그인 시간이 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해주세요.");
      } else if (error.message?.includes("Network") || error.message?.includes("fetch")) {
        toast.error("네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도해주세요.");
      } else {
        toast.error("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      console.log('Login process completed');
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
          toast.error("이미 사용 중인 ID입니다");
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
          <div className="relative">
            <Timer className="h-8 w-8 text-primary" />
            <Zap className="h-4 w-4 text-accent absolute -top-1 -right-1" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              RRR
            </h1>
            <p className="text-sm text-muted-foreground">Run Record Ranking</p>
          </div>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="space-y-1 pb-4">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">로그인</TabsTrigger>
                <TabsTrigger value="signup">계정생성</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  
                  <CardDescription>
                    계정에 로그인하여 학급 관리를 시작하세요
                  </CardDescription>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-username">ID</Label>
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="ID를 입력하세요"
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
                      placeholder="6자 이상"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                
                <CardFooter className="flex flex-col gap-2">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? "로그인 중..." : "로그인"}
                  </Button>
                  {isLoading && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setIsLoading(false);
                        toast.info("로그인이 취소되었습니다");
                      }}
                    >
                      취소
                    </Button>
                  )}
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4">
                  <CardTitle>계정생성</CardTitle>
                  <CardDescription>
                    새 계정을 만들어 시작하세요
                  </CardDescription>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">ID</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="예 : hong123"
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
                    {isLoading ? "가입 중..." : "계정생성"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>© 파튀김 선생님이 모든 권리 보유.</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;