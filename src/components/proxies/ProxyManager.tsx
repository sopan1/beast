import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Globe, 
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import { toast } from 'sonner';

interface ProxyConfig {
  id: string;
  type: 'HTTP' | 'HTTPS' | 'SOCKS5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  status: 'active' | 'inactive';
  country?: string;
}

export default function ProxyManager() {
  const [proxies, setProxies] = useState<ProxyConfig[]>([]);
  const [proxyInput, setProxyInput] = useState('');
  const [proxyType, setProxyType] = useState<'HTTP' | 'HTTPS' | 'SOCKS5'>('HTTP');
  const [isRotating, setIsRotating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);

  useEffect(() => {
    // Load proxies from localStorage
    const savedProxies = localStorage.getItem('antidetect_proxies');
    if (savedProxies) {
      setProxies(JSON.parse(savedProxies));
    }
  }, []);

  const saveProxies = (newProxies: ProxyConfig[]) => {
    setProxies(newProxies);
    localStorage.setItem('antidetect_proxies', JSON.stringify(newProxies));
  };

  const parseProxies = (input: string): ProxyConfig[] => {
    const lines = input.split('\n').filter(line => line.trim());
    const newProxies: ProxyConfig[] = [];

    lines.forEach((line, index) => {
      const raw = line.trim();
      // Support optional scheme like socks5://host:port or bare host:port:user:pass
      let text = raw;
      let typeFromScheme: 'HTTP' | 'HTTPS' | 'SOCKS5' | undefined;
      const schemeMatch = raw.match(/^(socks5|http|https):\/\//i);
      if (schemeMatch) {
        const scheme = schemeMatch[1].toLowerCase();
        if (scheme === 'socks5') typeFromScheme = 'SOCKS5';
        if (scheme === 'http') typeFromScheme = 'HTTP';
        if (scheme === 'https') typeFromScheme = 'HTTPS';
        text = raw.replace(/^[^:]+:\/\//, '');
      }
      const parts = text.split(':');
      if (parts.length >= 2) {
        const [host, port, username, password] = parts;
        const portNum = parseInt(port);
        const finalType: 'HTTP' | 'HTTPS' | 'SOCKS5' = typeFromScheme || proxyType;
        const proxy: ProxyConfig = {
          id: `proxy_${Date.now()}_${index}`,
          type: finalType,
          host: host.trim(),
          port: portNum,
          username: username?.trim(),
          password: password?.trim(),
          status: 'inactive'
        };
        newProxies.push(proxy);
      }
    });

    return newProxies;
  };

  const addProxies = () => {
    if (!proxyInput.trim()) {
      toast.error('Please enter proxy addresses');
      return;
    }

    const newProxies = parseProxies(proxyInput);
    if (newProxies.length === 0) {
      toast.error('No valid proxies found');
      return;
    }

    const updatedProxies = [...proxies, ...newProxies];
    saveProxies(updatedProxies);
    setProxyInput('');
    toast.success(`${newProxies.length} proxies added successfully`);
  };

  const validateProxy = async (proxy: ProxyConfig): Promise<boolean> => {
    // Simulate proxy validation (in real app, this would test connectivity)
    return new Promise((resolve) => {
      setTimeout(() => {
        // Random validation result for demo
        resolve(Math.random() > 0.3);
      }, Math.random() * 2000 + 500);
    });
  };

  const validateAllProxies = async () => {
    setIsValidating(true);
    setValidationProgress(0);
    
    const updatedProxies = [...proxies];
    
    for (let i = 0; i < proxies.length; i++) {
      const proxy = proxies[i];
      const isValid = await validateProxy(proxy);
      
      updatedProxies[i] = {
        ...proxy,
        status: isValid ? 'active' : 'inactive'
      };
      
      setValidationProgress(((i + 1) / proxies.length) * 100);
      
      // Update proxies in real-time during validation
      setProxies([...updatedProxies]);
    }
    
    saveProxies(updatedProxies);
    setIsValidating(false);
    
    const activeCount = updatedProxies.filter(p => p.status === 'active').length;
    toast.success(`Validation complete: ${activeCount}/${proxies.length} proxies are working`);
  };

  const deleteProxy = (proxyId: string) => {
    const updatedProxies = proxies.filter(p => p.id !== proxyId);
    saveProxies(updatedProxies);
    toast.success('Proxy deleted');
  };

  const clearAllProxies = () => {
    saveProxies([]);
    toast.success('All proxies cleared');
  };

  const exportProxies = () => {
    const activeProxies = proxies.filter(p => p.status === 'active');
    const proxyText = activeProxies.map(p => 
      p.username ? `${p.host}:${p.port}:${p.username}:${p.password}` : `${p.host}:${p.port}`
    ).join('\n');
    
    const blob = new Blob([proxyText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'working_proxies.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Working proxies exported');
  };

  // File upload removed per requirements

  const activeProxies = proxies.filter(p => p.status === 'active');
  const inactiveProxies = proxies.filter(p => p.status === 'inactive');

  return (
    <div className="space-y-6 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 min-h-screen p-6 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-xl shadow-lg">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            🌐 Proxy Management
          </h2>
          <p className="text-purple-100 mt-1">Configure and validate proxy servers with style</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={exportProxies} disabled={activeProxies.length === 0} className="border-white/30 text-white hover:bg-white/20">
            <Download className="h-4 w-4 mr-2" />
            Export Working
          </Button>
          <Button variant="outline" onClick={clearAllProxies} disabled={proxies.length === 0} className="border-white/30 text-white hover:bg-white/20">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-500 p-3 rounded-full">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Total Proxies</p>
                <p className="text-2xl font-bold text-blue-800">{proxies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-green-500 p-3 rounded-full">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Working</p>
                <p className="text-2xl font-bold text-green-800">{activeProxies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-pink-100 border-red-200 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-red-500 p-3 rounded-full">
                <XCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-700">Failed</p>
                <p className="text-2xl font-bold text-red-800">{inactiveProxies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-orange-500 p-3 rounded-full">
                <RefreshCw className={`h-5 w-5 text-white ${isRotating ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-700">Rotation</p>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isRotating}
                    onCheckedChange={setIsRotating}
                  />
                  <span className="text-sm font-medium text-orange-800">{isRotating ? 'On' : 'Off'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Proxies Section */}
      <Card>
        <CardHeader>
          <CardTitle>Add Proxies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Proxy Type</Label>
              <Select value={proxyType} onValueChange={(value: 'HTTP' | 'HTTPS' | 'SOCKS5') => setProxyType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HTTP">HTTP</SelectItem>
                  <SelectItem value="HTTPS">HTTPS</SelectItem>
                  <SelectItem value="SOCKS5">SOCKS5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Upload removed as requested */}
            <div className="flex items-end">
              <Button onClick={validateAllProxies} disabled={proxies.length === 0 || isValidating}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
                {isValidating ? 'Validating...' : 'Validate All'}
              </Button>
            </div>
          </div>
          
          <div>
            <Label>Proxy List (one per line)</Label>
            <Textarea
              placeholder="192.168.1.1:8080&#10;192.168.1.2:8080:username:password&#10;socks5://192.168.1.3:1080"
              value={proxyInput}
              onChange={(e) => setProxyInput(e.target.value)}
              rows={8}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Supported formats: host:port, host:port:user:pass, protocol://host:port
            </p>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={addProxies} disabled={!proxyInput.trim()}>
              <Upload className="h-4 w-4 mr-2" />
              Add Proxies
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Progress */}
      {isValidating && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Validating proxies...</span>
                <span>{Math.round(validationProgress)}%</span>
              </div>
              <Progress value={validationProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proxy List */}
      <Card>
        <CardHeader>
          <CardTitle>Proxy List ({proxies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Host:Port</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auth</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proxies.map((proxy) => (
                <TableRow key={proxy.id}>
                  <TableCell className="font-medium">
                    {proxy.host}:{proxy.port}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{proxy.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={proxy.status === 'active' ? 'default' : 'destructive'}>
                      {proxy.status === 'active' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {proxy.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {proxy.username ? (
                      <Badge variant="secondary">Yes</Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {proxy.country || (
                      <span className="text-muted-foreground">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteProxy(proxy.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {proxies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No proxies added yet. Add some proxies to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}