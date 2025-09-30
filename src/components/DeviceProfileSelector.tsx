import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Download, 
  Smartphone, 
  Laptop, 
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function DeviceProfileSelector() {
  const [selectedPlatform, setSelectedPlatform] = useState<'mobile' | 'desktop'>('mobile');
  const [fingerprintData, setFingerprintData] = useState('');
  const [userAgentData, setUserAgentData] = useState('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'fingerprints' | 'useragents'>('fingerprints');

  const handleUploadFingerprints = async () => {
    try {
      if (!fingerprintData.trim()) {
        toast.error('Please enter fingerprint data');
        return;
      }

      const fingerprints = JSON.parse(fingerprintData);
      
      // Validate fingerprint structure
      if (!Array.isArray(fingerprints)) {
        toast.error('Fingerprints must be an array');
        return;
      }

      const result = await (window as any).electronAPI?.uploadFingerprints({
        platform: selectedPlatform,
        fingerprints
      });

      if (result?.success) {
        toast.success(`${fingerprints.length} fingerprints uploaded for ${selectedPlatform} platform`);
        setFingerprintData('');
        setIsUploadDialogOpen(false);
      } else {
        toast.error('Failed to upload fingerprints: ' + (result?.error || 'Unknown error'));
      }
    } catch (error) {
      toast.error('Invalid JSON format');
    }
  };

  const handleUploadUserAgents = async () => {
    try {
      if (!userAgentData.trim()) {
        toast.error('Please enter user agent data');
        return;
      }

      const userAgents = userAgentData.split('\n').filter(ua => ua.trim());
      
      const result = await (window as any).electronAPI?.uploadUserAgents({
        platform: selectedPlatform,
        userAgents
      });

      if (result?.success) {
        toast.success(`${userAgents.length} user agents uploaded for ${selectedPlatform} platform`);
        setUserAgentData('');
        setIsUploadDialogOpen(false);
      } else {
        toast.error('Failed to upload user agents: ' + (result?.error || 'Unknown error'));
      }
    } catch (error) {
      toast.error('Error uploading user agents');
    }
  };

  const loadSampleFingerprint = () => {
    const sampleFingerprint = selectedPlatform === 'mobile' ? 
      `[
  {
    "id": "sample_mobile_1",
    "timestamp": "2025-09-04T12:13:52.321Z",
    "userAgent": "Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "screen": {
      "width": 414,
      "height": 915,
      "colorDepth": 32,
      "pixelRatio": 3
    },
    "navigator": {
      "platform": "Android",
      "language": "en-US",
      "cookieEnabled": true,
      "javaEnabled": false,
      "onLine": true
    },
    "timezone": "America/New_York",
    "plugins": [],
    "canvas": "pb95ggf4i",
    "webgl": "z9fldsrmsgo",
    "audio": "77tsp1j4nti",
    "deviceType": "mobile",
    "touchSupport": true,
    "hardwareConcurrency": 8,
    "deviceMemory": 8,
    "connection": {
      "effectiveType": "4g",
      "downlink": 10.5,
      "rtt": 150
    }
  }
]` : 
      `[
  {
    "id": "sample_desktop_1",
    "timestamp": "2025-09-04T12:20:15.678Z",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "screen": {
      "width": 1920,
      "height": 1080,
      "colorDepth": 24,
      "pixelRatio": 1
    },
    "navigator": {
      "platform": "Win32",
      "language": "en-US",
      "cookieEnabled": true,
      "javaEnabled": false,
      "onLine": true
    },
    "timezone": "America/New_York",
    "plugins": [
      "Chrome PDF Plugin",
      "Chrome PDF Viewer"
    ],
    "canvas": "ab45ggf8i",
    "webgl": "z2fldsrmsg9",
    "audio": "55tsp1j4nti",
    "deviceType": "desktop",
    "touchSupport": false,
    "hardwareConcurrency": 8,
    "deviceMemory": 16,
    "connection": {
      "effectiveType": "4g",
      "downlink": 50.2,
      "rtt": 45
    }
  }
]`;
    
    setFingerprintData(sampleFingerprint);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Device Profile Management</h2>
          <p className="text-muted-foreground">Upload and manage fingerprints and user agents for different platforms</p>
        </div>
      </div>

      {/* Platform Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button
              variant={selectedPlatform === 'mobile' ? 'default' : 'outline'}
              onClick={() => setSelectedPlatform('mobile')}
              className="flex items-center space-x-2"
            >
              <Smartphone className="h-4 w-4" />
              <span>Mobile</span>
            </Button>
            <Button
              variant={selectedPlatform === 'desktop' ? 'default' : 'outline'}
              onClick={() => setSelectedPlatform('desktop')}
              className="flex items-center space-x-2"
            >
              <Laptop className="h-4 w-4" />
              <span>Desktop</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Data for {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} Platform</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Dialog open={isUploadDialogOpen && uploadType === 'fingerprints'} onOpenChange={(open) => {
              if (!open) setIsUploadDialogOpen(false);
            }}>
              <DialogTrigger asChild>
                <Button 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => {
                    setUploadType('fingerprints');
                    setIsUploadDialogOpen(true);
                  }}
                >
                  <Upload className="h-6 w-6" />
                  <span>Upload Fingerprints</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Upload {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} Fingerprints</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Fingerprint Data (JSON Array)</Label>
                    <Button variant="outline" size="sm" onClick={loadSampleFingerprint}>
                      Load Sample
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Paste your fingerprint JSON data here..."
                    value={fingerprintData}
                    onChange={(e) => setFingerprintData(e.target.value)}
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">Required Format:</p>
                      <p className="text-blue-700">Upload a JSON array containing fingerprint objects with the structure shown in the sample.</p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUploadFingerprints}>
                      Upload Fingerprints
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isUploadDialogOpen && uploadType === 'useragents'} onOpenChange={(open) => {
              if (!open) setIsUploadDialogOpen(false);
            }}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => {
                    setUploadType('useragents');
                    setIsUploadDialogOpen(true);
                  }}
                >
                  <FileText className="h-6 w-6" />
                  <span>Upload User Agents</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} User Agents</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Label>User Agent Strings (one per line)</Label>
                  <Textarea
                    placeholder={`Mozilla/5.0 (${selectedPlatform === 'mobile' ? 'Linux; Android 14; SM-G998B' : 'Windows NT 10.0; Win64; x64'}) AppleWebKit/537.36...`}
                    value={userAgentData}
                    onChange={(e) => setUserAgentData(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <div className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-green-900">Format:</p>
                      <p className="text-green-700">Enter one user agent string per line. Each line will be treated as a separate user agent.</p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUploadUserAgents}>
                      Upload User Agents
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2 flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Fingerprints</span>
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Upload JSON array of fingerprint objects</li>
                <li>• Each fingerprint should have unique canvas, webgl, and audio values</li>
                <li>• Include screen dimensions, user agent, and device properties</li>
                <li>• Supports millions of unique fingerprints</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>User Agents</span>
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Upload one user agent per line</li>
                <li>• Should match the selected platform (mobile/desktop)</li>
                <li>• Will be randomly assigned to profiles</li>
                <li>• Supports large lists for variety</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}