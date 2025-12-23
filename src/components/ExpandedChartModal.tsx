import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Student } from '@/types';
import StudentChart from './StudentChart';

interface ExpandedChartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  yAxisDomain?: [number, number] | null;
}

const ExpandedChartModal: React.FC<ExpandedChartModalProps> = ({
  open,
  onOpenChange,
  student,
  yAxisDomain
}) => {
  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {student.number}번 {student.name} - 기록 추이 (최근 15회)
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <StudentChart 
            student={student} 
            yAxisDomain={yAxisDomain}
            maxRecords={15}
            isExpanded={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpandedChartModal;
