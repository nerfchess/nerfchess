-- Indexes for the per-request lookups the API routes run on every write or
-- poll (polish pass slice F, findings F072, F095, F108, F109). All additive.
--
-- idx_messages_pair serves the inbox thread read (the newest 200 messages
-- between two players, both directions) with an index range per direction
-- instead of walking every message the reader ever received.
--
-- idx_reports_reporter serves the report throttle ("reports this player filed
-- in the last day"), which scanned the whole reports table.
--
-- idx_rule_suggestions_user serves the suggestion daily cap per account.
--
-- idx_sessions_expires lets an expired-session sweep delete by range instead
-- of scanning every session row (today the sweep runs on the request path; a
-- scheduled prune is proposal P-idx).
--
-- idx_clubs_owner serves the clubs-per-owner cap on club creation.
--
-- Mirrored in src/lib/server/schema.ts (ADDITIVE_COLUMNS).
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(from_user_id, to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rule_suggestions_user ON rule_suggestions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_clubs_owner ON clubs(owner_user_id);
