// Billing and Subscription Types for BeastBrowser

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  features: PlanFeature[];
  limits: PlanLimits;
  isPopular?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  limit?: number;
  unit?: string;
}

export interface PlanLimits {
  maxProfiles: number;
  maxProfilesPerDay: number;
  maxExecutionsPerDay: number;
  maxConcurrentExecutions: number;
  trialDays: number;
  supportLevel: 'basic' | 'priority' | 'premium';
  apiAccess: boolean;
  customIntegrations: boolean;
  advancedAnalytics: boolean;
  whiteLabel: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing' | 'paused';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  razorpaySubscriptionId?: string;
  razorpayPlanId?: string;
  metadata?: Record<string, any>;
}

export interface UsageRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  profilesCreated: number;
  executionsRun: number;
  profilesUsed: string[];
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  subscriptionId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  amount: number; // in cents
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  method: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface CouponCode {
  id: string;
  code: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed_amount';
  value: number; // percentage (0-100) or amount in cents
  currency?: string;
  maxRedemptions?: number;
  redeemedCount: number;
  validFrom: string;
  validUntil: string;
  applicablePlans: string[]; // plan IDs
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string; // admin user ID
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  userId: string;
  subscriptionId: string;
  discountAmount: number; // in cents
  redeemedAt: string;
}

export interface BillingSettings {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  webhookSecret: string;
  currency: string;
  trialDays: number;
  gracePeriodDays: number;
  autoRenewal: boolean;
  invoicePrefix: string;
  taxRate: number; // percentage
  isActive: boolean;
}

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  invoiceNumber: string;
  amount: number; // in cents
  taxAmount: number; // in cents
  totalAmount: number; // in cents
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  dueDate: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  items: InvoiceItem[];
  metadata?: Record<string, any>;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // in cents
  totalPrice: number; // in cents
  taxRate: number; // percentage
}

export interface UsageStats {
  userId: string;
  currentPeriod: {
    profilesCreated: number;
    executionsRun: number;
    profilesUsed: string[];
  };
  limits: PlanLimits;
  remaining: {
    profiles: number;
    executions: number;
  };
  resetDate: string;
}

export interface BillingWebhookEvent {
  id: string;
  event: string;
  account_id: string;
  contains: string[];
  created_at: number;
  payload: {
    payment?: any;
    subscription?: any;
    order?: any;
    invoice?: any;
  };
}

// Razorpay specific types
export interface RazorpayPlan {
  id: string;
  entity: string;
  interval: number;
  period: string;
  item: {
    id: string;
    name: string;
    description: string;
    amount: number;
    currency: string;
    type: string;
  };
  notes: Record<string, any>;
  created_at: number;
}

export interface RazorpaySubscription {
  id: string;
  entity: string;
  plan_id: string;
  status: string;
  current_start: number;
  current_end: number;
  ended_at?: number;
  quantity: number;
  notes: Record<string, any>;
  charge_at: number;
  start_at: number;
  end_at: number;
  auth_attempts: number;
  total_count: number;
  paid_count: number;
  customer_notify: boolean;
  created_at: number;
  expire_by?: number;
  short_url?: string;
  has_scheduled_changes: boolean;
  change_scheduled_at?: number;
  remaining_count: number;
}

export interface RazorpayPayment {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  invoice_id?: string;
  international: boolean;
  method: string;
  amount_refunded: number;
  refund_status?: string;
  captured: boolean;
  description: string;
  card_id?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  email: string;
  contact: string;
  notes: Record<string, any>;
  fee?: number;
  tax?: number;
  error_code?: string;
  error_description?: string;
  error_source?: string;
  error_step?: string;
  error_reason?: string;
  acquirer_data?: Record<string, any>;
  created_at: number;
}

// Admin dashboard types
export interface BillingDashboardStats {
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  churnRate: number;
  averageRevenuePerUser: number;
  totalUsers: number;
  newUsersThisMonth: number;
  upcomingRenewals: number;
  expiredSubscriptions: number;
  refundsThisMonth: number;
  couponUsage: number;
}

export interface RevenueChartData {
  date: string;
  revenue: number;
  subscriptions: number;
  refunds: number;
}

export interface SubscriptionChartData {
  date: string;
  active: number;
  trial: number;
  cancelled: number;
  expired: number;
}

export interface UserBillingInfo {
  userId: string;
  email: string;
  name: string;
  subscription?: UserSubscription;
  usage: UsageStats;
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
  coupons: CouponRedemption[];
  createdAt: string;
  lastLoginAt: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'netbanking' | 'wallet' | 'upi';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: string;
}

// Plan comparison and upgrade/downgrade
export interface PlanComparison {
  features: {
    name: string;
    free: boolean | number;
    monthly: boolean | number;
    yearly: boolean | number;
  }[];
}

export interface PlanChangeRequest {
  userId: string;
  currentPlanId: string;
  newPlanId: string;
  changeType: 'upgrade' | 'downgrade' | 'switch';
  effectiveDate: string;
  prorationAmount?: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
  processedAt?: string;
  notes?: string;
}
