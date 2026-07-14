'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchApi } from '@/lib/fetch-api';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { MessageTemplate } from '@/types';
import { extractVariableIndices } from '@/lib/whatsapp/template-validators';
import { Step2SelectAudience } from '@/components/broadcasts/step2-select-audience';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2 } from 'lucide-react';

type DripStepDraft = {
  templateName: string;
  templateLanguage: string;
  delayHours: number;
  stepName: string;
};

export default function NewDripCampaignPage() {
  const router = useRouter();
  const { accountId } = useAuth();
  const [name, setName] = useState('');
  const [audience, setAudience] = useState<{
    type: 'all' | 'tags' | 'custom_field' | 'csv';
    tagIds?: string[];
    customField?: {
      fieldId: string;
      operator: 'is' | 'is_not' | 'contains';
      value: string;
    };
    csvContacts?: { phone: string; name?: string }[];
    excludeTagIds?: string[];
  }>({ type: 'all' });
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [steps, setSteps] = useState<DripStepDraft[]>([
    { stepName: 'Introduction', templateName: '', templateLanguage: 'en_US', delayHours: 0 },
    { stepName: 'Follow-up', templateName: '', templateLanguage: 'en_US', delayHours: 24 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadTemplates() {
      const supabase = createClient();
      const { data } = await supabase
        .from('message_templates')
        .select('*')
        .eq('status', 'APPROVED')
        .order('name');
      setTemplates((data ?? []) as MessageTemplate[]);
      if (data?.[0]) {
        setSteps((prev) =>
          prev.map((s, i) =>
            i < 2 && !s.templateName
              ? { ...s, templateName: data[0]!.name, templateLanguage: data[0]!.language ?? 'en_US' }
              : s,
          ),
        );
      }
    }
    void loadTemplates();
  }, []);

  function updateStep(index: number, patch: Partial<DripStepDraft>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStep() {
    const last = templates[0];
    setSteps((prev) => [
      ...prev,
      {
        stepName: `Step ${prev.length + 1}`,
        templateName: last?.name ?? '',
        templateLanguage: last?.language ?? 'en_US',
        delayHours: 48,
      },
    ]);
  }

  async function handleCreate(activate: boolean) {
    if (!name.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    if (steps.some((s) => !s.templateName)) {
      toast.error('Each step needs a template');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || !accountId) throw new Error('Not signed in');

      const { data: campaign, error: campErr } = await supabase
        .from('drip_campaigns')
        .insert({
          user_id: user.id,
          account_id: accountId,
          name: name.trim(),
          audience_filter: audience,
          status: 'draft',
        })
        .select('id')
        .single();

      if (campErr || !campaign) throw new Error(campErr?.message ?? 'Failed to create campaign');

      const stepRows = steps.map((s, i) => {
        const tmpl = templates.find(
          (t) => t.name === s.templateName && t.language === s.templateLanguage,
        );
        const varCount = tmpl
          ? extractVariableIndices(tmpl.body_text ?? '').length
          : 0;
        const template_variables: Record<string, { type: 'field'; value: string }> = {};
        for (let v = 1; v <= varCount; v++) {
          // Default {{1}} to name; later slots also name until UI maps them.
          template_variables[String(v)] = { type: 'field', value: 'name' };
        }
        return {
          campaign_id: campaign.id,
          step_order: i,
          name: s.stepName,
          template_name: s.templateName,
          template_language: s.templateLanguage,
          template_variables,
          delay_hours: i === 0 ? 0 : s.delayHours,
        };
      });

      const { error: stepsErr } = await supabase.from('drip_campaign_steps').insert(stepRows);
      if (stepsErr) throw new Error(stepsErr.message);

      if (activate) {
        const res = await fetchApi(`/api/drip-campaigns/${campaign.id}/activate`, {
          method: 'POST',
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'Activation failed');
        toast.success(`Drip campaign started — ${body.enrolled ?? 0} contacts enrolled`);
      } else {
        toast.success('Drip campaign saved as draft');
      }

      router.push(`/drip-campaigns/${campaign.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New drip campaign</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a sequence of template messages with delays between each step.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Campaign name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Lead follow-up — 3 touches"
        />
      </div>

      <div className="rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Audience</h2>
        <Step2SelectAudience
          audience={audience}
          onUpdate={setAudience}
          onNext={() => {}}
          onBack={() => {}}
          hideNav
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Sequence steps</h2>
          <Button type="button" variant="secondary" size="sm" onClick={addStep}>
            <Plus className="h-4 w-4" />
            Add step
          </Button>
        </div>

        {steps.map((step, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-card/50 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">Step {index + 1}</span>
              {steps.length > 1 && (
                <button
                  type="button"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => setSteps((s) => s.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <Input
              value={step.stepName}
              onChange={(e) => updateStep(index, { stepName: e.target.value })}
              placeholder="Step label"
            />
            <select
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-muted"
              value={step.templateName}
              onChange={(e) => {
                const t = templates.find((x) => x.name === e.target.value);
                updateStep(index, {
                  templateName: e.target.value,
                  templateLanguage: t?.language ?? 'en_US',
                });
              }}
            >
              <option value="">Select template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name} ({t.language})
                </option>
              ))}
            </select>
            {index > 0 && (
              <div>
                <label className="text-xs text-muted-foreground">
                  Wait before this step (hours after previous message)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={720}
                  value={step.delayHours}
                  onChange={(e) =>
                    updateStep(index, { delayHours: Number(e.target.value) || 24 })
                  }
                  className="mt-1 max-w-[140px]"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => void handleCreate(false)}
        >
          Save draft
        </Button>
        <Button
          type="button"
          disabled={saving}
          onClick={() => void handleCreate(true)}
          className="bg-primary text-primary-foreground"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Start campaign & enroll audience
        </Button>
      </div>
    </div>
  );
}
