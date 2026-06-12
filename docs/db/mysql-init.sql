CREATE TABLE IF NOT EXISTS match_results (
  fixture_id VARCHAR(64) PRIMARY KEY,
  kickoff DATETIME NULL,
  status VARCHAR(32) NOT NULL,
  score JSON NULL,
  events JSON NULL,
  stats JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS match_recaps (
  id CHAR(36) PRIMARY KEY,
  fixture_id VARCHAR(64) NOT NULL,
  language VARCHAR(8) NOT NULL DEFAULT 'en',
  summary TEXT NULL,
  key_moments JSON NULL,
  stats JSON NULL,
  youtube_video_id VARCHAR(64) NULL,
  official_highlight_url TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY match_recaps_fixture_language_uq (fixture_id, language),
  KEY match_recaps_fixture_idx (fixture_id)
);
