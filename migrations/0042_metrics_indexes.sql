-- Indexes for the moderator metrics (src/lib/server/metrics.ts, F125) and the
-- player context drawer (F115).
--
-- idx_users_guest_created serves the account totals and the sign-ups per day
-- series: WHERE is_guest = ? AND created_at >= ? is a range on the index
-- instead of a scan of every account (house bots and guests included).
CREATE INDEX IF NOT EXISTS idx_users_guest_created ON users(is_guest, created_at);
-- idx_reports_reporter serves "reports filed by this player" in the context
-- drawer and the report throttle in /api/report (was a full scan, F109).
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_user_id, created_at DESC);
