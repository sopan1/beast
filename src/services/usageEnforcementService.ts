import { billingService } from './billingService';
import { UsageStats } from '@/types/billing';

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  remainingProfiles?: number;
  remainingExecutions?: number;
  upgradeRequired?: boolean;
}

class UsageEnforcementService {
  private static instance: UsageEnforcementService;

  static getInstance(): UsageEnforcementService {
    if (!UsageEnforcementService.instance) {
      UsageEnforcementService.instance = new UsageEnforcementService();
    }
    return UsageEnforcementService.instance;
  }

  /**
   * Check if user can create a new profile
   */
  async canCreateProfile(userId: string): Promise<UsageCheckResult> {
    try {
      const usageStats = await billingService.getUserUsageStats(userId);
      
      // Check daily profile limit
      if (usageStats.limits.maxProfilesPerDay !== -1 && 
          usageStats.currentPeriod.profilesCreated >= usageStats.limits.maxProfilesPerDay) {
        return {
          allowed: false,
          reason: `Daily profile limit reached (${usageStats.limits.maxProfilesPerDay} profiles)`,
          remainingProfiles: 0,
          upgradeRequired: true
        };
      }

      // Check total profile limit
      if (usageStats.limits.maxProfiles !== -1 && 
          usageStats.currentPeriod.profilesUsed.length >= usageStats.limits.maxProfiles) {
        return {
          allowed: false,
          reason: `Total profile limit reached (${usageStats.limits.maxProfiles} profiles)`,
          remainingProfiles: 0,
          upgradeRequired: true
        };
      }

      return {
        allowed: true,
        remainingProfiles: usageStats.remaining.profiles,
        remainingExecutions: usageStats.remaining.executions
      };
    } catch (error) {
      console.error('Error checking profile creation limit:', error);
      return {
        allowed: false,
        reason: 'Unable to verify usage limits'
      };
    }
  }

  /**
   * Check if user can run RPA executions
   */
  async canRunExecution(userId: string): Promise<UsageCheckResult> {
    try {
      const usageStats = await billingService.getUserUsageStats(userId);
      
      // Check daily execution limit
      if (usageStats.limits.maxExecutionsPerDay !== -1 && 
          usageStats.currentPeriod.executionsRun >= usageStats.limits.maxExecutionsPerDay) {
        return {
          allowed: false,
          reason: `Daily execution limit reached (${usageStats.limits.maxExecutionsPerDay} executions)`,
          remainingExecutions: 0,
          upgradeRequired: true
        };
      }

      return {
        allowed: true,
        remainingProfiles: usageStats.remaining.profiles,
        remainingExecutions: usageStats.remaining.executions
      };
    } catch (error) {
      console.error('Error checking execution limit:', error);
      return {
        allowed: false,
        reason: 'Unable to verify usage limits'
      };
    }
  }

  /**
   * Check concurrent execution limit
   */
  async canRunConcurrentExecution(userId: string, currentConcurrentCount: number): Promise<UsageCheckResult> {
    try {
      const usageStats = await billingService.getUserUsageStats(userId);
      
      if (currentConcurrentCount >= usageStats.limits.maxConcurrentExecutions) {
        return {
          allowed: false,
          reason: `Concurrent execution limit reached (${usageStats.limits.maxConcurrentExecutions} concurrent executions)`,
          upgradeRequired: true
        };
      }

      return {
        allowed: true,
        remainingProfiles: usageStats.remaining.profiles,
        remainingExecutions: usageStats.remaining.executions
      };
    } catch (error) {
      console.error('Error checking concurrent execution limit:', error);
      return {
        allowed: false,
        reason: 'Unable to verify usage limits'
      };
    }
  }

  /**
   * Record profile creation
   */
  async recordProfileCreation(userId: string, profileId: string): Promise<void> {
    try {
      await billingService.recordUsage(userId, 1, 0, [profileId]);
    } catch (error) {
      console.error('Error recording profile creation:', error);
    }
  }

  /**
   * Record RPA execution
   */
  async recordExecution(userId: string): Promise<void> {
    try {
      await billingService.recordUsage(userId, 0, 1, []);
    } catch (error) {
      console.error('Error recording execution:', error);
    }
  }

  /**
   * Get user's current usage status
   */
  async getUserUsageStatus(userId: string): Promise<UsageStats | null> {
    try {
      return await billingService.getUserUsageStats(userId);
    } catch (error) {
      console.error('Error getting usage status:', error);
      return null;
    }
  }

  /**
   * Check if user has access to a specific feature
   */
  async hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
    try {
      const subscription = await billingService.getUserSubscription(userId);
      if (!subscription) {
        // Free plan - check default features
        return this.getFreePlanFeatures().includes(feature);
      }

      const plan = await billingService.getPlan(subscription.planId);
      if (!plan) return false;

      return plan.features.some(f => f.id === feature && f.included);
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  /**
   * Get features available in free plan
   */
  private getFreePlanFeatures(): string[] {
    return [
      'profiles',
      'executions',
      'support',
      'basic_analytics'
    ];
  }

  /**
   * Check if user is in trial period
   */
  async isInTrial(userId: string): Promise<boolean> {
    try {
      const subscription = await billingService.getUserSubscription(userId);
      return subscription?.status === 'trialing' || false;
    } catch (error) {
      console.error('Error checking trial status:', error);
      return false;
    }
  }

  /**
   * Check if user's subscription is active
   */
  async isSubscriptionActive(userId: string): Promise<boolean> {
    try {
      const subscription = await billingService.getUserSubscription(userId);
      return subscription?.status === 'active' || subscription?.status === 'trialing' || false;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Get upgrade recommendation based on usage
   */
  async getUpgradeRecommendation(userId: string): Promise<{
    recommended: boolean;
    reason: string;
    suggestedPlan: string;
  }> {
    try {
      const usageStats = await billingService.getUserUsageStats(userId);
      const subscription = await billingService.getUserSubscription(userId);

      // If user is on free plan and hitting limits
      if (!subscription || subscription.planId === 'free_plan') {
        if (usageStats.currentPeriod.profilesCreated >= usageStats.limits.maxProfilesPerDay * 0.8) {
          return {
            recommended: true,
            reason: 'You\'re using 80% of your daily profile limit',
            suggestedPlan: 'monthly_plan'
          };
        }

        if (usageStats.currentPeriod.executionsRun >= usageStats.limits.maxExecutionsPerDay * 0.8) {
          return {
            recommended: true,
            reason: 'You\'re using 80% of your daily execution limit',
            suggestedPlan: 'monthly_plan'
          };
        }
      }

      // If user is on monthly plan and needs more concurrent executions
      if (subscription?.planId === 'monthly_plan') {
        if (usageStats.limits.maxConcurrentExecutions < 10) {
          return {
            recommended: true,
            reason: 'Need more concurrent executions for better performance',
            suggestedPlan: 'yearly_plan'
          };
        }
      }

      return {
        recommended: false,
        reason: '',
        suggestedPlan: ''
      };
    } catch (error) {
      console.error('Error getting upgrade recommendation:', error);
      return {
        recommended: false,
        reason: '',
        suggestedPlan: ''
      };
    }
  }
}

export const usageEnforcementService = UsageEnforcementService.getInstance();
