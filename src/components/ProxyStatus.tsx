import React from 'react';
import { Badge } from './ui/badge';
import { Tooltip } from './ui/tooltip';

interface ProxyStatusProps {
  isConnected: boolean;
  proxyType?: string;
  ip?: string;
  country?: string;
  city?: string;
  responseTime?: number;
}

const ProxyStatus: React.FC<ProxyStatusProps> = ({
  isConnected,
  proxyType = 'SOCKS5',
  ip,
  country,
  city,
  responseTime
}) => {
  const statusColor = isConnected ? 'bg-green-500' : 'bg-red-500';
  const statusText = isConnected ? 'Connected' : 'Disconnected';
  
  return (
    <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-primary/20">
      <div className={`w-3 h-3 rounded-full ${statusColor} ${isConnected ? 'animate-pulse' : ''}`} />
      
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{statusText}</span>
          <Badge variant="outline" className="text-xs">
            {proxyType}
          </Badge>
        </div>
        
        {isConnected && ip && (
          <div className="text-xs text-muted-foreground mt-1">
            {ip} • {country && city ? `${city}, ${country}` : 'Location detected'}
            {responseTime && ` • ${responseTime}ms`}
          </div>
        )}
      </div>
      
      {isConnected && (
        <Tooltip content="Proxy connection is active and secure">
          <div className="ml-auto">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </Tooltip>
      )}
    </div>
  );
};

export default ProxyStatus;