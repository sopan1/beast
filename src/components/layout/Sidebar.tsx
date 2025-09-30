import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Globe, 
  Bot, 
  Settings, 
  User,
  Shield,
  Menu,
  X,
  Gift,
  Headphones
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const tabs = [
  {
    id: 'profiles',
    label: 'Profiles',
    icon: Users,
    description: 'Manage browser profiles with device types'
  },
  {
    id: 'proxies',
    label: 'Proxies',
    icon: Globe,
    description: 'Configure proxy settings'
  },
  {
    id: 'rpa',
    label: 'RPA',
    icon: Bot,
    description: 'Automation scripts'
  },
  {
    id: 'referral',
    label: 'Referral System',
    icon: Gift,
    description: '50% bonus referral program'
  },
  {
    id: 'support',
    label: 'Support Team',
    icon: Headphones,
    description: 'Get help from support'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Global configuration'
  },
  {
    id: 'user',
    label: 'Account',
    icon: User,
    description: 'User management'
  }
];

export default function Sidebar({ activeTab, onTabChange, isCollapsed, onToggle }: SidebarProps) {
  return (
    <div className={cn(
      "bg-gradient-to-b from-orange-600 via-red-600 to-gray-900 border-r border-orange-400 transition-all duration-300 flex flex-col shadow-2xl",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-orange-300 flex items-center justify-between bg-gradient-to-r from-orange-700 to-red-700">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <img src="/beast-logo.png" alt="Beast Browser Logo" className="h-200 w-200 drop-shadow-lg" />
          </div>
        )}
        {isCollapsed && (
          <img src="/beast-logo.png" alt="Beast Browser Logo" className="h-600 w-600 drop-shadow-lg mx-auto" />
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="p-2 text-white hover:bg-orange-500/30 transition-colors"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <div className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <Button
                key={tab.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-12 text-white hover:bg-orange-500/20 transition-all duration-200",
                  isCollapsed && "px-3",
                  isActive && "bg-orange-500/30 text-white border-orange-300/50 shadow-lg"
                )}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                {!isCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="font-medium text-white">{tab.label}</div>
                    <div className="text-xs text-white/70">{tab.description}</div>
                  </div>
                )}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-orange-300 bg-gradient-to-r from-orange-700 to-red-700">
          <div className="flex items-center space-x-2 text-sm text-white/80">
            <Badge variant="outline" className="text-xs border-orange-300/50 text-white bg-orange-500/20">
              Beast Browser
            </Badge>
            <span>v1.0.0</span>
          </div>
        </div>
      )}
    </div>
  );
}