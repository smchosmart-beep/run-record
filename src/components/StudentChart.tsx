import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Student } from '@/types';
import { calculateDailyBest } from '@/utils/calculations';
import { formatTime } from '@/utils/time';
import { format } from 'date-fns';

interface StudentChartProps {
  student: Student;
}

interface ChartData {
  date: string;
  displayDate: string;
  time: number;
  formattedTime: string;
}

const StudentChart: React.FC<StudentChartProps> = ({ student }) => {
  const chartData = useMemo(() => {
    // 날짜별로 기록 그룹화
    const recordsByDate = new Map<string, typeof student.records>();
    
    student.records.forEach(record => {
      if (record.time !== null || record.isDNF) {
        const dateKey = format(record.recordDate, 'yyyy-MM-dd');
        if (!recordsByDate.has(dateKey)) {
          recordsByDate.set(dateKey, []);
        }
        recordsByDate.get(dateKey)!.push(record);
      }
    });

    // 각 날짜별 최고기록 계산
    const dailyBestData: ChartData[] = [];
    
    recordsByDate.forEach((records, dateKey) => {
      const dailyBest = calculateDailyBest(records);
      if (dailyBest !== null) {
        dailyBestData.push({
          date: dateKey,
          displayDate: format(new Date(dateKey), 'MM/dd'),
          time: dailyBest,
          formattedTime: formatTime(dailyBest)
        });
      }
    });

    // 날짜순 정렬
    return dailyBestData.sort((a, b) => a.date.localeCompare(b.date));
  }, [student.records]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm text-muted-foreground">기록이 없습니다</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-md p-2 shadow-md">
          <p className="text-sm font-medium">{`날짜: ${label}`}</p>
          <p className="text-sm text-primary font-semibold">
            {`최고기록: ${payload[0].payload.formattedTime}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <XAxis 
            dataKey="displayDate" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            domain={['dataMin', 'dataMax']}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value) => formatTime(value)}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="time"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StudentChart;