import { createClient } from '@supabase/supabase-js';

/**
 * Fetches the public case summary data for the selection screen.
 *
 * @param {object} supabase - The Supabase client instance.
 * @returns {Promise<Array<object>>} An array of case summary objects.
 */
export async function getCaseSummaries(supabase) {
  try {
    const { data, error } = await supabase
      .from('case_summaries')
      .select('case_id, case_number, title, synopsis, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[DB_HELPER_ERROR] getCaseSummaries: ${error.message}`);
      throw error;
    }

    // Convert snake_case to camelCase for the frontend
    return data.map(item => ({
      id: item.case_id, // Frontend caseItem.id olarak bekliyor
      caseNumber: item.case_number,
      title: item.title,
      synopsis: item.synopsis,
      createdAt: item.created_at,
    }));

  } catch (err) {
    throw new Error(`Failed to retrieve case summaries for menu.`);
  }
}
