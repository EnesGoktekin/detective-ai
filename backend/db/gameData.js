import { v4 as uuidv4 } from 'uuid';

/**
 * Lightweight DB helpers for migration: case_summaries, case_data, session helpers
 * These helpers accept a Supabase client instance to keep server.js decoupled from SQL details
 */
export async function getCaseSummaries(supabase) {
	try {
		const { data, error } = await supabase
			.from('case_screen')
			.select('*');

	if (error) throw error;
	if (!data) return [];

	return data.map((row) => ({
			id: row.id,
			title: row.title,
			synopsis: row.synopsis,
			caseNumber: row.case_number || row.casenumber || row.caseNumber || '001'
		}));
	} catch (err) {
		console.error('[DB-HELPER] getCaseSummaries error:', err?.message || err);
		throw err;
	}
}
export async function getCaseData(supabase, caseId) {
	try {
		const { data: caseData, error } = await supabase
			.from('cases')
			.select('*')
			.eq('id', caseId)
			.single();

	if (error) throw error;

	// Keep raw evidence array as-is (the server expects evidence_truth as an array of objects)
	const evidenceTruth = Array.isArray(caseData?.evidence_truth) ? caseData.evidence_truth : [];

		return {
			id: caseData.id,
			title: caseData.title,
			synopsis: caseData.synopsis,
			caseNumber: caseData.case_number,
			locations: caseData.locations || [],
			victim: caseData.victim || {},
			suspects: caseData.suspects || [],
			evidence_truth: evidenceTruth,
			correctaccusation: caseData.correctaccusation || {},
			// include raw caseData for any additional fields
			_raw: caseData
		};
	} catch (err) {
		console.error('[DB-HELPER] getCaseData error:', err?.message || err);
		throw err;
	}
}
/**
 * getFullCaseInfo - Read lightweight but complete case info used for AI prompt assembly
 * Reads from `case_data` table which is the new canonical source for prompt fields
 */
export async function getFullCaseInfo(supabase, caseId) {
	try {
		// Important: new schema centralizes prompt-facing fields under `case_data` table
		const { data: caseRow, error } = await supabase
			.from('case_data')
			.select('id, title, synopsis, location_data, case_number, victim, suspects')
			.eq('id', caseId)
			.single();

		if (error) throw error;

		return {
			id: caseRow.id,
			title: caseRow.title,
			synopsis: caseRow.synopsis,
			locations: caseRow.location_data || [],
			caseNumber: caseRow.case_number,
			victim: caseRow.victim || {},
			suspects: caseRow.suspects || [],
			_raw: caseRow
		};
	} catch (err) {
		console.error('[DB-HELPER] getFullCaseInfo error:', err?.message || err);
		throw err;
	}
}
export async function getSessionStateAndProgress(supabase, sessionId) {
	try {
		const { data, error } = await supabase
			.from('game_sessions')
			.select('session_id, game_state, created_at, updated_at')
			.eq('session_id', sessionId)
			.single();

		if (error) throw error;
		return data || null;
	} catch (err) {
		console.error('[DB-HELPER] getSessionStateAndProgress error:', err?.message || err);
		throw err;
	}
}
// ---------------------- Session helpers (write to existing game_sessions) ----------------------
export async function createSession(supabase, userId, caseId, initialGameState) {
	try {
		const sessionId = uuidv4();
		const payload = {
			session_id: sessionId,
			case_id: caseId,
			// Optionally include user_id if your schema has it
			...(userId ? { user_id: userId } : {}),
			game_state: initialGameState
		};

		const { data, error } = await supabase
			.from('game_sessions')
			.insert(payload)
			.select()
			.single();

		if (error) throw error;
		return data;
	} catch (err) {
		console.error('[DB-HELPER] createSession error:', err?.message || err);
		throw err;
	}
}
export async function deleteSession(supabase, sessionId) {
	try {
		const { data, error } = await supabase
			.from('game_sessions')
			.delete()
			.eq('session_id', sessionId)
			.select();

		if (error) throw error;
		return data;
	} catch (err) {
		console.error('[DB-HELPER] deleteSession error:', err?.message || err);
		throw err;
	}
}

// ---------------------- game_sessions read/write helpers ----------------------
export async function fetchLatestSession(supabase, caseId) {
	try {
		const { data, error } = await supabase
			.from('game_sessions')
			.select('session_id, created_at')
			.eq('case_id', caseId)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (error) throw error;
		return data || null;
	} catch (err) {
		console.error('[DB-HELPER] fetchLatestSession error:', err?.message || err);
		throw err;
	}
}

export async function readGameState(supabase, sessionId) {
	try {
		const { data, error } = await supabase
			.from('game_sessions')
			.select('game_state')
			.eq('session_id', sessionId)
			.single();

		if (error) throw error;
		return data || null;
	} catch (err) {
		console.error('[DB-HELPER] readGameState error:', err?.message || err);
		throw err;
	}
}

export async function saveGameState(supabase, sessionId, newState) {
	try {
		const { data, error } = await supabase
			.from('game_sessions')
			.update({ game_state: newState, updated_at: new Date().toISOString() })
			.eq('session_id', sessionId)
			.select();

		if (error) throw error;
		return data || null;
	} catch (err) {
		console.error('[DB-HELPER] saveGameState error:', err?.message || err);
		throw err;
	}
}
