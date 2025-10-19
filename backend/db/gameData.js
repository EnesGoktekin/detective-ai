import { v4 as uuidv4 } from 'uuid';

/**
 * Lightweight DB helpers for migration: case_summaries, case_data, session helpers
 * These helpers accept a Supabase client instance to keep server.js decoupled from SQL details
 */

export async function getCaseSummaries(supabase) {
    try {
        // --- HATA DÜZELTİLDİ: 'case_screen' yerine 'case_summaries' tablosu kullanılıyor ---
        const { data, error } = await supabase
            .from('case_summaries') // DOĞRU TABLO
            .select('*');

        if (error) throw error;
        if (!data) return [];

        return data.map((row) => ({
            id: row.case_id, // Sütun adı 'case_id' olarak güncellendi
            title: row.title,
            synopsis: row.synopsis,
            caseNumber: row.case_number || '000'
        }));
    } catch (err) {
        console.error('[DB-HELPER] getCaseSummaries error:', err?.message || err);
        throw err;
    }
}

export async function getCaseData(supabase, caseId) {
    try {
        // --- HATA DÜZELTİLDİ: 'cases' yerine 'case_data' tablosu kullanılıyor ---
        const { data: caseData, error } = await supabase
            .from('case_data') // DOĞRU TABLO
            .select('*')
            .eq('case_id', caseId) // Sütun adı 'case_id' olarak güncellendi
            .single();

        if (error) throw error;

        // --- YENİ HATA AYIKLAMA LOGU ---
        // Veritabanından gelen 'location_data'nın tam yapısını görelim.
        console.log('[DEBUG] Raw location_data from DB:', JSON.stringify(caseData?.location_data, null, 2));
        // --- BİTİŞ ---

        const evidenceTruth = Array.isArray(caseData?.evidence_truth) ? caseData.evidence_truth : [];

        return {
            id: caseData.case_id,
            title: caseData.title,
            synopsis: caseData.synopsis,
            caseNumber: caseData.case_number,
            location_data: caseData.location_data || [], // Sütun adı 'location_data' olarak güncellendi
            victims: caseData.victims || {},
            suspects: caseData.suspects || [],
            evidence_truth: evidenceTruth,
            correct_accusation: caseData.correct_accusation || {}, // Sütun adı 'correct_accusation' olarak güncellendi
            full_story: caseData.full_story || '',
            suspect_truth: caseData.suspect_truth || [],
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
        // Bu fonksiyon zaten doğruydu, olduğu gibi kalıyor.
        const { data: caseRow, error } = await supabase
            .from('case_data')
            .select('case_id, title, synopsis, location_data, case_number, victims, suspects')
            .eq('case_id', caseId)
            .single();

        if (error) throw error;

        return {
            id: caseRow.case_id,
            title: caseRow.title,
            synopsis: caseRow.synopsis,
            locations: caseRow.location_data || [],
            caseNumber: caseRow.case_number,
            victim: caseRow.victims || {},
            suspects: caseRow.suspects || [],
            _raw: caseRow
        };
    } catch (err) {
        console.error('[DB-HELPER] getFullCaseInfo error:', err?.message || err);
        throw err;
    }
}

// ---------------------- Session helpers (Bunlar hala 'game_sessions' kullanıyor, planlandığı gibi) ----------------------

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

export async function createSession(supabase, userId, caseId, initialGameState) {
    try {
        const sessionId = uuidv4();
        const payload = {
            session_id: sessionId,
            case_id: caseId,
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

