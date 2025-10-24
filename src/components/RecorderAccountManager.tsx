import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Plus, Trash2, UserPlus, X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface RecorderAccount {
  id: string;
  email?: string;
  password?: string;
  username: string;
  createdAt: string;
}

interface NewAccountForm {
  username: string;
  password: string;
  error?: string;
}

interface RecorderAccountManagerProps {
  classroomId: string;
}

export function RecorderAccountManager({ classroomId }: RecorderAccountManagerProps) {
  const [accounts, setAccounts] = useState<RecorderAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAccounts, setNewAccounts] = useState<NewAccountForm[]>([{ username: '', password: '' }]);
  const [createdAccounts, setCreatedAccounts] = useState<RecorderAccount[]>([]);
  const [showCreatedAccounts, setShowCreatedAccounts] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, [classroomId]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Use direct fetch for GET request with query parameters
      const response = await fetch(
        `https://xkgphplswdwfkxoghrgi.supabase.co/functions/v1/manage-recorder-accounts?classroomId=${classroomId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '계정 목록 조회 실패');
      }

      if (data?.success) {
        setAccounts(data.accounts);
      }
    } catch (error: any) {
      console.error('Error loading accounts:', error);
      toast.error('계정 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const addAccountForm = () => {
    if (newAccounts.length < 10) {
      setNewAccounts([...newAccounts, { username: '', password: '' }]);
    }
  };

  const removeAccountForm = (index: number) => {
    if (newAccounts.length > 1) {
      setNewAccounts(newAccounts.filter((_, i) => i !== index));
    }
  };

  const updateAccountForm = (index: number, field: 'username' | 'password', value: string) => {
    const updated = [...newAccounts];
    updated[index][field] = value;
    updated[index].error = undefined;
    setNewAccounts(updated);
  };

  const validateAccounts = (): boolean => {
    let isValid = true;
    const updated = newAccounts.map(account => {
      const errors: string[] = [];
      
      if (!account.username.trim()) {
        errors.push('아이디를 입력하세요');
        isValid = false;
      } else if (account.username.length < 2) {
        errors.push('아이디는 2자 이상이어야 합니다');
        isValid = false;
      }
      
      if (!account.password) {
        errors.push('비밀번호를 입력하세요');
        isValid = false;
      } else if (account.password.length < 8) {
        errors.push('비밀번호는 8자 이상이어야 합니다');
        isValid = false;
      }
      
      return { ...account, error: errors.join(', ') };
    });

    setNewAccounts(updated);

    // Check for duplicate usernames
    const usernames = newAccounts.map(a => a.username.trim().toLowerCase());
    const hasDuplicates = usernames.some((username, index) => 
      username && usernames.indexOf(username) !== index
    );
    
    if (hasDuplicates) {
      toast.error('중복된 아이디가 있습니다');
      isValid = false;
    }

    return isValid;
  };

  const handleCreateAccounts = async () => {
    if (!validateAccounts()) {
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('인증이 필요합니다');

      const response = await fetch(
        'https://xkgphplswdwfkxoghrgi.supabase.co/functions/v1/manage-recorder-accounts/create',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            classroomId,
            accounts: newAccounts.map(acc => ({
              username: acc.username.trim(),
              password: acc.password,
            })),
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '계정 생성 실패');
      }

      if (data?.success) {
        setCreatedAccounts(data.accounts);
        setShowCreatedAccounts(true);
        setCreateDialogOpen(false);
        setNewAccounts([{ username: '', password: '' }]);
        toast.success(data.message);
        
        if (data.failed && data.failed.length > 0) {
          toast.error(`일부 계정 생성 실패: ${data.failed.map((f: any) => f.username).join(', ')}`);
        }
        
        await loadAccounts();
      }
    } catch (error: any) {
      console.error('Error creating accounts:', error);
      toast.error(error.message || '계정 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('인증이 필요합니다');

      const response = await fetch(
        'https://xkgphplswdwfkxoghrgi.supabase.co/functions/v1/manage-recorder-accounts/delete',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: accountToDelete,
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '계정 삭제 실패');
      }

      if (data?.success) {
        toast.success(data.message);
        setAccounts(prev => prev.filter(acc => acc.id !== accountToDelete));
        setDeleteDialogOpen(false);
        setAccountToDelete(null);
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message || '계정 삭제에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}이(가) 복사되었습니다`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">기록용 계정 관리</h3>
          <p className="text-sm text-muted-foreground">
            학생들이 직접 기록을 입력할 수 있는 계정을 생성하고 관리합니다
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />
          계정 생성
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              아직 생성된 기록용 계정이 없습니다.<br />
              계정을 생성하여 학생들에게 배포하세요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <CardTitle className="text-base">{account.username}</CardTitle>
                <CardDescription>
                  생성일: {format(new Date(account.createdAt), 'PPP', { locale: ko })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setAccountToDelete(account.id);
                    setDeleteDialogOpen(true);
                  }}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Accounts Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          setNewAccounts([{ username: '', password: '' }]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>기록용 계정 생성</DialogTitle>
            <DialogDescription>
              아이디와 비밀번호를 입력하세요 (비밀번호는 8자 이상)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {newAccounts.map((account, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium">계정 {index + 1}</h4>
                  {newAccounts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAccountForm(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`username-${index}`}>아이디</Label>
                    <Input
                      id={`username-${index}`}
                      placeholder="예: 1모둠"
                      value={account.username}
                      onChange={(e) => updateAccountForm(index, 'username', e.target.value)}
                      className={account.error && !account.username ? 'border-destructive' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`password-${index}`}>비밀번호</Label>
                    <Input
                      id={`password-${index}`}
                      type="password"
                      placeholder="8자 이상"
                      value={account.password}
                      onChange={(e) => updateAccountForm(index, 'password', e.target.value)}
                      className={account.error && !account.password ? 'border-destructive' : ''}
                    />
                  </div>
                  {account.error && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{account.error}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
            
            {newAccounts.length < 10 && (
              <Button
                variant="outline"
                onClick={addAccountForm}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                계정 추가
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCreateDialogOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button 
              onClick={handleCreateAccounts}
              disabled={loading}
            >
              {loading ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Created Accounts Display Dialog */}
      <Dialog open={showCreatedAccounts} onOpenChange={setShowCreatedAccounts}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>생성된 계정 정보</DialogTitle>
            <DialogDescription>
              아래 정보를 학생들에게 전달하세요. 이 정보는 다시 확인할 수 없으니 반드시 복사해두세요!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {createdAccounts.map((account, index) => (
              <Card key={account.id}>
                <CardHeader>
                  <CardTitle className="text-base">{account.username}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">이메일</Label>
                      <p className="text-sm font-mono">{account.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(account.email!, '이메일')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">비밀번호</Label>
                      <p className="text-sm font-mono">{account.password}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(account.password!, '비밀번호')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCreatedAccounts(false)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>계정을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 계정이 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAccountToDelete(null)}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} disabled={loading}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
