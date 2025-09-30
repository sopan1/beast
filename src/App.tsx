import { useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AuthPage from '@/components/auth/AuthPage';
import Sidebar from '@/components/layout/Sidebar';
import ProfileManager from '@/components/profiles/ProfileManager';
import ProxyManager from '@/components/proxies/ProxyManager';
import RPADashboard from '@/components/rpa/RPADashboard';
import SettingsPanel from '@/components/settings/SettingsPanel';
import UserAccount from '@/components/auth/UserAccount';
import ReferralSystem from '@/components/ReferralSystem';
import SupportTeam from '@/components/SupportTeam';
import { Profile } from '@/components/profiles/CreateProfileModal';

function AppContent() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profiles');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Show auth page if user is not logged in
  if (!currentUser) {
    return <AuthPage />;
  }

  const handleProfilesChange = (newProfiles: Profile[]) => {
    setProfiles(newProfiles);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profiles':
        return <ProfileManager profiles={profiles} onProfilesChange={handleProfilesChange} />;
      case 'proxies':
        return <ProxyManager />;
      case 'rpa':
        return <RPADashboard profiles={profiles} />;
      case 'settings':
        return <SettingsPanel />;
      case 'user':
        return <UserAccount />;
      case 'referral':
        return <ReferralSystem />;
      case 'support':
        return <SupportTeam />;
      default:
        return <ProfileManager profiles={profiles} onProfilesChange={handleProfilesChange} />;
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {renderContent()}
          </div>
        </main>
        
        <Toaster />
      </div>
    </TooltipProvider>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;