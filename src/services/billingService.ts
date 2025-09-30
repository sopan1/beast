import Razorpay from 'razorpay';
import crypto from 'crypto';
import { 
  SubscriptionPlan, 
  UserSubscription, 
  UsageRecord, 
  PaymentRecord, 
  CouponCode, 
  BillingSettings,
  Invoice,
  UsageStats,
  RazorpayPlan,
  RazorpaySubscription,
  RazorpayPayment,
  BillingWebhookEvent
} from '@/types/billing';

class BillingService {
  private static instance: BillingService;
  private razorpay: Razorpay;
  private settings: BillingSettings;

  private constructor() {
    this.settings = this.loadBillingSettings();
    this.razorpay = new Razorpay({
      key_id: this.settings.razorpayKeyId,
      key_secret: this.settings.razorpayKeySecret,
    });
  }

  static getInstance(): BillingService {
    if (!BillingService.instance) {
      BillingService.instance = new BillingService();
    }
    return BillingService.instance;
  }

  private loadBillingSettings(): BillingSettings {
    // Load from environment variables or config file
    return {
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret_placeholder',
      currency: 'INR',
      trialDays: 7,
      gracePeriodDays: 3,
      autoRenewal: true,
      invoicePrefix: 'BB',
      taxRate: 18, // 18% GST
      isActive: true
    };
  }

