-- Every moderator action lands in the audit log (F116, proposal P-audit).
--
-- mod_actions was written only by applyModAction, so it could only describe an
-- action taken against a player: target_user_id is NOT NULL, and report
-- triage, chat-flag review, card overrides, house settings, persona edits,
-- rating edits and the god-panel switch left no row at all.
--
-- SQLite cannot relax a NOT NULL column in place, so the table keeps its shape
-- and grows four nullable columns instead. A row about something that is not a
-- player stores '' in target_user_id and names its target with target_kind
-- ('user', 'report', 'chat_flag', 'card', 'house', 'persona', 'setting') and
-- target_ref (the report id, 'buff:<id>', the setting key). before_json and
-- after_json hold the values an edit replaced and wrote, so every config change
-- can be read back and reverted by hand. note is the reason ("why").
-- Existing rows keep target_kind 'user', which is what they are.
ALTER TABLE mod_actions ADD COLUMN target_kind TEXT NOT NULL DEFAULT 'user';
ALTER TABLE mod_actions ADD COLUMN target_ref TEXT;
ALTER TABLE mod_actions ADD COLUMN before_json TEXT;
ALTER TABLE mod_actions ADD COLUMN after_json TEXT;
-- The audit log's filter chips (by kind) and the "prior actions by this
-- moderator" lookup.
CREATE INDEX IF NOT EXISTS idx_mod_actions_kind ON mod_actions(target_kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mod_actions_mod ON mod_actions(mod_user_id, created_at DESC);
-- A report closed with a note keeps the note next to the report (F127).
ALTER TABLE reports ADD COLUMN handled_note TEXT;
