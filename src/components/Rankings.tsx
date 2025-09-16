import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/contexts/AppContext';
import { calculateClassRankings, getClassBestRecord, getBestTimeForRanking } from '@/utils/calculations';
import { formatTime } from '@/utils/time';
import { Trophy, Medal, Award, Crown, Timer } from 'lucide-react';

const Rankings = () => {
  const { currentClassroom } = useApp();

  if (!currentClassroom) return null;

  const activeStudents = currentClassroom.students.filter(s => !s.isHidden);
  const rankingType = currentClassroom.rankingType || 'fastest'; // Default to 'fastest' for existing classrooms
  const { byPersonalBest, byAverage } = calculateClassRankings(activeStudents, rankingType);
  const { time: bestTime, holders } = getClassBestRecord(activeStudents, rankingType);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-5 w-5 text-gold" />;
      case 2:
        return <Medal className="h-5 w-5 text-silver" />;
      case 3:
        return <Award className="h-5 w-5 text-bronze" />;
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

  const PodiumCard = ({ ranking, type }: { ranking: any; type: 'pb' | 'avg' }) => {
    const { student, stats, position } = ranking;
    const time = type === 'pb' ? getBestTimeForRanking(student.records, rankingType) : stats.averageTime;
    const title = type === 'pb' ? (rankingType === 'slowest' ? '최장 기록' : '최고 기록') : '평균 기록';
    
    if (position > 3) return null;

    return (
      <Card className={`text-center transition-all duration-300 hover:shadow-lg ${
        position === 1 ? 'ring-2 ring-gold/30 bg-gold/5' :
        position === 2 ? 'ring-2 ring-silver/30 bg-silver/5' :
        'ring-2 ring-bronze/30 bg-bronze/5'
      }`}>
        <CardHeader className="pb-2">
          <div className="flex justify-center mb-2">
            {getRankIcon(position)}
          </div>
          <Badge 
            className={`mx-auto ${
              position === 1 ? 'bg-gold text-gold-foreground' :
              position === 2 ? 'bg-silver text-silver-foreground' :
              'bg-bronze text-bronze-foreground'
            }`}
          >
            {position}위
          </Badge>
        </CardHeader>
        <CardContent>
          <h3 className="font-bold text-lg mb-1">{student.name}</h3>
          <p className="text-sm text-muted-foreground mb-2">{student.number}번</p>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-primary">
              {time ? formatTime(time) : '--'}
            </p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const RankingTable = ({ rankings, type }: { rankings: any[]; type: 'pb' | 'avg' }) => {
    return (
      <div className="space-y-3">
        {rankings.map((ranking) => {
          const { student, stats, position } = ranking;
          const time = type === 'pb' ? getBestTimeForRanking(student.records, rankingType) : stats.averageTime;
          
          return (
            <Card key={student.id} className="hover:shadow-md transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getRankIcon(position)}
                      <Badge className={
                        position === 1 ? 'bg-gold text-gold-foreground' :
                        position === 2 ? 'bg-silver text-silver-foreground' :
                        position === 3 ? 'bg-bronze text-bronze-foreground' :
                        ''
                      }>
                        {position}위
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">{student.name}</h4>
                      <p className="text-sm text-muted-foreground">{student.number}번</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">
                      {time ? formatTime(time) : '--'}
                    </p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Timer className="h-3 w-3 mr-1" />
                      {stats.validRecordsCount}회 기록
                    </div>
                  </div>
                </div>
                
                {/* Additional stats */}
                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">개인 {rankingType === 'slowest' ? '최장' : '최고'}</p>
                    <p className="font-medium">
                      {getBestTimeForRanking(student.records, rankingType) ? formatTime(getBestTimeForRanking(student.records, rankingType)!) : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">평균 기록</p>
                    <p className="font-medium">
                      {stats.averageTime ? formatTime(stats.averageTime) : '--'}
                    </p>
                  </div>
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

      {/* Class Best Record */}
      {bestTime && holders.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-gold" />
              <span>학급 최고 기록</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary mb-2">
                {formatTime(bestTime)}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {holders.map(holder => (
                  <Badge key={holder.id} variant="secondary" className="text-sm bg-gold text-gold-foreground">
                    {holder.name} ({holder.number}번)
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rankings */}
      <Tabs defaultValue="pb" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pb">{rankingType === 'slowest' ? '최장' : '최고'} 기록 순위</TabsTrigger>
          <TabsTrigger value="avg">평균 기록 순위</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pb" className="space-y-6">
          {/* Podium */}
          {byPersonalBest.length >= 3 && (
            <div>
              <h4 className="text-lg font-semibold mb-4 text-center">🏆 신기록 🏆</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* 1st Place */}
                {byPersonalBest[0] && (
                  <div className="order-1 md:order-1">
                    <PodiumCard ranking={byPersonalBest[0]} type="pb" />
                  </div>
                )}
                
                {/* 2nd Place */}
                {byPersonalBest[1] && (
                  <div className="order-2 md:order-2">
                    <PodiumCard ranking={byPersonalBest[1]} type="pb" />
                  </div>
                )}
                
                {/* 3rd Place */}
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
        </TabsContent>
        
        <TabsContent value="avg" className="space-y-6">
          {/* Podium */}
          {byAverage.length >= 3 && (
            <div>
              <h4 className="text-lg font-semibold mb-4 text-center">🏆 신기록 🏆</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* 1st Place */}
                {byAverage[0] && (
                  <div className="order-1 md:order-1">
                    <PodiumCard ranking={byAverage[0]} type="avg" />
                  </div>
                )}
                
                {/* 2nd Place */}
                {byAverage[1] && (
                  <div className="order-2 md:order-2">
                    <PodiumCard ranking={byAverage[1]} type="avg" />
                  </div>
                )}
                
                {/* 3rd Place */}
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Rankings;