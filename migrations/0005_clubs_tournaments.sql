-- Clubs and tournament listings.
CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  owner_name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clubs_created ON clubs(created_at DESC);

CREATE TABLE IF NOT EXISTS club_members (
  club_id TEXT NOT NULL REFERENCES clubs(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member',
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (club_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id, joined_at DESC);

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  creator_user_id TEXT NOT NULL REFERENCES users(id),
  creator_name TEXT NOT NULL,
  club_id TEXT REFERENCES clubs(id),
  format TEXT NOT NULL DEFAULT 'swiss',
  starts_at INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  max_players INTEGER NOT NULL DEFAULT 16,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tournaments_created ON tournaments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tournaments_club ON tournaments(club_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tournament_entries (
  tournament_id TEXT NOT NULL REFERENCES tournaments(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  username TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (tournament_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_user ON tournament_entries(user_id, joined_at DESC);
