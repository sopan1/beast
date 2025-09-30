export interface ReferralData {
  id: string;
  referrerCode: string;
  referredUser: string;
  bonusAmount: number;
  status: 'pending' | 'completed' | 'expired';
  createdAt: Date;
}

export interface UserReferralStats {
  totalReferrals: number;
  totalBonus: number;
  pendingBonus: number;
  referralCode: string;
}

class ReferralService {
  private storageKey = 'browser_automation_referrals';
  private userStatsKey = 'browser_automation_user_stats';

  generateReferralCode(userId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `REF${userId.substr(0, 3).toUpperCase()}${timestamp}${random}`.toUpperCase();
  }

  getUserReferralStats(userId: string): UserReferralStats {
    const stored = localStorage.getItem(`${this.userStatsKey}_${userId}`);
    if (stored) {
      return JSON.parse(stored);
    }
    
    const newStats: UserReferralStats = {
      totalReferrals: 0,
      totalBonus: 0,
      pendingBonus: 0,
      referralCode: this.generateReferralCode(userId)
    };
    
    this.saveUserStats(userId, newStats);
    return newStats;
  }

  private saveUserStats(userId: string, stats: UserReferralStats): void {
    localStorage.setItem(`${this.userStatsKey}_${userId}`, JSON.stringify(stats));
  }

  processReferral(referrerCode: string, newUserId: string): { success: boolean; bonus?: number; message: string } {
    try {
      const referrals = this.getReferrals();
      const existingReferral = referrals.find(r => r.referredUser === newUserId);
      
      if (existingReferral) {
        return { success: false, message: 'User already referred' };
      }

      // Find referrer by code
      const allUsers = this.getAllUserStats();
      const referrer = allUsers.find(([, stats]) => stats.referralCode === referrerCode);
      
      if (!referrer) {
        return { success: false, message: 'Invalid referral code' };
      }

      const [referrerId, referrerStats] = referrer;
      const bonusAmount = 50; // 50% bonus

      // Create referral record
      const newReferral: ReferralData = {
        id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        referrerCode,
        referredUser: newUserId,
        bonusAmount,
        status: 'completed',
        createdAt: new Date()
      };

      referrals.push(newReferral);
      this.saveReferrals(referrals);

      // Update referrer stats
      referrerStats.totalReferrals += 1;
      referrerStats.totalBonus += bonusAmount;
      this.saveUserStats(referrerId, referrerStats);

      return { 
        success: true, 
        bonus: bonusAmount, 
        message: `Referral successful! ${bonusAmount}% bonus awarded to referrer.` 
      };
    } catch (error) {
      return { success: false, message: 'Error processing referral' };
    }
  }

  private getReferrals(): ReferralData[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  private saveReferrals(referrals: ReferralData[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(referrals));
  }

  private getAllUserStats(): [string, UserReferralStats][] {
    const users: [string, UserReferralStats][] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.userStatsKey)) {
        const userId = key.replace(`${this.userStatsKey}_`, '');
        const stats = JSON.parse(localStorage.getItem(key) || '{}');
        users.push([userId, stats]);
      }
    }
    return users;
  }

  getReferralHistory(userId: string): ReferralData[] {
    const referrals = this.getReferrals();
    const userStats = this.getUserReferralStats(userId);
    return referrals.filter(r => r.referrerCode === userStats.referralCode);
  }
}

export const referralService = new ReferralService();