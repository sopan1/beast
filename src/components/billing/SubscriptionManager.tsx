import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  Crown, 
  Zap, 
  Shield, 
  Star,
  Calendar,
  Users,
  Activity,
  CreditCard,
  Gift,
  AlertTriangle,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { SubscriptionPlan, UserSubscription, UsageStats } from '@/types/billing';
import { billingService } from '@/services/billingService';

interface SubscriptionManagerProps {
  userId: string;
  onSubscriptionChange?: (subscription: UserSubscription | null) => void;
}

export default function SubscriptionManager({ userId, onSubscriptionChange }: SubscriptionManagerProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponValid, setCouponValid] = useState<boolean | null>(null);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, subscription, usage] = await Promise.all([
        billingService.getPlans(),
        billingService.getUserSubscription(userId),
        billingService.getUserUsageStats(userId)
      ]);
      
      setPlans(plansData);
      setCurrentSubscription(subscription);
      setUsageStats(usage);
      
      if (onSubscriptionChange) {
        onSubscriptionChange(subscription);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      setProcessing(true);
      setSelectedPlan(planId);
      
      const result = await billingService.createSubscription(userId, planId, couponCode || undefined);
      
      if (result.paymentOrder) {
        // Handle Razorpay payment
        const options = {
          key: process.env.RAZORPAY_KEY_ID,
          amount: result.paymentOrder.amount,
          currency: result.paymentOrder.currency,
          name: 'BeastBrowser',
          description: `Subscription to ${plans.find(p => p.id === planId)?.name}`,
          order_id: result.paymentOrder.id,
          handler: async (response: any) => {
            toast.success('Payment successful! Subscription activated.');
            await loadData();
          },
          prefill: {
            name: 'User Name', // Get from user profile
            email: 'user@example.com', // Get from user profile
          },
          theme: {
            color: '#8B5CF6',
          },
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
      } else {
        toast.success('Subscription created successfully!');
        await loadData();
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create subscription');
    } finally {
      setProcessing(false);
      setSelectedPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setProcessing(true);
      await billingService.cancelSubscription(userId, true);
      toast.success('Subscription will be cancelled at the end of the current period');
      await loadData();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setProcessing(false);
    }
  };

  const validateCoupon = async (code: string) => {
    if (!code || !selectedPlan) return;
    
    try {
      const coupon = await billingService.validateCoupon(code, selectedPlan);
      setCouponValid(coupon !== null);
      if (coupon) {
        toast.success(`Coupon applied! ${coupon.type === 'percentage' ? `${coupon.value}%` : `₹${coupon.value/100}`} discount`);
      } else {
        toast.error('Invalid or expired coupon code');
      }
    } catch (error) {
      setCouponValid(false);
      toast.error('Failed to validate coupon');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trialing': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      {currentSubscription && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-600" />
                Current Subscription
              </CardTitle>
              <Badge className={getStatusColor(currentSubscription.status)}>
                {currentSubscription.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Plan</p>
                <p className="font-semibold">{plans.find(p => p.id === currentSubscription.planId)?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Next Billing</p>
                <p className="font-semibold">
                  {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-semibold">
                  {currentSubscription.cancelAtPeriodEnd ? 'Cancelling at period end' : 'Active'}
                </p>
              </div>
            </div>
            
            {currentSubscription.status === 'active' && !currentSubscription.cancelAtPeriodEnd && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  onClick={handleCancelSubscription}
                  disabled={processing}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Cancel Subscription
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usage Statistics */}
      {usageStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Usage This Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Profiles Created Today</span>
                  <span>{usageStats.currentPeriod.profilesCreated} / {usageStats.limits.maxProfilesPerDay === -1 ? '∞' : usageStats.limits.maxProfilesPerDay}</span>
                </div>
                <Progress 
                  value={usageStats.limits.maxProfilesPerDay === -1 ? 0 : (usageStats.currentPeriod.profilesCreated / usageStats.limits.maxProfilesPerDay) * 100} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Executions Run Today</span>
                  <span>{usageStats.currentPeriod.executionsRun} / {usageStats.limits.maxExecutionsPerDay === -1 ? '∞' : usageStats.limits.maxExecutionsPerDay}</span>
                </div>
                <Progress 
                  value={usageStats.limits.maxExecutionsPerDay === -1 ? 0 : (usageStats.currentPeriod.executionsRun / usageStats.limits.maxExecutionsPerDay) * 100} 
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

      {/* Available Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative ${plan.isPopular ? 'border-purple-500 shadow-lg scale-105' : 'border-gray-200'} transition-all duration-200 hover:shadow-md`}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-purple-600 text-white px-3 py-1">
                  <Star className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                {plan.name === 'Free' && <Gift className="w-5 h-5 text-green-600" />}
                {plan.name === 'Monthly Pro' && <Zap className="w-5 h-5 text-blue-600" />}
                {plan.name === 'Yearly Pro' && <Crown className="w-5 h-5 text-purple-600" />}
                {plan.name}
              </CardTitle>
              <div className="text-3xl font-bold text-purple-600">
                {formatPrice(plan.price)}
                {plan.price > 0 && (
                  <span className="text-sm text-gray-500 font-normal">
                    /{plan.interval === 'year' ? 'year' : 'month'}
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm">{plan.description}</p>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <div key={feature.id} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm">
                      {feature.name}
                      {feature.limit && (
                        <span className="text-gray-500 ml-1">
                          ({feature.limit === -1 ? 'Unlimited' : feature.limit})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {currentSubscription?.planId === plan.id ? (
                <Button disabled className="w-full bg-green-100 text-green-800">
                  <Check className="w-4 h-4 mr-2" />
                  Current Plan
                </Button>
              ) : (
                <Button 
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={processing || (plan.price === 0 && currentSubscription?.planId === 'free_plan')}
                  className={`w-full ${plan.isPopular ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-700'}`}
                >
                  {processing && selectedPlan === plan.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      {plan.price === 0 ? 'Get Started' : 'Subscribe'}
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coupon Code Input */}
      {selectedPlan && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Gift className="w-5 h-5" />
              Apply Coupon Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                className="flex-1 px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <Button 
                onClick={() => validateCoupon(couponCode)}
                disabled={!couponCode}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Apply
              </Button>
            </div>
            {couponValid !== null && (
              <div className={`mt-2 text-sm ${couponValid ? 'text-green-600' : 'text-red-600'}`}>
                {couponValid ? '✓ Coupon code is valid' : '✗ Invalid coupon code'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trial Information */}
      {currentSubscription?.status === 'trialing' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-800">
              <Calendar className="w-5 h-5" />
              <span className="font-semibold">Trial Period</span>
            </div>
            <p className="text-blue-700 mt-2">
              Your trial ends on {new Date(currentSubscription.trialEnd!).toLocaleDateString()}. 
              Upgrade to a paid plan to continue using BeastBrowser.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Usage Limit Warning */}
      {usageStats && (
        (usageStats.remaining.profiles === 0 || usageStats.remaining.executions === 0) && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Usage Limit Reached</span>
              </div>
              <p className="text-red-700 mt-2">
                You've reached your daily limit. Upgrade to a higher plan for unlimited usage.
              </p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
