-- Add an 'archived' status to drip campaigns (mirrors flows.status).
-- Archived campaigns are stopped and hidden from the main list.

ALTER TABLE drip_campaigns
  DROP CONSTRAINT IF EXISTS drip_campaigns_status_check;

ALTER TABLE drip_campaigns
  ADD CONSTRAINT drip_campaigns_status_check
  CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived'));
