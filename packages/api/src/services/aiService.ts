import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types/database';

export type ConversationRecording = Tables<'conversation_recordings'>;
export type ConversationTranscript = Tables<'conversation_transcripts'>;
export type ConversationAnalysis = Tables<'conversation_analyses'>;
export type AISuggestion = Tables<'ai_suggestions'>;
export type HairstyleSimulation = Tables<'hairstyle_simulations'>;

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: 'staff' | 'customer';
  confidence?: number;
}

export interface AnalysisResult {
  topics: string[];
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    score: number;
  };
  keywords: string[];
  customerPreferences: string[];
  concerns: string[];
  opportunities: string[];
  summary: string;
}

export const aiService = {
  // Conversation Recording
  async createRecording(recording: InsertTables<'conversation_recordings'>): Promise<ConversationRecording> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('conversation_recordings') as ReturnType<typeof supabase.from>)
      .insert(recording as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return data as ConversationRecording;
  },

  async getRecording(id: string): Promise<ConversationRecording | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('conversation_recordings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getRecordingsByVisit(visitId: string): Promise<ConversationRecording[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('conversation_recordings')
      .select('*')
      .eq('visit_id', visitId)
      .order('recorded_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async uploadAudio(
    companyId: string,
    visitId: string,
    customerId: string,
    staffId: string,
    audioFile: File
  ): Promise<ConversationRecording> {
    const supabase = getSupabaseClient();

    // Upload audio file
    const fileName = `${visitId}/${Date.now()}.webm`;
    const filePath = `recordings/${companyId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('conversation-recordings')
      .upload(filePath, audioFile);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('conversation-recordings')
      .getPublicUrl(filePath);

    // Create recording record
    return this.createRecording({
      company_id: companyId,
      visit_id: visitId,
      customer_id: customerId,
      staff_id: staffId,
      audio_url: urlData.publicUrl,
      duration_seconds: 0, // Will be updated after processing
      status: 'pending',
      recorded_at: new Date().toISOString(),
    });
  },

  async updateRecordingStatus(
    id: string,
    status: string,
    durationSeconds?: number
  ): Promise<ConversationRecording> {
    const supabase = getSupabaseClient();
    const updates: UpdateTables<'conversation_recordings'> = { status };
    if (durationSeconds !== undefined) {
      updates.duration_seconds = durationSeconds;
    }

    const { data, error } = await (supabase
      .from('conversation_recordings') as ReturnType<typeof supabase.from>)
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ConversationRecording;
  },

  // Transcription
  async createTranscript(transcript: InsertTables<'conversation_transcripts'>): Promise<ConversationTranscript> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('conversation_transcripts') as ReturnType<typeof supabase.from>)
      .insert(transcript as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return data as ConversationTranscript;
  },

  async getTranscriptByRecording(recordingId: string): Promise<ConversationTranscript | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('conversation_transcripts')
      .select('*')
      .eq('recording_id', recordingId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Analysis
  async createAnalysis(analysis: InsertTables<'conversation_analyses'>): Promise<ConversationAnalysis> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('conversation_analyses') as ReturnType<typeof supabase.from>)
      .insert(analysis as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return data as ConversationAnalysis;
  },

  async getAnalysisByTranscript(transcriptId: string): Promise<ConversationAnalysis | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('conversation_analyses')
      .select('*')
      .eq('transcript_id', transcriptId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getCustomerAnalyses(customerId: string, limit: number = 10): Promise<ConversationAnalysis[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('conversation_analyses')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // AI Suggestions
  async createSuggestion(suggestion: InsertTables<'ai_suggestions'>): Promise<AISuggestion> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('ai_suggestions') as ReturnType<typeof supabase.from>)
      .insert(suggestion as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return data as AISuggestion;
  },

  async getSuggestionsByVisit(visitId: string): Promise<AISuggestion[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('visit_id', visitId)
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .order('confidence', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getSuggestionsByCustomer(customerId: string, timing?: string): Promise<AISuggestion[]> {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('ai_suggestions')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);

    if (timing) {
      query = query.eq('timing', timing);
    }

    const { data, error } = await query
      .order('priority', { ascending: false })
      .order('confidence', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateSuggestionStatus(
    id: string,
    status: string,
    response?: string,
    outcome?: string
  ): Promise<AISuggestion> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('ai_suggestions') as ReturnType<typeof supabase.from>)
      .update({
        status,
        staff_response: response,
        outcome,
      } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as AISuggestion;
  },

  async dismissSuggestion(id: string, reason?: string): Promise<AISuggestion> {
    return this.updateSuggestionStatus(id, 'dismissed', reason);
  },

  async acceptSuggestion(id: string): Promise<AISuggestion> {
    return this.updateSuggestionStatus(id, 'accepted');
  },

  async completeSuggestion(id: string, outcome: string): Promise<AISuggestion> {
    return this.updateSuggestionStatus(id, 'completed', undefined, outcome);
  },

  // Hairstyle Simulation
  async createSimulation(simulation: InsertTables<'hairstyle_simulations'>): Promise<HairstyleSimulation> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('hairstyle_simulations') as ReturnType<typeof supabase.from>)
      .insert(simulation as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return data as HairstyleSimulation;
  },

  async getSimulation(id: string): Promise<HairstyleSimulation | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('hairstyle_simulations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getSimulationsByCustomer(customerId: string): Promise<HairstyleSimulation[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('hairstyle_simulations')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getSimulationsByVisit(visitId: string): Promise<HairstyleSimulation[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('hairstyle_simulations')
      .select('*')
      .eq('visit_id', visitId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async uploadSourceImage(
    companyId: string,
    customerId: string,
    imageFile: File
  ): Promise<string> {
    const supabase = getSupabaseClient();

    const fileName = `${Date.now()}.jpg`;
    const filePath = `simulations/${companyId}/${customerId}/source/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('hairstyle-simulations')
      .upload(filePath, imageFile);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('hairstyle-simulations')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  },

  async updateSimulationResult(
    id: string,
    generatedImageUrl: string
  ): Promise<HairstyleSimulation> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('hairstyle_simulations') as ReturnType<typeof supabase.from>)
      .update({
        generated_image_url: generatedImageUrl,
        status: 'completed',
      } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as HairstyleSimulation;
  },

  async rateSimulation(
    id: string,
    rating: number,
    feedback?: string
  ): Promise<HairstyleSimulation> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('hairstyle_simulations') as ReturnType<typeof supabase.from>)
      .update({
        customer_rating: rating,
        customer_feedback: feedback,
      } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as HairstyleSimulation;
  },

  async approveSimulation(id: string): Promise<HairstyleSimulation> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('hairstyle_simulations') as ReturnType<typeof supabase.from>)
      .update({ staff_approved: true } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as HairstyleSimulation;
  },

  async updateSimulationStatus(id: string, status: string): Promise<HairstyleSimulation> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('hairstyle_simulations') as ReturnType<typeof supabase.from>)
      .update({ status } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as HairstyleSimulation;
  },
};
