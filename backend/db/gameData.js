// backend/db/gameData.js

import { v4 as uuidv4 } from 'uuid';

/**
 * Fetches the static, non-secret data required by the AI to begin a case.
 */
export async function getCaseInitialData(supabase, caseId) {
  try {
    const { data, error } = await supabase
      .from('case_initial_data')
      .select('case_id, synopsis, victims, suspects, initial_location_id')
      .eq('case_id', caseId)
      .single();
    if (error) throw error;

    // Also fetch the list of all possible evidence (names and IDs only) for the UI
    const { data: evidenceShells, error: evidenceError } = await supabase
      .from('case_immutable_records')
      .select('evidence_truth')
      .eq('case_id', caseId)
      .single();
    if (evidenceError) throw evidenceError;

    const evidence = (evidenceShells.evidence_truth || []).map(({ id, name }) => ({ id, name }));

    return {
      caseId: data.case_id,
      synopsis: data.synopsis,
      victims: data.victims || {},
      suspects: data.suspects || [],
      initialLocationId: data.initial_location_id,
      evidence, // Add the evidence shells to the initial data
    };
  } catch (err) {
    console.error(`[DB_HELPER_ERROR] getCaseInitialData: ${err.message}`);
    throw new Error(`Failed to retrieve initial data for case ${caseId}.`);
  }
}

/**
 * Fetches the secret, immutable game logic records for a specific case.
 */
export async function getCaseImmutableRecords(supabase, caseId) {
  try {
    const { data, error } = await supabase
      .from('case_immutable_records')
      .select('case_id, full_story, evidence_truth, suspect_truth, correct_accusation, location_data')
      .eq('case_id', caseId)
      .single();
    if (error) throw error;
    return {
      caseId: data.case_id,
      fullStory: data.full_story,
      evidenceTruth: data.evidence_truth || [],
      suspectTruth: data.suspect_truth || [],
      correctAccusation: data.correct_accusation || {},
      locationData: data.location_data || [],
    };
  } catch (err) {
    console.error(`[DB_HELPER_ERROR] getCaseImmutableRecords: ${err.message}`);
    throw new Error(`Failed to retrieve immutable records for case ${caseId}.`);
  }
}

/**
 * Creates a new game session.
 */
export async function createSession(supabase, caseId, initialLocationId, locationData) {
  const sessionId = uuidv4();
  const initialLocation = locationData.find(loc => loc.id === initialLocationId);
  if (!initialLocation) {
    throw new Error(`Initial location with ID '${initialLocationId}' not found in locationData.`);
  }

  // Insert session state
  const { error: stateError } = await supabase
    .from('session_state')
    .insert({ session_id: sessionId, user_id: null, case_id: caseId });
  if (stateError) {
    console.error(`[DB_HELPER_ERROR] createSession (state): ${stateError.message}`);
    throw new Error('Failed to create session state.');
  }

  // Sanitize location data for initial map state
  const { id, name, scene_description, keywords, interactables } = initialLocation;
  const sanitizedInitialLocation = { id, name, scene_description, keywords, interactables };

  // Create initial progress record (without current_location)
  const initialProgress = {
    session_id: sessionId,
    evidence_log: [],
    suspect_log: [],
    chat_history: [],
    last_five_messages: [],
    ai_core_summary: 'The investigation has just begun.',
    current_map_state: [{ ...sanitizedInitialLocation, is_current: true }],
  };

  const { data: progressData, error: progressError } = await supabase
    .from('session_progress')
    .insert(initialProgress)
    .select()
    .single();

  if (progressError) {
    console.error(`[DB_HELPER_ERROR] createSession (progress): ${progressError.message}`);
    await supabase.from('session_state').delete().eq('session_id', sessionId); // Rollback
    throw new Error('Failed to create session progress.');
  }

  return { sessionId, progress: progressData };
}

/**
 * Reads all progress for a session and derives dynamic properties.
 */
export async function readSessionProgress(supabase, sessionId) {
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

  const { data: progressData, error: progressError } = await supabase
    .from('session_progress')
    .select('*')
    .eq('session_id', sessionId)
    .single();
  if (progressError) {
    console.error(`[DB_HELPER_ERROR] readSessionProgress (progress): ${progressError.message}`);
    throw new Error('Failed to read session progress.');
  }
  if (!progressData) return null;

  // Dynamically derive currentLocation for game logic
  if (Array.isArray(progressData.current_map_state)) {
    const currentLoc = progressData.current_map_state.find(loc => loc.is_current);
    if (currentLoc) {
      progressData.currentLocation = currentLoc.id;
    }
  }

  return { ...stateData, ...progressData };
}

/**
 * Saves the updated progress data.
 */
export async function saveSessionProgress(supabase, sessionId, progressData) {
    const dbProgressData = { ...progressData };
    // Remove app-level properties before saving to DB
    delete dbProgressData.currentLocation; 
    delete dbProgressData.knownLocations; // This property is derived and not in the DB schema

    const { error: progressError } = await supabase
        .from('session_progress')
        .update(dbProgressData)
        .eq('session_id', sessionId);
    if (progressError) {
        console.error(`[DB_HELPER_ERROR] saveSessionProgress (progress): ${progressError.message}`);
        throw new Error('Failed to save session progress.');
    }

    const { error: stateError } = await supabase
        .from('session_state')
        .update({ updated_at: new Date().toISOString() })
        .eq('session_id', sessionId);
    if (stateError) {
        console.error(`[DB_HELPER_ERROR] saveSessionProgress (state): ${stateError.message}`);
    }
}

/**
 * Deletes a session permanently.
 */
export async function deleteSession(supabase, sessionId) {
  const { error: progressError } = await supabase
    .from('session_progress')
    .delete()
    .eq('session_id', sessionId);
  if (progressError) {
    console.error(`[DB_HELPER_ERROR] deleteSession (progress): ${progressError.message}`);
    throw new Error('Failed to delete session progress.');
  }

  const { data, error: stateError } = await supabase
    .from('session_state')
    .delete()
    .eq('session_id', sessionId)
    .select();
  if (stateError) {
    console.error(`[DB_HELPER_ERROR] deleteSession (state): ${stateError.message}`);
    throw new Error('Failed to delete session state.');
  }
  return data;
}

/**
 * Fetches the most recent session for a given case.
 */
export async function fetchLatestSession(supabase, caseId) {
  try {
    const { data, error } = await supabase
      .from('session_state')
      .select('session_id, updated_at, created_at')
      .eq('case_id', caseId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`[DB_HELPER_ERROR] fetchLatestSession: ${err.message}`);
    throw new Error(`Failed to fetch latest session for case ${caseId}.`);
  }
}

/**
 * Fetches and transforms case summaries for the frontend.
 */
export async function getCaseSummaries(supabase) {
  try {
    const { data, error } = await supabase
      .from('case_summaries')
      .select('case_id, case_number, title, synopsis, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(item => ({
      id: item.case_id,
      caseNumber: item.case_number,
      title: item.title,
      synopsis: item.synopsis,
      createdAt: item.created_at,
    }));
  } catch (err) {
    console.error(`[DB_HELPER_ERROR] getCaseSummaries: ${err.message}`);
    throw new Error(`Failed to retrieve case summaries for menu.`);
  }
}