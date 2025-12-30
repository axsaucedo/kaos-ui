import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function ConnectionDiagnostics() {
  const [ngrokUrl, setNgrokUrl] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const updateResult = (index: number, update: Partial<TestResult>) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, ...update } : r));
  };

  const runDiagnostics = async () => {
    if (!ngrokUrl) return;

    const cleanUrl = ngrokUrl.replace(/\/$/, '');
    setIsRunning(true);

    // Initialize all tests
    const initialResults: TestResult[] = [
      { name: 'URL Format', status: 'pending', message: 'Checking URL format...' },
      { name: 'DNS Resolution', status: 'pending', message: 'Checking if URL is reachable...' },
      { name: 'CORS Preflight', status: 'pending', message: 'Testing CORS preflight (OPTIONS)...' },
      { name: 'Direct GET Request', status: 'pending', message: 'Testing direct GET request...' },
      { name: 'K8s API Version', status: 'pending', message: 'Fetching Kubernetes version...' },
    ];
    setResults(initialResults);

    // Test 1: URL Format
    await new Promise(r => setTimeout(r, 300));
    try {
      const url = new URL(cleanUrl);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        updateResult(0, { status: 'error', message: 'Invalid protocol', details: 'URL must start with http:// or https://' });
      } else if (url.hostname.includes('ngrok')) {
        updateResult(0, { status: 'success', message: 'Valid ngrok URL', details: url.hostname });
      } else {
        updateResult(0, { status: 'warning', message: 'Not an ngrok URL', details: 'This may still work if CORS is configured' });
      }
    } catch (e) {
      updateResult(0, { status: 'error', message: 'Invalid URL format', details: String(e) });
      setIsRunning(false);
      return;
    }

    // Test 2: DNS/Reachability (using no-cors mode to bypass CORS for basic check)
    updateResult(1, { status: 'running', message: 'Checking reachability...' });
    await new Promise(r => setTimeout(r, 300));
    try {
      // no-cors mode won't give us response data but tells us if the server responded
      const response = await fetch(cleanUrl, { 
        method: 'GET',
        mode: 'no-cors',
      });
      // In no-cors mode, we get an opaque response - type will be 'opaque'
      updateResult(1, { 
        status: 'success', 
        message: 'URL is reachable', 
        details: 'Server responded (opaque response in no-cors mode)' 
      });
    } catch (e) {
      updateResult(1, { 
        status: 'error', 
        message: 'URL not reachable', 
        details: `Network error: ${e instanceof Error ? e.message : 'Unknown'}` 
      });
    }

    // Test 3: CORS Preflight
    updateResult(2, { status: 'running', message: 'Testing CORS...' });
    await new Promise(r => setTimeout(r, 300));
    try {
      const response = await fetch(`${cleanUrl}/version`, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'content-type',
        },
      });
      
      const corsHeaders = {
        allowOrigin: response.headers.get('Access-Control-Allow-Origin'),
        allowMethods: response.headers.get('Access-Control-Allow-Methods'),
        allowHeaders: response.headers.get('Access-Control-Allow-Headers'),
      };
      
      if (response.ok && corsHeaders.allowOrigin) {
        updateResult(2, { 
          status: 'success', 
          message: 'CORS configured correctly', 
          details: `Allow-Origin: ${corsHeaders.allowOrigin}` 
        });
      } else {
        updateResult(2, { 
          status: 'error', 
          message: `CORS preflight failed (${response.status})`, 
          details: 'kubectl proxy does not handle OPTIONS requests. An edge function proxy is required.' 
        });
      }
    } catch (e) {
      updateResult(2, { 
        status: 'error', 
        message: 'CORS preflight blocked', 
        details: 'Browser blocked the request. This is expected with kubectl proxy - use an edge function proxy instead.' 
      });
    }

    // Test 4: Direct GET (will likely fail due to CORS)
    updateResult(3, { status: 'running', message: 'Testing GET request...' });
    await new Promise(r => setTimeout(r, 300));
    try {
      const response = await fetch(`${cleanUrl}/version`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        updateResult(3, { 
          status: 'success', 
          message: 'GET request successful', 
          details: JSON.stringify(data).slice(0, 100) 
        });
        
        // Test 5 success
        updateResult(4, { 
          status: 'success', 
          message: `Kubernetes ${data.gitVersion || 'version found'}`, 
          details: `Server: ${data.platform || 'unknown'}` 
        });
      } else {
        updateResult(3, { 
          status: 'error', 
          message: `GET failed: ${response.status}`, 
          details: await response.text().catch(() => 'No response body') 
        });
        updateResult(4, { status: 'error', message: 'Skipped', details: 'GET request failed' });
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      updateResult(3, { 
        status: 'error', 
        message: 'GET request failed', 
        details: errorMsg.includes('CORS') || errorMsg.includes('NetworkError') 
          ? 'CORS blocked the request. An edge function proxy is needed.'
          : errorMsg
      });
      updateResult(4, { status: 'error', message: 'Skipped', details: 'GET request failed' });
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-600">Pass</Badge>;
      case 'error': return <Badge variant="destructive">Fail</Badge>;
      case 'warning': return <Badge className="bg-yellow-600">Warning</Badge>;
      case 'running': return <Badge variant="secondary">Running</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  const hasCorsError = results.some(r => 
    r.status === 'error' && r.details?.toLowerCase().includes('cors')
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection Diagnostics</CardTitle>
        <CardDescription>
          Test connectivity to your Kubernetes cluster via ngrok
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-url">ngrok URL</Label>
          <div className="flex gap-2">
            <Input
              id="test-url"
              placeholder="https://xxxx.ngrok-free.app"
              value={ngrokUrl}
              onChange={(e) => setNgrokUrl(e.target.value)}
              disabled={isRunning}
            />
            <Button onClick={runDiagnostics} disabled={isRunning || !ngrokUrl}>
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Run Tests'
              )}
            </Button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="space-y-2 border rounded-lg p-4">
            {results.map((result, index) => (
              <div key={index} className="flex items-start gap-3 py-2 border-b last:border-0">
                {getStatusIcon(result.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{result.name}</span>
                    {getStatusBadge(result.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.details && (
                    <p className="text-xs text-muted-foreground/70 mt-1 break-all">
                      {result.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {hasCorsError && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
            <h4 className="font-medium text-amber-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              CORS Issue Detected
            </h4>
            <p className="text-sm text-muted-foreground">
              <code>kubectl proxy</code> doesn't support CORS preflight requests (OPTIONS method).
              The browser blocks cross-origin requests that require preflight.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Solution:</strong> Enable Lovable Cloud and create an edge function proxy.
              The edge function makes server-to-server requests, bypassing CORS entirely.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
