import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateRecorderRequest {
  classroomId: string;
  count: number;
}

interface DeleteRecorderRequest {
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('인증이 필요합니다');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('인증 실패');
    }

    const { method } = req;
    const url = new URL(req.url);

    // CREATE recorder accounts
    if (method === 'POST' && url.pathname.endsWith('/create')) {
      const { classroomId, count }: CreateRecorderRequest = await req.json();

      console.log(`Creating ${count} recorder accounts for classroom ${classroomId}`);

      // Verify user owns the classroom
      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('id, user_id')
        .eq('id', classroomId)
        .eq('user_id', user.id)
        .single();

      if (classroomError || !classroom) {
        throw new Error('학급을 찾을 수 없거나 권한이 없습니다');
      }

      const createdAccounts = [];

      for (let i = 0; i < count; i++) {
        // Generate unique email for recorder
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const email = `recorder-${timestamp}-${random}@classroom-${classroomId}.speedup.app`;
        const password = generatePassword();

        // Create auth user with username in metadata
        const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            username: `기록용계정-${i + 1}`,
          },
        });

        if (signUpError || !authData.user) {
          console.error('Error creating auth user:', signUpError);
          continue;
        }

        // Wait a bit for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 100));

        // Assign recorder role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'recorder',
            classroom_id: classroomId,
          });

        if (roleError) {
          console.error('Error assigning role:', roleError);
          // Clean up
          await supabase.auth.admin.deleteUser(authData.user.id);
          continue;
        }

        createdAccounts.push({
          id: authData.user.id,
          email,
          password,
          username: `기록용계정-${i + 1}`,
        });

        console.log(`Created recorder account: ${email}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          accounts: createdAccounts,
          message: `${createdAccounts.length}개의 기록용 계정이 생성되었습니다`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE recorder account
    if (method === 'POST' && url.pathname.endsWith('/delete')) {
      const { userId }: DeleteRecorderRequest = await req.json();

      console.log(`Deleting recorder account: ${userId}`);

      // Verify the account is a recorder for user's classroom
      const { data: roleData, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('classroom_id, classrooms(user_id)')
        .eq('user_id', userId)
        .eq('role', 'recorder')
        .single();

      if (roleCheckError || !roleData) {
        throw new Error('기록용 계정을 찾을 수 없습니다');
      }

      // @ts-ignore - Supabase types issue
      if (roleData.classrooms?.user_id !== user.id) {
        throw new Error('권한이 없습니다');
      }

      // Delete the user (cascade will delete profile and role)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteError) {
        throw new Error('계정 삭제 실패: ' + deleteError.message);
      }

      console.log(`Deleted recorder account: ${userId}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: '기록용 계정이 삭제되었습니다',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LIST recorder accounts for a classroom
    if (method === 'GET') {
      const classroomId = url.searchParams.get('classroomId');

      if (!classroomId) {
        throw new Error('classroomId가 필요합니다');
      }

      // Verify user owns the classroom
      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('id')
        .eq('id', classroomId)
        .eq('user_id', user.id)
        .single();

      if (classroomError || !classroom) {
        throw new Error('학급을 찾을 수 없거나 권한이 없습니다');
      }

      // Get recorder accounts
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, created_at, profiles(username)')
        .eq('classroom_id', classroomId)
        .eq('role', 'recorder')
        .order('created_at', { ascending: false });

      if (rolesError) {
        throw new Error('계정 목록 조회 실패');
      }

      const accounts = roles.map((role: any) => ({
        id: role.user_id,
        username: role.profiles?.username || '알 수 없음',
        createdAt: role.created_at,
      }));

      return new Response(
        JSON.stringify({ success: true, accounts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('지원하지 않는 요청입니다');

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || '알 수 없는 오류가 발생했습니다',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generatePassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
