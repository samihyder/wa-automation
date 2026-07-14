-- Persist Meta delivery failure details on messages (async webhook status).
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS error_message TEXT;
