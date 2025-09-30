import React, { useState, useEffect, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Crown, 
  Zap, 
  Lock, 
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { usageEnforcementService, UsageCheckResult } from '@/services/usageEnforcementService';
import { UsageStats } from '@/types/billing';

interface UsageGuardProps {
  userId: string;
  children: ReactNode;
  action: 'createProfile' | 'runExecution' | 'concurrentExecution';
  currentConcurrentCount?: number;
  onActionBlocked?: (result: UsageCheckResult) => void;
  showWarning?: boolean;
}

export default function UsageGuard({ 
  userId, 
  children, 
  action, 
  currentConcurrentCount = 0,
  onActionBlocked,
  showWarning = true 
}: UsageGuardProps) {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [checkResult, setCheckResult] = useState<UsageCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    checkUsage();
  }, [userId, action, currentConcurrentCount]);

  const checkUsage = async () => {
    try {
      setLoading(true);
      
      let result: UsageCheckResult;
      switch (action) {
        case 'createProfile':
          result = await usageEnforcementService.canCreateProfile(userId);
          break;
        case 'runExecution':
          result = await usageEnforcementService.canRunExecution(userId);
          break;
        case 'concurrentExecution':
          result = await usageEnforcementService.canRunConcurrentExecution(userId, currentConcurrentCount);
          break;
        default:
          result = { allowed: true };
      }

      setCheckResult(result);
      setIsBlocked(!result.allowed);

      if (!result.allowed && onActionBlocked) {
        onActionBlocked(result);
      }

      // Load usage stats for display
      const stats = await usageEnforcementService.getUserUsageStatus(userId);
      setUsageStats(stats);

    } catch (error) {
      console.error('Error checking usage:', error);
      setIsBlocked(true);
      setCheckResult({
        allowed: false,
        reason: 'Unable to verify usage limits'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    // Navigate to subscription page or open upgrade modal
    toast.info('Redirecting to subscription page...');
    // This would typically navigate to the subscription page
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="space-y-4">
        {/* Blocked Action Warning */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Lock className="w-5 h-5" />
              Action Blocked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-red-700 mb-4">
              <XCircle className="w-5 h-5" />
              <span>{checkResult?.reason}</span>
            </div>
            
            {checkResult?.upgradeRequired && (
              <div className="space-y-3">
                <p className="text-red-700 text-sm">
                  Upgrade to a higher plan to continue using this feature.
                </p>
                <Button 
                  onClick={handleUpgrade}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        {usageStats && showWarning && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Current Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Profiles Created Today</span>
                    <span>
                      {usageStats.currentPeriod.profilesCreated} / 
                      {usageStats.limits.maxProfilesPerDay === -1 ? '∞' : usageStats.limits.maxProfilesPerDay}
                    </span>
                  </div>
                  <Progress 
                    value={
                      usageStats.limits.maxProfilesPerDay === -1 ? 0 : 
                      (usageStats.currentPeriod.profilesCreated / usageStats.limits.maxProfilesPerDay) * 100
                    } 
                    className="h-2"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Executions Run Today</span>
                    <span>
                      {usageStats.currentPeriod.executionsRun} / 
                      {usageStats.limits.maxExecutionsPerDay === -1 ? '∞' : usageStats.limits.maxExecutionsPerDay}
                    </span>
                  </div>
                  <Progress 
                    value={
                      usageStats.limits.maxExecutionsPerDay === -1 ? 0 : 
                      (usageStats.currentPeriod.executionsRun / usageStats.limits.maxExecutionsPerDay) * 100
                    } 
                    className="h-2"
                  />
                </div>

                <div className="text-sm text-gray-600">
                  Resets on: {new Date(usageStats.resetDate).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Show warning if approaching limits
  if (showWarning && usageStats && checkResult?.allowed) {
    const profileUsagePercent = usageStats.limits.maxProfilesPerDay === -1 ? 0 : 
      (usageStats.currentPeriod.profilesCreated / usageStats.limits.maxProfilesPerDay) * 100;
    const executionUsagePercent = usageStats.limits.maxExecutionsPerDay === -1 ? 0 : 
      (usageStats.currentPeriod.executionsRun / usageStats.limits.maxExecutionsPerDay) * 100;

    const showWarning = profileUsagePercent >= 80 || executionUsagePercent >= 80;

    if (showWarning) {
      return (
        <div className="space-y-4">
          {/* Usage Warning */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="w-5 h-5" />
                Usage Warning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profileUsagePercent >= 80 && (
                  <div className="flex items-center gap-2 text-orange-700">
                    <Users className="w-4 h-4" />
                    <span>
                      You've used {Math.round(profileUsagePercent)}% of your daily profile limit
                    </span>
                  </div>
                )}
                
                {executionUsagePercent >= 80 && (
                  <div className="flex items-center gap-2 text-orange-700">
                    <Activity className="w-4 h-4" />
                    <span>
                      You've used {Math.round(executionUsagePercent)}% of your daily execution limit
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleUpgrade}
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Upgrade Plan
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Wait for Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Original Content */}
          {children}
        </div>
      );
    }
  }

  // All good - show original content
  return <>{children}</>;
}

// Higher-order component for easier usage
export function withUsageGuard<P extends object>(
  Component: React.ComponentType<P>,
  action: 'createProfile' | 'runExecution' | 'concurrentExecution',
  options?: {
    showWarning?: boolean;
    onActionBlocked?: (result: UsageCheckResult) => void;
  }
) {
  return function UsageGuardedComponent(props: P & { userId: string; currentConcurrentCount?: number }) {
    const { userId, currentConcurrentCount, ...componentProps } = props;
    
    return (
      <UsageGuard
        userId={userId}
        action={action}
        currentConcurrentCount={currentConcurrentCount}
        showWarning={options?.showWarning}
        onActionBlocked={options?.onActionBlocked}
      >
        <Component {...(componentProps as P)} />
      </UsageGuard>
    );
  };
}
