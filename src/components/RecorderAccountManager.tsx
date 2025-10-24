import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Plus, Trash2, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface RecorderAccount {
  id: string;
  email?: string;
  password?: string;
  username: string;
  createdAt: string;
}

interface RecorderAccountManagerProps {
  classroomId: string;
}

export function RecorderAccountManager({ classroomId }: RecorderAccountManagerProps) {
  const [accounts, setAccounts] = useState<RecorderAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [accountCount, setAccountCount] = useState('4');
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

  const handleCreateAccounts = async () => {
    const count = parseInt(accountCount);
    if (isNaN(count) || count < 1 || count > 10) {
      toast.error('1~10 사이의 숫자를 입력해주세요');
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
            count,
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
        toast.success(data.message);
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
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>기록용 계정 생성</DialogTitle>
            <DialogDescription>
              생성할 계정 개수를 입력하세요 (1~10개)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="count">계정 개수</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="10"
                value={accountCount}
                onChange={(e) => setAccountCount(e.target.value)}
                placeholder="4"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreateAccounts} disabled={loading}>
              생성
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
