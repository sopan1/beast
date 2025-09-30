import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Star } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const pricingPlans = [
  {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    duration: '7 days',
    description: 'Perfect for testing our platform',
    features: [
      '7 profiles per day limit',
      'Basic fingerprint randomization',
      'Standard support',
      'All device types supported',
      'Basic proxy support'
    ],
    limitations: [
      'Limited to 7 profiles per day',
      'Trial expires after 7 days'
    ],
    buttonText: 'Start Free Trial',
    popular: false,
    icon: Zap
  },
  {
    id: 'monthly',
    name: 'Monthly Premium',
    price: 19.99,
    duration: '1 month',
    description: 'Best for regular users',
    features: [
      'Unlimited profiles',
      'Premium access to all features',
      'Advanced fingerprint randomization',
      'Priority support',
      'All device types supported',
      'Advanced proxy configurations',
      'Bulk profile creation',
      'Export/Import profiles'
    ],
    buttonText: 'Get Monthly Plan',
    popular: true,
    icon: Crown
  },
  {
    id: 'yearly',
    name: 'Yearly Premium',
    price: 249,
    duration: '1 year',
    description: 'Best value for power users',
    features: [
      'Unlimited profiles',
      'Premium access to all features',
      'Advanced fingerprint randomization',
      'VIP support',
      'All device types supported',
      'Advanced proxy configurations',
      'Bulk profile creation',
      'Export/Import profiles',
      'API access',
      'Custom integrations',
      'Priority feature requests'
    ],
    buttonText: 'Get Yearly Plan',
    popular: false,
    icon: Star,
    savings: 'Save $190 per year'
  }
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscription = async (plan: typeof pricingPlans[0]) => {
    if (plan.id === 'free') {
      // Handle free trial activation
      toast.success('Free trial activated! You can now create up to 7 profiles per day.');
      return;
    }

    setLoading(plan.id);

    try {
      const scriptLoaded = await loadRazorpayScript();
      
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway. Please try again.');
        setLoading(null);
        return;
      }

      const options = {
        key: 'rzp_live_REzg8f7xyATYP1', // Your Razorpay key ID
        amount: plan.price * 100, // Amount in paise
        currency: 'USD',
        name: 'Browser Automation Desktop',
        description: `${plan.name} Subscription`,
        image: '/favicon.ico',
        handler: function (response: any) {
          // Handle successful payment
          toast.success(`Payment successful! Welcome to ${plan.name}!`);
          console.log('Payment ID:', response.razorpay_payment_id);
          
          // Here you would typically:
          // 1. Send payment details to your backend
          // 2. Update user subscription status
          // 3. Enable premium features
          
          setLoading(null);
        },
        prefill: {
          name: 'User Name',
          email: 'user@example.com',
          contact: '9999999999'
        },
        notes: {
          plan_id: plan.id,
          plan_name: plan.name
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: function() {
            setLoading(null);
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Choose Your Plan</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Select the perfect plan for your browser automation needs. Start with our free trial 
          or upgrade to premium for unlimited access.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pricingPlans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                
                <div className="py-4">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold">
                      ${plan.price}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      /{plan.duration}
                    </span>
                  </div>
                  {plan.savings && (
                    <p className="text-green-600 text-sm mt-2 font-medium">
                      {plan.savings}
                    </p>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {plan.limitations && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Limitations:</p>
                    <ul className="space-y-1">
                      {plan.limitations.map((limitation, index) => (
                        <li key={index} className="text-xs text-muted-foreground">
                          • {limitation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <Button 
                  className="w-full mt-6" 
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSubscription(plan)}
                  disabled={loading === plan.id}
                >
                  {loading === plan.id ? 'Processing...' : plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center space-y-4 pt-8 border-t">
        <h3 className="text-xl font-semibold">Need Help Choosing?</h3>
        <p className="text-muted-foreground">
          Start with our free trial to test all features. Upgrade anytime to unlock unlimited profiles.
        </p>
        <div className="flex justify-center space-x-4 text-sm text-muted-foreground">
          <span>✓ No setup fees</span>
          <span>✓ Cancel anytime</span>
          <span>✓ 24/7 support</span>
        </div>
      </div>
    </div>
  );
}