import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClassRoom } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  className: z.string().min(1, '반 이름을 입력해주세요').max(50, '반 이름은 50자를 초과할 수 없습니다'),
});

interface EditClassModalProps {
  classroom: ClassRoom;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditClassModal: React.FC<EditClassModalProps> = ({ classroom, open, onOpenChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { updateClassroom } = useApp();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      className: classroom.className,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      await updateClassroom(classroom.id, {
        ...classroom,
        className: values.className,
      });
      onOpenChange(false);
      form.reset({ className: values.className });
    } catch (error) {
      console.error('Failed to update classroom:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset({ className: classroom.className });
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>학급 정보 수정</DialogTitle>
          <DialogDescription>
            {classroom.school} {classroom.grade}학년 반의 이름을 수정합니다.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="className"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>반 이름</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="예: 1반, 사랑반, 죽반"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClassModal;