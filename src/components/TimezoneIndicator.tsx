import React from 'react';
import { Badge } from './ui/badge';
import { Tooltip } from './ui/tooltip';

interface TimezoneIndicatorProps {
  timezone: string;
  source?: 'proxy-ip' | 'system' | 'manual';
  country?: string;
  isActive?: boolean;
}

const TimezoneIndicator: React.FC<TimezoneIndicatorProps> = ({
  timezone,
  source = 'system',
  country,
  isActive = true
}) => {
  const getSourceColor = () => {
    switch (source) {
      case 'proxy-ip':
        return 'bg-green-500';
      case 'manual':
        return 'bg-blue-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getSourceText = () => {
    switch (source) {
      case 'proxy-ip':
        return 'Proxy IP Based';
      case 'manual':
        return 'Manually Set';
      default:
        return 'System Default';
    }
  };

  const formatTimezone = (tz: string) => {
    try {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { 
        timeZone: tz,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${tz.split('/')[1]?.replace('_', ' ') || tz} (${timeString})`;
    } catch {
      return tz;
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-primary/20">
      <div className={`w-3 h-3 rounded-full ${getSourceColor()} ${isActive ? 'animate-pulse' : ''}`} />
      
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {formatTimezone(timezone)}
          </span>
          {country && (
            <Badge variant="outline" className="text-xs">
              {country}
            </Badge>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground mt-1">
          {getSourceText()}
        </div>
      </div>
      
      <Tooltip content={`Timezone: ${timezone}\nSource: ${getSourceText()}`}>
        <div className="ml-auto">
          <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        </div>
      </Tooltip>
    </div>
  );
};

export default TimezoneIndicator;