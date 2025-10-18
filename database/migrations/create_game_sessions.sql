-- ============================================
-- Game Sessions Table for Stateful Gameplay
-- ============================================
-- Purpose: Store user progress and game state for each investigation session
-- Created: 2025-10-18
-- Related to: Refactor to eliminate sending full caseData to AI

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  -- Primary identifier for this game session
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User identifier (nullable for now, will be required when auth is added)
  -- TODO: Add foreign key constraint when auth.users is implemented
  user_id UUID,
  
  -- Which case this session is investigating
  case_id TEXT NOT NULL,
  
  -- The dynamic game state (JSONB for flexible querying and updates)
  game_state JSONB NOT NULL DEFAULT '{
    "currentLocation": "crime_scene",
    "unlockedClues": [],
    "interrogatedSuspects": [],
    "knownLocations": ["crime_scene"],
    "stuckCounter": 0
  }'::jsonb,
  
  -- Session metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Optional: Track if investigation is complete
  is_solved BOOLEAN DEFAULT FALSE,
  
  -- Optional: Track the final accusation made (if any)
  final_accusation TEXT,
  
  -- Foreign key to cases table
  CONSTRAINT fk_case
    FOREIGN KEY (case_id)
    REFERENCES cases(id)
    ON DELETE CASCADE
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Index for looking up sessions by user (will be critical when auth is added)
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id 
  ON game_sessions(user_id);

-- Index for looking up sessions by case
CREATE INDEX IF NOT EXISTS idx_game_sessions_case_id 
  ON game_sessions(case_id);

-- Index for querying recent sessions
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at 
  ON game_sessions(created_at DESC);

-- Composite index for user + case queries (e.g., "find this user's session for this case")
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_case 
  ON game_sessions(user_id, case_id);

-- GIN index for JSONB queries (enables fast querying inside game_state)
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_state 
  ON game_sessions USING GIN (game_state);

-- ============================================
-- Trigger for Auto-updating updated_at
-- ============================================

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_game_session_timestamp ON game_sessions;
CREATE TRIGGER trigger_update_game_session_timestamp
  BEFORE UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_game_session_timestamp();

-- ============================================
-- Row Level Security (RLS) - Prepared for Auth
-- ============================================

-- Enable RLS on the table
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (will be restricted when auth is added)
-- TODO: Replace with proper user-based policies when auth.users exists
CREATE POLICY "Allow all operations for now" ON game_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Helper Functions (Optional but Recommended)
-- ============================================

-- Function to get or create a session for a user + case
CREATE OR REPLACE FUNCTION get_or_create_session(
  p_user_id UUID,
  p_case_id TEXT
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Try to find an existing active session for this user + case
  SELECT session_id INTO v_session_id
  FROM game_sessions
  WHERE user_id = p_user_id 
    AND case_id = p_case_id
    AND is_solved = FALSE
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no session found, create a new one
  IF v_session_id IS NULL THEN
    INSERT INTO game_sessions (user_id, case_id)
    VALUES (p_user_id, p_case_id)
    RETURNING session_id INTO v_session_id;
  END IF;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update game state (safe JSONB merge)
CREATE OR REPLACE FUNCTION update_game_state(
  p_session_id UUID,
  p_state_updates JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_new_state JSONB;
BEGIN
  -- Merge the updates into existing state
  UPDATE game_sessions
  SET game_state = game_state || p_state_updates
  WHERE session_id = p_session_id
  RETURNING game_state INTO v_new_state;
  
  RETURN v_new_state;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Sample Data for Testing (Optional)
-- ============================================

-- Uncomment to insert test data
/*
INSERT INTO game_sessions (user_id, case_id, game_state) VALUES
(
  '00000000-0000-0000-0000-000000000001'::uuid,
  'case-123',
  '{
    "currentLocation": "crime_scene",
    "unlockedClues": ["evidence-1", "evidence-2"],
    "interrogatedSuspects": ["suspect-1"],
    "knownLocations": ["crime_scene", "library"],
    "stuckCounter": 2
  }'::jsonb
);
*/

-- ============================================
-- Verification Queries
-- ============================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'game_sessions';

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'game_sessions';

-- Check triggers
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'game_sessions';
