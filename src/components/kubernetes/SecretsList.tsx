import React, { useState, useEffect } from 'react';
import { KeyRound, RefreshCw, Plus, Trash2, Eye, EyeOff, Copy, Check, AlertCircle } from 'lucide-react';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useKubernetesConnection } from '@/contexts/KubernetesConnectionContext';
import { toast } from 'sonner';
import type { K8sSecret } from '@/types/kubernetes';

interface SecretFormData {
  name: string;
  type: string;
  data: { key: string; value: string }[];
}

export function SecretsList() {
  const { secrets } = useKubernetesStore();
  const { createSecret, deleteSecret, refreshAll } = useKubernetesConnection();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [secretToDelete, setSecretToDelete] = useState<K8sSecret | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<SecretFormData>({
    name: '',
    type: 'Opaque',
    data: [{ key: '', value: '' }],
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCreateSecret = async () => {
    if (!formData.name.trim()) {
      toast.error('Secret name is required');
      return;
    }

    // Validate kubernetes naming
    if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(formData.name)) {
      toast.error('Name must be lowercase, start with alphanumeric, and contain only alphanumeric or hyphens');
      return;
    }

    // Filter out empty entries and encode values to base64
    const secretData: Record<string, string> = {};
    for (const entry of formData.data) {
      if (entry.key.trim() && entry.value.trim()) {
        secretData[entry.key.trim()] = btoa(entry.value);
      }
    }

    if (Object.keys(secretData).length === 0) {
      toast.error('At least one key-value pair is required');
      return;
    }

    setIsCreating(true);
    try {
      await createSecret({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: formData.name.trim(),
          namespace: 'default',
        },
        type: formData.type,
        data: secretData,
      });
      toast.success(`Secret "${formData.name}" created successfully`);
      setIsCreateOpen(false);
      setFormData({ name: '', type: 'Opaque', data: [{ key: '', value: '' }] });
    } catch (error) {
      toast.error(`Failed to create secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSecret = async () => {
    if (!secretToDelete) return;

    setIsDeleting(true);
    try {
      await deleteSecret(secretToDelete.metadata.name, secretToDelete.metadata.namespace);
      toast.success(`Secret "${secretToDelete.metadata.name}" deleted successfully`);
      setIsDeleteOpen(false);
      setSecretToDelete(null);
    } catch (error) {
      toast.error(`Failed to delete secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const addDataEntry = () => {
    setFormData(prev => ({
      ...prev,
      data: [...prev.data, { key: '', value: '' }],
    }));
  };

  const removeDataEntry = (index: number) => {
    setFormData(prev => ({
      ...prev,
      data: prev.data.filter((_, i) => i !== index),
    }));
  };

  const updateDataEntry = (index: number, field: 'key' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      data: prev.data.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const copySecretRef = (secretName: string, key: string) => {
    const ref = `valueFrom:\n  secretKeyRef:\n    name: ${secretName}\n    key: ${key}`;
    navigator.clipboard.writeText(ref);
    setCopiedKey(`${secretName}/${key}`);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success('Secret reference copied to clipboard');
  };

  const getSecretTypeLabel = (type: string) => {
    switch (type) {
      case 'Opaque':
        return 'Opaque';
      case 'kubernetes.io/service-account-token':
        return 'Service Account';
      case 'kubernetes.io/dockerconfigjson':
        return 'Docker Registry';
      case 'kubernetes.io/tls':
        return 'TLS';
      case 'kubernetes.io/basic-auth':
        return 'Basic Auth';
      case 'kubernetes.io/ssh-auth':
        return 'SSH Auth';
      default:
        return type;
    }
  };

  const isSystemSecret = (secret: K8sSecret) => {
    const name = secret.metadata.name;
    return (
      name.startsWith('default-token-') ||
      name.startsWith('sh.helm.release') ||
      secret.type === 'kubernetes.io/service-account-token'
    );
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
            <KeyRound className="h-6 w-6 text-warning" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Secrets</h1>
            <p className="text-muted-foreground">Manage Kubernetes secrets for your resources</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => refreshAll()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Secret
          </Button>
        </div>
      </div>

      {/* Secrets List */}
      <div className="space-y-4">
        {secrets.map((secret) => {
          const isSystem = isSystemSecret(secret);
          const keys = secret.dataKeys || [];
          
          return (
            <div
              key={`${secret.metadata.namespace}/${secret.metadata.name}`}
              className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-warning/20 flex items-center justify-center">
                    <KeyRound className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-foreground">{secret.metadata.name}</p>
                      {isSystem && (
                        <Badge variant="outline" className="text-xs">System</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">{secret.metadata.namespace}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge variant="secondary">{getSecretTypeLabel(secret.type)}</Badge>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-foreground">{keys.length}</span>
                    <p className="text-xs text-muted-foreground">Keys</p>
                  </div>
                  {!isSystem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setSecretToDelete(secret);
                        setIsDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Keys */}
              {keys.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Secret Keys</p>
                  <div className="flex flex-wrap gap-2">
                    {keys.map((key) => (
                      <div key={key} className="flex items-center gap-1">
                        <Badge variant="outline" className="font-mono text-xs pr-1">
                          {key}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copySecretRef(secret.metadata.name, key)}
                        >
                          {copiedKey === `${secret.metadata.name}/${key}` ? (
                            <Check className="h-3 w-3 text-success" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {secrets.length === 0 && (
        <div className="text-center py-12">
          <KeyRound className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No secrets found</p>
          <Button className="mt-4 gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create your first secret
          </Button>
        </div>
      )}

      {/* Create Secret Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Secret</DialogTitle>
            <DialogDescription>
              Create a new Kubernetes secret to store sensitive data like API keys, passwords, or tokens.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="secret-name">Secret Name</Label>
              <Input
                id="secret-name"
                placeholder="my-api-keys"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Must be lowercase, start with a letter or number, and contain only letters, numbers, or hyphens.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secret-type">Secret Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Opaque">Opaque (Generic)</SelectItem>
                  <SelectItem value="kubernetes.io/basic-auth">Basic Auth</SelectItem>
                  <SelectItem value="kubernetes.io/tls">TLS Certificate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Secret Data</Label>
                <Button type="button" variant="outline" size="sm" onClick={addDataEntry}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Key
                </Button>
              </div>
              <div className="space-y-2">
                {formData.data.map((entry, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="KEY"
                      value={entry.key}
                      onChange={(e) => updateDataEntry(index, 'key', e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Input
                      type="password"
                      placeholder="value"
                      value={entry.value}
                      onChange={(e) => updateDataEntry(index, 'value', e.target.value)}
                      className="font-mono text-sm"
                    />
                    {formData.data.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDataEntry(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Values will be automatically base64 encoded when stored.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSecret} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Secret'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Secret
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the secret "{secretToDelete?.metadata.name}"? 
              This action cannot be undone and may break resources that depend on this secret.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSecret}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
