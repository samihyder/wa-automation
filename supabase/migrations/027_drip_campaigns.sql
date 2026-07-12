-- Drip / nurture campaigns: multi-step template sequences with delays.

CREATE TABLE IF NOT EXISTS drip_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  audience_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  enrolled_count INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drip_campaigns_account ON drip_campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_drip_campaigns_status ON drip_campaigns(account_id, status);

CREATE TABLE IF NOT EXISTS drip_campaign_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 0,
  name TEXT,
  template_name TEXT NOT NULL,
  template_language TEXT NOT NULL DEFAULT 'en_US',
  template_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  header_media_url TEXT,
  delay_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_drip_steps_campaign ON drip_campaign_steps(campaign_id, step_order);

CREATE TABLE IF NOT EXISTS drip_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  current_step_index INTEGER NOT NULL DEFAULT 0,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled', 'failed')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ,
  last_error TEXT,
  UNIQUE (campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_drip_enrollments_due
  ON drip_enrollments(next_run_at)
  WHERE status = 'active';

ALTER TABLE drip_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS drip_campaigns_select ON drip_campaigns;
CREATE POLICY drip_campaigns_select ON drip_campaigns FOR SELECT
  USING (is_account_member(account_id));
DROP POLICY IF EXISTS drip_campaigns_insert ON drip_campaigns;
CREATE POLICY drip_campaigns_insert ON drip_campaigns FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));
DROP POLICY IF EXISTS drip_campaigns_update ON drip_campaigns;
CREATE POLICY drip_campaigns_update ON drip_campaigns FOR UPDATE
  USING (is_account_member(account_id, 'agent'));
DROP POLICY IF EXISTS drip_campaigns_delete ON drip_campaigns;
CREATE POLICY drip_campaigns_delete ON drip_campaigns FOR DELETE
  USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS drip_steps_select ON drip_campaign_steps;
CREATE POLICY drip_steps_select ON drip_campaign_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM drip_campaigns c
      WHERE c.id = drip_campaign_steps.campaign_id
        AND is_account_member(c.account_id)
    )
  );
DROP POLICY IF EXISTS drip_steps_mutate ON drip_campaign_steps;
CREATE POLICY drip_steps_mutate ON drip_campaign_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM drip_campaigns c
      WHERE c.id = drip_campaign_steps.campaign_id
        AND is_account_member(c.account_id, 'agent')
    )
  );

DROP POLICY IF EXISTS drip_enrollments_select ON drip_enrollments;
CREATE POLICY drip_enrollments_select ON drip_enrollments FOR SELECT
  USING (is_account_member(account_id));
DROP POLICY IF EXISTS drip_enrollments_mutate ON drip_enrollments;
CREATE POLICY drip_enrollments_mutate ON drip_enrollments FOR ALL
  USING (is_account_member(account_id, 'agent'));

DROP TRIGGER IF EXISTS set_updated_at ON drip_campaigns;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON drip_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
