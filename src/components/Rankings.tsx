import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useApp } from '@/contexts/AppContext';
import { calculateClassRankings, getBestTimeForRanking } from '@/utils/calculations';
import { formatTime } from '@/utils/time';
import { Trophy, Medal, Timer, Hash } from 'lucide-react';

const Rankings = () => {
  const { currentClassroom } = useApp();

  if (!currentClassroom) return null;

  const activeStudents = currentClassroom.students.filter(s => !s.isHidden);
  const rankingType = currentClassroom.rankingType || 'fastest';
  const { byPersonalBest, byAverage, byRecordCount } = calculateClassRankings(activeStudents, rankingType);
  const [rankingMode, setRankingMode] = useState<'pb' | 'avg' | 'count'>('pb');

  const getRankIcon = (position: number, large: boolean = false) => {
    const size = large ? "h-12 w-12" : "h-5 w-5";
    switch (position) {
      case 1:
        return <Medal className={`${size} text-gold`} />;
      case 2:
        return <Medal className={`${size} text-silver`} />;
      case 3:
        return <Medal className={`${size} text-bronze`} />;
      default:
        return <Trophy className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRankBadge = (position: number) => {
    switch (position) {
      case 1:
        return "secondary";
      case 2:
        return "secondary";
      case 3:
        return "secondary";
      default:
        return "secondary";
    }
  };

  const PodiumCard = ({ ranking, type }: { ranking: any; type: 'pb' | 'avg' | 'count' }) => {
    const { student, stats, position } = ranking;
    
    let displayValue: string;
    let title: string;
    
    if (type === 'count') {
      displayValue = `${stats.validRecordsCount}회`;
      title = '누적 횟수';
    } else if (type === 'pb') {
      const time = getBestTimeForRanking(student.records, rankingType);
      displayValue = time ? formatTime(time) : '--';
      title = rankingType === 'slowest' ? '최장 기록' : '최고 기록';
    } else {
      displayValue = stats.averageTime ? formatTime(stats.averageTime) : '--';
      title = '평균 기록';
    }
    
    if (position > 3) return null;

    return (
      <Card className={`transition-all duration-300 hover:shadow-lg ${
        position === 1 ? 'ring-2 ring-gold/30 bg-gold/5' :
        position === 2 ? 'ring-2 ring-silver/30 bg-silver/5' :
        'ring-2 ring-bronze/30 bg-bronze/5'
      }`}>
        <CardContent className="px-6 py-5">
          <div className="flex items-center">
            {/* 왼쪽 절반: 큰 아이콘 + 순위 배지 (세로 배열) */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className={`p-4 rounded-xl ${
                position === 1 ? 'bg-gold/20' :
                position === 2 ? 'bg-silver/20' :
                'bg-bronze/20'
              }`}>
                {getRankIcon(position, true)}
              </div>
              <Badge 
                className={
                  position === 1 ? 'bg-gold text-gold-foreground' :
                  position === 2 ? 'bg-silver text-silver-foreground' :
                  'bg-bronze text-bronze-foreground'
                }
              >
                {position}위
              </Badge>
            </div>
            
            {/* 오른쪽 절반: 번호+이름 + 기록 (세로 배열) */}
            <div className="flex-1 flex flex-col items-center gap-1">
              <h3 className="font-bold text-lg">{student.number}번 {student.name}</h3>
              <p className="text-xl font-bold text-primary">
                {displayValue}
              </p>
              <p className="text-xs text-muted-foreground">{title}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const RankingTable = ({ rankings, type }: { rankings: any[]; type: 'pb' | 'avg' | 'count' }) => {
    // 4위부터만 표시 (1~3위는 Podium에서 표시)
    const filteredRankings = rankings.filter(r => r.position > 3);
    
    if (filteredRankings.length === 0) return null;

    let title: string;
    if (type === 'count') {
      title = '누적 횟수';
    } else if (type === 'pb') {
      title = rankingType === 'slowest' ? '최장 기록' : '최고 기록';
    } else {
      title = '평균 기록';
    }
    
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredRankings.map((ranking) => {
          const { student, stats, position } = ranking;
          
          let displayValue: string;
          if (type === 'count') {
            displayValue = `${stats.validRecordsCount}회`;
          } else if (type === 'pb') {
            const time = getBestTimeForRanking(student.records, rankingType);
            displayValue = time ? formatTime(time) : '--';
          } else {
            displayValue = stats.averageTime ? formatTime(stats.averageTime) : '--';
          }
          
          return (
            <Card key={student.id} className="hover:shadow-md transition-all duration-200">
              <CardContent className="px-4 py-3">
                <div className="flex flex-col items-center text-center gap-1">
                  {/* 순위 뱃지 */}
                  <Badge variant="secondary" className="text-xs">
                    {position}위
                  </Badge>
                  
                  {/* 번호 + 이름 (한 줄) */}
                  <h3 className="font-bold text-base">{student.number}번 {student.name}</h3>
                  
                  {/* 기록 */}
                  <p className="text-lg font-bold text-primary">
                    {displayValue}
                  </p>
                  
                  {/* 기록 타입 */}
                  <p className="text-xs text-muted-foreground">{title}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-foreground mb-2">순위 및 랭킹</h3>
        <p className="text-muted-foreground">
          학급 내 순위와 기록을 확인해보세요
          {rankingType === 'fastest' && ' (시간 빠른 순)'}
          {rankingType === 'slowest' && ' (시간 느린 순)'}
        </p>
      </div>

      {/* Toggle */}
      <ToggleGroup 
        type="single" 
        value={rankingMode} 
        onValueChange={(value) => value && setRankingMode(value as 'pb' | 'avg' | 'count')}
        className="justify-center"
      >
        <ToggleGroupItem value="pb" className="px-6 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          {rankingType === 'slowest' ? '최장' : '최고'} 기록 순위
        </ToggleGroupItem>
        <ToggleGroupItem value="avg" className="px-6 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          평균 기록 순위
        </ToggleGroupItem>
        <ToggleGroupItem value="count" className="px-6 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          누적 횟수 순위
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Rankings Content */}
      {rankingMode === 'pb' && (
        <div className="space-y-6">
          {/* Podium */}
          {byPersonalBest.length >= 3 && (
            <div>
              <h4 className="text-lg font-semibold mb-4 text-center">🏆 Rank 🏆</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {byPersonalBest[0] && (
                  <div className="order-1 md:order-1">
                    <PodiumCard ranking={byPersonalBest[0]} type="pb" />
                  </div>
                )}
                {byPersonalBest[1] && (
                  <div className="order-2 md:order-2">
                    <PodiumCard ranking={byPersonalBest[1]} type="pb" />
                  </div>
                )}
                {byPersonalBest[2] && (
                  <div className="order-3 md:order-3">
                    <PodiumCard ranking={byPersonalBest[2]} type="pb" />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Full Rankings */}
          <div>
            <h4 className="text-lg font-semibold mb-4">전체 순위</h4>
            {byPersonalBest.length > 0 ? (
              <RankingTable rankings={byPersonalBest} type="pb" />
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    아직 기록된 데이터가 없습니다.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {rankingMode === 'avg' && (
        <div className="space-y-6">
          {/* Podium */}
          {byAverage.length >= 3 && (
            <div>
              <h4 className="text-lg font-semibold mb-4 text-center">🏆 Rank 🏆</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {byAverage[0] && (
                  <div className="order-1 md:order-1">
                    <PodiumCard ranking={byAverage[0]} type="avg" />
                  </div>
                )}
                {byAverage[1] && (
                  <div className="order-2 md:order-2">
                    <PodiumCard ranking={byAverage[1]} type="avg" />
                  </div>
                )}
                {byAverage[2] && (
                  <div className="order-3 md:order-3">
                    <PodiumCard ranking={byAverage[2]} type="avg" />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Full Rankings */}
          <div>
            <h4 className="text-lg font-semibold mb-4">전체 순위</h4>
            {byAverage.length > 0 ? (
              <RankingTable rankings={byAverage} type="avg" />
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    아직 기록된 데이터가 없습니다.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {rankingMode === 'count' && (
        <div className="space-y-6">
          {/* Podium */}
          {byRecordCount.length >= 3 && (
            <div>
              <h4 className="text-lg font-semibold mb-4 text-center">🏆 Rank 🏆</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {byRecordCount[0] && (
                  <div className="order-1 md:order-1">
                    <PodiumCard ranking={byRecordCount[0]} type="count" />
                  </div>
                )}
                {byRecordCount[1] && (
                  <div className="order-2 md:order-2">
                    <PodiumCard ranking={byRecordCount[1]} type="count" />
                  </div>
                )}
                {byRecordCount[2] && (
                  <div className="order-3 md:order-3">
                    <PodiumCard ranking={byRecordCount[2]} type="count" />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Full Rankings */}
          <div>
            <h4 className="text-lg font-semibold mb-4">전체 순위</h4>
            {byRecordCount.length > 0 ? (
              <RankingTable rankings={byRecordCount} type="count" />
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    아직 기록된 데이터가 없습니다.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Rankings;