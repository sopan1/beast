import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Gift, Users, TrendingUp, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { referralService, UserReferralStats, ReferralData } from '@/services/referralService';

const ReferralSystem: React.FC = () => {
  const [userStats, setUserStats] = useState<UserReferralStats | null>(null);
  const [referralHistory, setReferralHistory] = useState<ReferralData[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  // Mock user ID - in real app, this would come from auth
  const userId = 'user_123';

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = () => {
    const stats = referralService.getUserReferralStats(userId);
    const history = referralService.getReferralHistory(userId);
    setUserStats(stats);
    setReferralHistory(history);
  };

  const copyReferralCode = () => {
    if (userStats?.referralCode) {
      navigator.clipboard.writeText(userStats.referralCode);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    }
  };

  const copyReferralLink = () => {
    if (userStats?.referralCode) {
      const link = `${window.location.origin}?ref=${userStats.referralCode}`;
      navigator.clipboard.writeText(link);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    }
  };

  const processReferralCode = async () => {
    if (!referralCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a referral code",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = referralService.processReferral(referralCode.trim(), userId);
      
      if (result.success) {
        toast({
          title: "Success!",
          description: result.message,
        });
        setReferralCode('');
        loadUserData();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process referral code",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const shareOnSocial = (platform: string) => {
    const referralLink = `${window.location.origin}?ref=${userStats?.referralCode}`;
    const message = "Join me on this amazing Browser Automation platform and get 50% bonus! 🚀";
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(referralLink)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(message + ' ' + referralLink)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  if (!userStats) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Gift className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Referral System</h2>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="share">Share & Earn</TabsTrigger>
          <TabsTrigger value="redeem">Redeem Code</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.totalReferrals}</div>
                <p className="text-xs text-muted-foreground">
                  People you've referred
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bonus</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.totalBonus}%</div>
                <p className="text-xs text-muted-foreground">
                  Bonus earned from referrals
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Bonus</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.pendingBonus}%</div>
                <p className="text-xs text-muted-foreground">
                  Bonus being processed
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Referral History</CardTitle>
              <CardDescription>Your recent referral activity</CardDescription>
            </CardHeader>
            <CardContent>
              {referralHistory.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No referrals yet. Start sharing your referral code to earn bonuses!
                </p>
              ) : (
                <div className="space-y-3">
                  {referralHistory.map((referral) => (
                    <div key={referral.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">User {referral.referredUser.slice(-6)}</p>
                          <p className="text-sm text-muted-foreground">
                            {referral.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={referral.status === 'completed' ? 'default' : 'secondary'}>
                          {referral.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          +{referral.bonusAmount}% bonus
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Code</CardTitle>
              <CardDescription>
                Share this code with friends and earn 50% bonus when they sign up!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input 
                  value={userStats.referralCode} 
                  readOnly 
                  className="font-mono text-lg"
                />
                <Button onClick={copyReferralCode} size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Input 
                  value={`${window.location.origin}?ref=${userStats.referralCode}`} 
                  readOnly 
                  className="text-sm"
                />
                <Button onClick={copyReferralLink} size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Share on Social Media
              </CardTitle>
              <CardDescription>
                Share your referral link on social platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => shareOnSocial('twitter')}
                  className="w-full"
                >
                  Twitter
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => shareOnSocial('facebook')}
                  className="w-full"
                >
                  Facebook
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => shareOnSocial('linkedin')}
                  className="w-full"
                >
                  LinkedIn
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => shareOnSocial('whatsapp')}
                  className="w-full"
                >
                  WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redeem" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Redeem Referral Code</CardTitle>
              <CardDescription>
                Enter a referral code to get started with bonus benefits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="referral-code">Referral Code</Label>
                <Input
                  id="referral-code"
                  placeholder="Enter referral code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="font-mono"
                />
              </div>
              
              <Button 
                onClick={processReferralCode}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Processing...' : 'Redeem Code'}
              </Button>
              
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">How it works:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Enter a valid referral code from a friend</li>
                  <li>• Both you and your friend get benefits</li>
                  <li>• Your friend gets 50% bonus for referring you</li>
                  <li>• You get access to premium features</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReferralSystem;