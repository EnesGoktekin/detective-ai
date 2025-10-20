import { v4 as uuidv4 } from 'uuid';
/**
 * Detective AI - DB Helper Module (5-Table Architecture - Phase 1)
 *
 * This module provides helpers for reading static case data from the new schema.
 * It ensures that data is fetched securely and returned in a consistent format.
 */

/**
 * Fetches the static, non-secret data required by the AI to begin a case.
 *
 * @param {object} supabase - The Supabase client instance.
 * @param {string} caseId - The unique identifier for the case.
 * @returns {Promise<object>} An object containing the initial case data.
 */
export async function getCaseInitialData(supabase, caseId) {
  try {
    const { data, error } = await supabase
      .from('case_initial_data')
      .select('case_id, synopsis, victims, suspects, initial_location_id')
      .eq('case_id', caseId)
      .single();

    if (error) {
      console.error(`[DB_HELPER_ERROR] getCaseInitialData: ${error.message}`);
      throw error;
    }

    return {
      caseId: data.case_id,
      synopsis: data.synopsis,
      victims: data.victims || {},
      suspects: data.suspects || [],
      initialLocationId: data.initial_location_id,
    };
  } catch (err) {
    throw new Error(`Failed to retrieve initial data for case ${caseId}.`);
  }
}

/**
 * Fetches the secret, immutable game logic records for a specific case.
 * This data is used exclusively by the game engine and is NEVER shown to the AI.
 *
 * @param {object} supabase - The Supabase client instance.
 * @param {string} caseId - The unique identifier for the case.
 * @returns {Promise<object>} An object containing the immutable game records.
 */
export async function getCaseImmutableRecords(supabase, caseId) {
  try {
    const { data, error } = await supabase
      .from('case_immutable_records')
      .select('case_id, full_story, evidence_truth, suspect_truth, correct_accusation, location_data')
      .eq('case_id', caseId)
      .single();

    if (error) {
      console.error(`[DB_HELPER_ERROR] getCaseImmutableRecords: ${error.message}`);
      throw error;
    }

    return {
      caseId: data.case_id,
      fullStory: data.full_story,
      evidenceTruth: data.evidence_truth || [],
      suspectTruth: data.suspect_truth || [],
      correctAccusation: data.correct_accusation || {},
      locationData: data.location_data || [],
    };
  } catch (err) {
    throw new Error(`Failed to retrieve immutable records for case ${caseId}.`);
  }
}

// ===================================================================================
// B. DYNAMIC SESSION MANAGEMENT HELPERS
// ===================================================================================

/**
 * Creates a new game session by inserting records into session_state and session_progress.
 *
 * @param {object} supabase - The Supabase client instance.
 * @param {string} caseId - The ID of the case being played.
 * @param {string} initialLocationId - The starting location ID from case_initial_data.
 * @param {Array} locationData - The full location_data array from case_immutable_records.
 * @returns {Promise<object>} An object containing the new session_id and initial progress state.
 */
export async function createSession(supabase, caseId, initialLocationId, locationData) {
  const sessionId = uuidv4();
  const userId = null; // Placeholder for future multi-user support

  // 1. Find the initial location object to set it as the current map state
  const initialLocation = locationData.find(loc => loc.id === initialLocationId);
  if (!initialLocation) {
    throw new Error(`Initial location with ID '${initialLocationId}' not found in locationData.`);
  }

  // 2. Create the core session state record
  const { error: stateError } = await supabase
    .from('session_state')
    .insert({ session_id: sessionId, user_id: userId, case_id: caseId });

  if (stateError) {
    console.error(`[DB_HELPER_ERROR] createSession (state): ${stateError.message}`);
    throw new Error('Failed to create session state.');
  }

  // 3. Create the initial session progress record
  const initialProgress = {
    session_id: sessionId,
    evidence_log: [],
    suspect_log: [],
    chat_history: [],
    last_five_messages: [],
    ai_core_summary: 'The investigation has just begun.',
    current_map_state: [{ ...initialLocation, is_current: true }], // Start with only the initial location visible and marked as current
  };

  const { data: progressData, error: progressError } = await supabase
    .from('session_progress')
    .insert(initialProgress)
    .select()
    .single();

  if (progressError) {
    console.error(`[DB_HELPER_ERROR] createSession (progress): ${progressError.message}`);
    // Rollback the state creation for consistency
    await supabase.from('session_state').delete().eq('session_id', sessionId);
    throw new Error('Failed to create session progress.');
  }

  return { sessionId, progress: progressData };
}

/**
 * Reads all dynamic progress and static state data for a given session.
 *
 * @param {object} supabase - The Supabase client instance.
 * @param {string} sessionId - The unique identifier for the session.
 * @returns {Promise<object|null>} A unified object with all session data, or null if not found.
 */
export async function readSessionProgress(supabase, sessionId) {
  // 1. Fetch session state (metadata)
  const { data: stateData, error: stateError } = await supabase
    .from('session_state')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (stateError) {
    console.error(`[DB_HELPER_ERROR] readSessionProgress (state): ${stateError.message}`);
    throw new Error('Failed to read session state.');
  }
  if (!stateData) return null;

  // 2. Fetch session progress (dynamic data)
  const { data: progressData, error: progressError } = await supabase
    .from('session_progress')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (progressError) {
    console.error(`[DB_HELPER_ERROR] readSessionProgress (progress): ${progressError.message}`);
    throw new Error('Failed to read session progress.');
  }

  // 3. Combine and return
  return { ...stateData, ...progressData };
}

/**
 * Saves the updated progress data and touches the session_state timestamp.
 *
 * @param {object} supabase - The Supabase client instance.
 * @param {string} sessionId - The ID of the session to update.
 * @param {object} progressData - The complete progress object to save.
 */
export async function saveSessionProgress(supabase, sessionId, progressData) {
  // 1. Update the session_progress table with the new data
  const { error: progressError } = await supabase
    .from('session_progress')
    .update(progressData)
    .eq('session_id', sessionId);

  if (progressError) {
    console.error(`[DB_HELPER_ERROR] saveSessionProgress (progress): ${progressError.message}`);
    throw new Error('Failed to save session progress.');
  }

  // 2. Update the `updated_at` timestamp on the session_state table
  const { error: stateError } = await supabase
    .from('session_state')
    .update({ updated_at: new Date().toISOString() })
    .eq('session_id', sessionId);

  if (stateError) {
    console.error(`[DB_HELPER_ERROR] saveSessionProgress (state): ${stateError.message}`);
    // This is not a critical failure, so we just log it.
  }
}

/**
 * Deletes a session permanently from both state and progress tables.
 *
 * @param {object} supabase - The Supabase client instance.
 * @param {string} sessionId - The ID of the session to delete.
 */
export async function deleteSession(supabase, sessionId) {
  // 1. Delete from session_progress first to satisfy foreign key constraints
  const { error: progressError } = await supabase
    .from('session_progress')
    .delete()
    .eq('session_id', sessionId);

  if (progressError) {
    console.error(`[DB_HELPER_ERROR] deleteSession (progress): ${progressError.message}`);
    throw new Error('Failed to delete session progress.');
  }

  // 2. Delete from session_state
  const { error: stateError } = await supabase
    .from('session_state')
    .delete()
    .eq('session_id', sessionId);

  if (stateError) {
    console.error(`[DB_HELPER_ERROR] deleteSession (state): ${stateError.message}`);
    throw new Error('Failed to delete session state.');
  }
}

/**
 * Fetches the most recent session for a given case and user.
 *
 * @param {object} supabase - The Supabase client instance.
 * @param {string} caseId - The ID of the case.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<object|null>} The latest session object or null if not found.
 */
export async function fetchLatestSession(supabase, caseId, userId) {
  try {
    const { data, error } = await supabase
      .from('session_state')
      .select('session_id, updated_at')
      .eq('case_id', caseId)
      // .eq('user_id', userId) // Enable this line when multi-user is implemented
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`[DB_HELPER_ERROR] fetchLatestSession: ${error.message}`);
      throw error;
    }

    return data;
  } catch (err) {
    throw new Error(`Failed to fetch latest session for case ${caseId}.`);
  }
}

/**
 * Fetches and transforms case summaries for the frontend.
 *
 * @param {object} supabase - The Supabase client instance.
 * @param {string} userId - The ID of the user (for future multi-user support).
 * @returns {Promise<Array>} An array of transformed case summary objects.
 */
export async function getCaseSummaries(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('case_initial_data')
      .select('case_id, synopsis, victims, suspects, initial_location_id')
      .order('case_id', { ascending: true });

    if (error) {
      console.error(`[DB_HELPER_ERROR] getCaseSummaries: ${error.message}`);
      throw error;
    }

    return data.map(item => ({
      id: item.case_id,
      synopsis: item.synopsis,
      victims: item.victims || {},
      suspects: item.suspects || [],
      initialLocationId: item.initial_location_id,
    }));
  } catch (err) {
    throw new Error('Failed to fetch case summaries.');
  }
}