  // Plan Management
  async createPlan(planData: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan> {
    const razorpayPlan = await this.razorpay.plans.create({
      period: planData.interval,
      interval: planData.intervalCount,
      item: {
        name: planData.name,
        description: planData.description,
        amount: planData.price,
        currency: planData.currency,
        type: 'plan'
      },
      notes: {
        features: JSON.stringify(planData.features),
        limits: JSON.stringify(planData.limits)
      }
    });

    const plan: SubscriptionPlan = {
      id: razorpayPlan.id,
      name: planData.name,
      description: planData.description,
      price: planData.price,
      currency: planData.currency,
      interval: planData.interval,
      intervalCount: planData.intervalCount,
      features: planData.features,
      limits: planData.limits,
      isPopular: planData.isPopular,
      isActive: planData.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store in local storage/database
    this.savePlan(plan);
    return plan;
  }

  async getPlans(): Promise<SubscriptionPlan[]> {
    const plans = this.loadPlans();
    return plans.filter(plan => plan.isActive);
  }

  async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    const plans = this.loadPlans();
    return plans.find(plan => plan.id === planId) || null;
  }

  // Subscription Management
  async createSubscription(
    userId: string, 
    planId: string, 
    couponCode?: string
  ): Promise<{ subscription: UserSubscription; paymentOrder?: any }> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Check if user already has an active subscription
    const existingSubscription = await this.getUserSubscription(userId);
    if (existingSubscription && existingSubscription.status === 'active') {
      throw new Error('User already has an active subscription');
    }

    // Calculate pricing with coupon
    let finalPrice = plan.price;
    let couponId: string | undefined;
    
    if (couponCode) {
      const coupon = await this.validateCoupon(couponCode, planId);
      if (coupon) {
        if (coupon.type === 'percentage') {
          finalPrice = Math.round(plan.price * (1 - coupon.value / 100));
        } else {
          finalPrice = Math.max(0, plan.price - coupon.value);
        }
        couponId = coupon.id;
      }
    }

    // Create Razorpay subscription
    const razorpaySubscription = await this.razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      quantity: 1,
      total_count: plan.interval === 'year' ? 1 : 12, // 1 year or 12 months
      start_at: Math.floor(Date.now() / 1000),
      expire_by: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      notes: {
        user_id: userId,
        coupon_id: couponId,
        final_price: finalPrice.toString()
      }
    });

    // Create local subscription record
    const subscription: UserSubscription = {
      id: razorpaySubscription.id,
      userId,
      planId,
      status: 'trialing',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + (plan.interval === 'year' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
      trialStart: new Date().toISOString(),
      trialEnd: new Date(Date.now() + this.settings.trialDays * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      razorpaySubscriptionId: razorpaySubscription.id,
      razorpayPlanId: planId,
      metadata: {
        couponId,
        originalPrice: plan.price,
        finalPrice
      }
    };

    this.saveSubscription(subscription);

    // Record coupon usage if applicable
    if (couponId) {
      await this.recordCouponUsage(couponId, userId, subscription.id, plan.price - finalPrice);
    }

    return { subscription };
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const subscriptions = this.loadSubscriptions();
    return subscriptions.find(sub => sub.userId === userId && sub.status === 'active') || null;
  }

  async cancelSubscription(userId: string, cancelAtPeriodEnd: boolean = true): Promise<UserSubscription> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    if (cancelAtPeriodEnd) {
      // Cancel at period end
      await this.razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId!);
      
      subscription.cancelAtPeriodEnd = true;
      subscription.cancelledAt = new Date().toISOString();
      subscription.updatedAt = new Date().toISOString();
    } else {
      // Cancel immediately
      await this.razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId!);
      
      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date().toISOString();
      subscription.updatedAt = new Date().toISOString();
    }

    this.saveSubscription(subscription);
    return subscription;
  }

  // Usage Tracking
  async recordUsage(userId: string, profilesCreated: number = 0, executionsRun: number = 0, profilesUsed: string[] = []): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const existingUsage = this.loadUsageRecord(userId, today);
    
    const usage: UsageRecord = {
      id: `usage_${userId}_${today}`,
      userId,
      date: today,
      profilesCreated: (existingUsage?.profilesCreated || 0) + profilesCreated,
      executionsRun: (existingUsage?.executionsRun || 0) + executionsRun,
      profilesUsed: [...new Set([...(existingUsage?.profilesUsed || []), ...profilesUsed])],
      createdAt: new Date().toISOString()
    };

    this.saveUsageRecord(usage);
  }

  async getUserUsageStats(userId: string): Promise<UsageStats> {
    const subscription = await this.getUserSubscription(userId);
    const plan = subscription ? await this.getPlan(subscription.planId) : await this.getFreePlan();
    
    if (!plan) {
      throw new Error('No plan found');
    }

    const today = new Date().toISOString().split('T')[0];
    const usage = this.loadUsageRecord(userId, today);

    return {
      userId,
      currentPeriod: {
        profilesCreated: usage?.profilesCreated || 0,
        executionsRun: usage?.executionsRun || 0,
        profilesUsed: usage?.profilesUsed || []
      },
      limits: plan.limits,
      remaining: {
        profiles: Math.max(0, plan.limits.maxProfilesPerDay - (usage?.profilesCreated || 0)),
        executions: Math.max(0, plan.limits.maxExecutionsPerDay - (usage?.executionsRun || 0))
      },
      resetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  }

  // Coupon Management
  async createCoupon(couponData: Omit<CouponCode, 'id' | 'redeemedCount' | 'createdAt' | 'updatedAt'>): Promise<CouponCode> {
    const coupon: CouponCode = {
      id: `coupon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code: couponData.code.toUpperCase(),
      name: couponData.name,
      description: couponData.description,
      type: couponData.type,
      value: couponData.value,
      currency: couponData.currency,
      maxRedemptions: couponData.maxRedemptions,
      redeemedCount: 0,
      validFrom: couponData.validFrom,
      validUntil: couponData.validUntil,
      applicablePlans: couponData.applicablePlans,
      isActive: couponData.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: couponData.createdBy
    };

    this.saveCoupon(coupon);
    return coupon;
  }

  async validateCoupon(code: string, planId: string): Promise<CouponCode | null> {
    const coupons = this.loadCoupons();
    const coupon = coupons.find(c => c.code === code.toUpperCase() && c.isActive);
    
    if (!coupon) return null;

    // Check validity dates
    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validUntil = new Date(coupon.validUntil);

    if (now < validFrom || now > validUntil) return null;

    // Check if applicable to plan
    if (coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(planId)) {
      return null;
    }

    // Check redemption limit
    if (coupon.maxRedemptions && coupon.redeemedCount >= coupon.maxRedemptions) {
      return null;
    }

    return coupon;
  }

  // Webhook Handling
  async handleWebhook(payload: string, signature: string): Promise<void> {
    const expectedSignature = crypto
      .createHmac('sha256', this.settings.webhookSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }

    const event: BillingWebhookEvent = JSON.parse(payload);

    switch (event.event) {
      case 'payment.captured':
        await this.handlePaymentCaptured(event.payload.payment);
        break;
      case 'subscription.activated':
        await this.handleSubscriptionActivated(event.payload.subscription);
        break;
      case 'subscription.cancelled':
        await this.handleSubscriptionCancelled(event.payload.subscription);
        break;
      case 'subscription.charged':
        await this.handleSubscriptionCharged(event.payload.subscription);
        break;
      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }
  }

  private async handlePaymentCaptured(payment: RazorpayPayment): Promise<void> {
    const paymentRecord: PaymentRecord = {
      id: payment.id,
      userId: payment.notes?.user_id || '',
      subscriptionId: payment.notes?.subscription_id || '',
      razorpayPaymentId: payment.id,
      razorpayOrderId: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      status: 'captured',
      method: payment.method,
      description: payment.description,
      createdAt: new Date(payment.created_at * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: payment.notes
    };

    this.savePaymentRecord(paymentRecord);
  }

  private async handleSubscriptionActivated(subscription: RazorpaySubscription): Promise<void> {
    const localSubscription = this.loadSubscription(subscription.id);
    if (localSubscription) {
      localSubscription.status = 'active';
      localSubscription.updatedAt = new Date().toISOString();
      this.saveSubscription(localSubscription);
    }
  }

  private async handleSubscriptionCancelled(subscription: RazorpaySubscription): Promise<void> {
    const localSubscription = this.loadSubscription(subscription.id);
    if (localSubscription) {
      localSubscription.status = 'cancelled';
      localSubscription.cancelledAt = new Date().toISOString();
      localSubscription.updatedAt = new Date().toISOString();
      this.saveSubscription(localSubscription);
    }
  }

  private async handleSubscriptionCharged(subscription: RazorpaySubscription): Promise<void> {
    // Handle recurring payment
    console.log(`Subscription charged: ${subscription.id}`);
  }

  // Helper methods for local storage
  private async getFreePlan(): Promise<SubscriptionPlan | null> {
    const plans = this.loadPlans();
    return plans.find(plan => plan.name === 'Free') || null;
  }

  private async recordCouponUsage(couponId: string, userId: string, subscriptionId: string, discountAmount: number): Promise<void> {
    const redemption = {
      id: `redemption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      couponId,
      userId,
      subscriptionId,
      discountAmount,
      redeemedAt: new Date().toISOString()
    };

    this.saveCouponRedemption(redemption);

    // Update coupon redemption count
    const coupons = this.loadCoupons();
    const coupon = coupons.find(c => c.id === couponId);
    if (coupon) {
      coupon.redeemedCount++;
      coupon.updatedAt = new Date().toISOString();
      this.saveCoupon(coupon);
    }
  }

  // Local storage methods (replace with actual database calls)
  private loadPlans(): SubscriptionPlan[] {
    const stored = localStorage.getItem('billing_plans');
    return stored ? JSON.parse(stored) : this.getDefaultPlans();
  }

  private savePlan(plan: SubscriptionPlan): void {
    const plans = this.loadPlans();
    const index = plans.findIndex(p => p.id === plan.id);
    if (index >= 0) {
      plans[index] = plan;
    } else {
      plans.push(plan);
    }
    localStorage.setItem('billing_plans', JSON.stringify(plans));
  }

  private loadSubscriptions(): UserSubscription[] {
    const stored = localStorage.getItem('billing_subscriptions');
    return stored ? JSON.parse(stored) : [];
  }

  private saveSubscription(subscription: UserSubscription): void {
    const subscriptions = this.loadSubscriptions();
    const index = subscriptions.findIndex(s => s.id === subscription.id);
    if (index >= 0) {
      subscriptions[index] = subscription;
    } else {
      subscriptions.push(subscription);
    }
    localStorage.setItem('billing_subscriptions', JSON.stringify(subscriptions));
  }

  private loadSubscription(subscriptionId: string): UserSubscription | null {
    const subscriptions = this.loadSubscriptions();
    return subscriptions.find(s => s.id === subscriptionId) || null;
  }

  private loadUsageRecord(userId: string, date: string): UsageRecord | null {
    const stored = localStorage.getItem(`usage_${userId}_${date}`);
    return stored ? JSON.parse(stored) : null;
  }

  private saveUsageRecord(usage: UsageRecord): void {
    localStorage.setItem(`usage_${usage.userId}_${usage.date}`, JSON.stringify(usage));
  }

  private loadCoupons(): CouponCode[] {
    const stored = localStorage.getItem('billing_coupons');
    return stored ? JSON.parse(stored) : [];
  }

  private saveCoupon(coupon: CouponCode): void {
    const coupons = this.loadCoupons();
    const index = coupons.findIndex(c => c.id === coupon.id);
    if (index >= 0) {
      coupons[index] = coupon;
    } else {
      coupons.push(coupon);
    }
    localStorage.setItem('billing_coupons', JSON.stringify(coupons));
  }

  private saveCouponRedemption(redemption: any): void {
    const redemptions = this.loadCouponRedemptions();
    redemptions.push(redemption);
    localStorage.setItem('billing_coupon_redemptions', JSON.stringify(redemptions));
  }

  private loadCouponRedemptions(): any[] {
    const stored = localStorage.getItem('billing_coupon_redemptions');
    return stored ? JSON.parse(stored) : [];
  }

  private savePaymentRecord(payment: PaymentRecord): void {
    const payments = this.loadPaymentRecords();
    payments.push(payment);
    localStorage.setItem('billing_payments', JSON.stringify(payments));
  }

  private loadPaymentRecords(): PaymentRecord[] {
    const stored = localStorage.getItem('billing_payments');
    return stored ? JSON.parse(stored) : [];
  }

  private getDefaultPlans(): SubscriptionPlan[] {
    return [
      {
        id: 'free_plan',
        name: 'Free',
        description: 'Perfect for getting started with basic automation',
        price: 0,
        currency: 'INR',
        interval: 'day',
        intervalCount: 7,
        features: [
          { id: 'profiles', name: 'Profiles', description: 'Browser profiles', included: true, limit: 7 },
          { id: 'executions', name: 'Daily Executions', description: 'RPA executions per day', included: true, limit: 10 },
          { id: 'support', name: 'Support', description: 'Community support', included: true },
          { id: 'api', name: 'API Access', description: 'REST API access', included: false }
        ],
        limits: {
          maxProfiles: 7,
          maxProfilesPerDay: 7,
          maxExecutionsPerDay: 10,
          maxConcurrentExecutions: 1,
          trialDays: 7,
          supportLevel: 'basic',
          apiAccess: false,
          customIntegrations: false,
          advancedAnalytics: false,
          whiteLabel: false
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'monthly_plan',
        name: 'Monthly Pro',
        description: 'Unlimited profiles and executions for power users',
        price: 1900, // ₹19.00
        currency: 'INR',
        interval: 'month',
        intervalCount: 1,
        features: [
          { id: 'profiles', name: 'Unlimited Profiles', description: 'Unlimited browser profiles', included: true },
          { id: 'executions', name: 'Unlimited Executions', description: 'Unlimited RPA executions', included: true },
          { id: 'concurrent', name: 'Concurrent Executions', description: 'Run up to 5 tasks simultaneously', included: true, limit: 5 },
          { id: 'support', name: 'Priority Support', description: 'Priority email support', included: true },
          { id: 'api', name: 'API Access', description: 'Full REST API access', included: true },
          { id: 'analytics', name: 'Advanced Analytics', description: 'Detailed execution analytics', included: true }
        ],
        limits: {
          maxProfiles: -1, // unlimited
          maxProfilesPerDay: -1,
          maxExecutionsPerDay: -1,
          maxConcurrentExecutions: 5,
          trialDays: 7,
          supportLevel: 'priority',
          apiAccess: true,
          customIntegrations: true,
          advancedAnalytics: true,
          whiteLabel: false
        },
        isPopular: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'yearly_plan',
        name: 'Yearly Pro',
        description: 'Best value with 2 months free + white-label options',
        price: 19900, // ₹199.00
        currency: 'INR',
        interval: 'year',
        intervalCount: 1,
        features: [
          { id: 'profiles', name: 'Unlimited Profiles', description: 'Unlimited browser profiles', included: true },
          { id: 'executions', name: 'Unlimited Executions', description: 'Unlimited RPA executions', included: true },
          { id: 'concurrent', name: 'Concurrent Executions', description: 'Run up to 10 tasks simultaneously', included: true, limit: 10 },
          { id: 'support', name: 'Premium Support', description: '24/7 priority support', included: true },
          { id: 'api', name: 'API Access', description: 'Full REST API access', included: true },
          { id: 'analytics', name: 'Advanced Analytics', description: 'Detailed execution analytics', included: true },
          { id: 'whitelabel', name: 'White Label', description: 'Custom branding options', included: true },
          { id: 'integrations', name: 'Custom Integrations', description: 'Custom third-party integrations', included: true }
        ],
        limits: {
          maxProfiles: -1,
          maxProfilesPerDay: -1,
          maxExecutionsPerDay: -1,
          maxConcurrentExecutions: 10,
          trialDays: 7,
          supportLevel: 'premium',
          apiAccess: true,
          customIntegrations: true,
          advancedAnalytics: true,
          whiteLabel: true
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

export const billingService = BillingService.getInstance();
