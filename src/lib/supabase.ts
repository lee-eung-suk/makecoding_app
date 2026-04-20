import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Suppress errors if the user hasn't set keys yet, allowing the app to still render
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function saveGameResult(data: {
  grade: string;
  subject: string;
  gameType: string;
  keywords: string[];
  score: number;
}) {
  if (!supabase) {
    console.warn("Supabase is not configured yet. Fake success returned.");
    return { success: true, mock: true };
  }
  
  try {
    const { error } = await supabase
      .from('game_results')
      .insert([{
        grade: data.grade,
        subject: data.subject,
        game_type: data.gameType,
        keywords: data.keywords,
        score: data.score,
        created_at: new Date().toISOString()
      }]);
      
    if (error) {
      console.error("Supabase Save Error:", error);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.error("Error saving to Supabase:", err);
    return { success: false, error: err };
  }
}
