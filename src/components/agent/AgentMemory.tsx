import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Clock, RefreshCw, MessageSquare, User, Bot, Wrench, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { k8sClient } from '@/lib/kubernetes-client';
import type { Agent } from '@/types/kubernetes';

interface MemoryEvent {
  id: string;
  type: string;
  role?: string;
  content?: string;
  timestamp?: string;
  session_id?: string;
  tool_name?: string;
  tool_input?: any;
  tool_output?: any;
}

interface MemorySession {
  id: string;
  created_at?: string;
  event_count?: number;
}

interface AgentMemoryProps {
  agent: Agent;
}

export function AgentMemory({ agent }: AgentMemoryProps) {
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const serviceName = `agent-${agent.metadata.name}`;
  const namespace = agent.metadata.namespace || 'default';

  const fetchMemory = useCallback(async () => {
    if (!k8sClient.isConfigured()) {
      setError('Kubernetes client not configured');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch both events and sessions in parallel
      const [eventsResponse, sessionsResponse] = await Promise.all([
        k8sClient.proxyServiceRequest(serviceName, '/memory/events', {
          method: 'GET',
        }, namespace),
        k8sClient.proxyServiceRequest(serviceName, '/memory/sessions', {
          method: 'GET',
        }, namespace),
      ]);

      if (!eventsResponse.ok) {
        const errorText = await eventsResponse.text();
        throw new Error(`Events fetch failed: ${eventsResponse.status} - ${errorText}`);
      }

      if (!sessionsResponse.ok) {
        const errorText = await sessionsResponse.text();
        throw new Error(`Sessions fetch failed: ${sessionsResponse.status} - ${errorText}`);
      }

      const eventsData = await eventsResponse.json();
      const sessionsData = await sessionsResponse.json();

      setEvents(eventsData.events || []);
      setSessions(sessionsData.sessions || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[AgentMemory] Fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch memory';
      
      // Check for common issues
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        setError('Memory endpoints not available. Ensure AGENT_DEBUG_MEMORY_ENDPOINTS=true is set.');
      } else if (errorMessage.includes('503') || errorMessage.includes('no endpoints')) {
        setError('Agent service unavailable. Check that the pod is running.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [k8sClient, serviceName, namespace]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  const getEventIcon = (event: MemoryEvent) => {
    if (event.role === 'user') return <User className="h-4 w-4 text-blue-500" />;
    if (event.role === 'assistant') return <Bot className="h-4 w-4 text-agent" />;
    if (event.type === 'tool_call' || event.tool_name) return <Wrench className="h-4 w-4 text-mcpserver" />;
    return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
  };

  const getEventBadge = (event: MemoryEvent) => {
    if (event.role === 'user') return <Badge variant="outline" className="text-xs">User</Badge>;
    if (event.role === 'assistant') return <Badge variant="agent" className="text-xs">Assistant</Badge>;
    if (event.type === 'tool_call' || event.tool_name) return <Badge variant="mcpserver" className="text-xs">Tool</Badge>;
    return <Badge variant="secondary" className="text-xs">{event.type || 'Event'}</Badge>;
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-agent" />
          <h2 className="text-lg font-semibold">Agent Memory</h2>
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMemory}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Memory Content */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Events ({events.length})
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Clock className="h-4 w-4" />
            Sessions ({sessions.length})
          </TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Memory Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No memory events recorded</p>
                  <p className="text-xs mt-1">Events will appear here after agent interactions</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {events.map((event, index) => (
                      <div
                        key={event.id || index}
                        className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="shrink-0 mt-1">
                          {getEventIcon(event)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getEventBadge(event)}
                            {event.session_id && (
                              <Badge variant="outline" className="text-xs font-mono">
                                Session: {event.session_id.slice(0, 8)}...
                              </Badge>
                            )}
                            {event.timestamp && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                {formatTimestamp(event.timestamp)}
                              </span>
                            )}
                          </div>
                          
                          {/* Content */}
                          {event.content && (
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {event.content}
                            </p>
                          )}
                          
                          {/* Tool Call Details */}
                          {event.tool_name && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-3 w-3" />
                                <span className="text-xs font-mono font-medium">
                                  {event.tool_name}
                                </span>
                              </div>
                              {event.tool_input && (
                                <pre className="text-xs bg-background/50 p-2 rounded overflow-auto max-h-24">
                                  {typeof event.tool_input === 'string'
                                    ? event.tool_input
                                    : JSON.stringify(event.tool_input, null, 2)}
                                </pre>
                              )}
                              {event.tool_output && (
                                <pre className="text-xs bg-background/50 p-2 rounded overflow-auto max-h-24 text-muted-foreground">
                                  → {typeof event.tool_output === 'string'
                                    ? event.tool_output
                                    : JSON.stringify(event.tool_output, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Memory Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sessions recorded</p>
                  <p className="text-xs mt-1">Sessions will appear here after agent interactions</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {sessions.map((sessionId, index) => (
                      <div
                        key={sessionId || index}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                            <MessageSquare className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-mono font-medium">{sessionId}</p>
                            <p className="text-xs text-muted-foreground">
                              {events.filter(e => e.session_id === sessionId).length} events
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Session
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
