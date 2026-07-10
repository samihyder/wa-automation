'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequireRole } from '@/components/auth/require-role';
import { fetchApi } from '@/lib/fetch-api';
import { SettingsPanelHead } from './settings-panel-head';

export function FlowchatIntegrationPanel() {
  const [flowchatAccountId, setFlowchatAccountId] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchApi('/api/settings/flowchat', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { flowchatAccountId: string; syncEnabled: boolean };
        setFlowchatAccountId(data.flowchatAccountId);
        setSyncEnabled(data.syncEnabled);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetchApi('/api/settings/flowchat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowchatAccountId, syncEnabled }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error((payload as { error?: string }).error || 'Failed to save');
      }
      toast.success('FlowChat integration saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading FlowChat settings…
      </div>
    );
  }

  return (
    <RequireRole min="admin">
      <Card className="mt-8">
        <CardContent className="pt-6 space-y-4">
          <SettingsPanelHead
            title="FlowChat integration"
            description="Map this WhatsApp workspace to a FlowChat account for SSO and inbound webhooks."
          />
          <div>
            <Label htmlFor="flowchat-account-id">FlowChat account ID</Label>
            <Input
              id="flowchat-account-id"
              value={flowchatAccountId}
              onChange={(e) => setFlowchatAccountId(e.target.value)}
              placeholder="UUID from FlowChat → Settings → CRM"
              className="mt-1.5"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={syncEnabled}
              onChange={(e) => setSyncEnabled(e.target.checked)}
            />
            Accept FlowChat contact webhooks
          </label>
          <p className="text-xs text-muted-foreground font-mono">
            Webhook URL: /api/integrations/flowchat/webhook
          </p>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save FlowChat settings'}
          </Button>
        </CardContent>
      </Card>
    </RequireRole>
  );
}
