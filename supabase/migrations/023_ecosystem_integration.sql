-- FlowChat ecosystem integration fields.

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS flowchat_contact_id TEXT;
CREATE INDEX IF NOT EXISTS idx_contacts_flowchat_id
  ON contacts (account_id, flowchat_contact_id)
  WHERE flowchat_contact_id IS NOT NULL;

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS integration_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
