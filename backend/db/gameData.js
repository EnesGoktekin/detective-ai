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

