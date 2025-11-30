export type ConversationStatus = 'processing' | 'completed' | 'failed';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type SuggestionType = 'upsell' | 'crosssell' | 'hairstyle' | 'product' | 'next_visit';
export type SuggestionStatus = 'pending' | 'shown' | 'accepted' | 'dismissed';
export type SimulationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ConversationRecording {
  id: string;
  companyId: string;
  visitId: string;
  audioUrl: string;
  durationSeconds?: number;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  // Joined data
  transcript?: ConversationTranscript;
  analysis?: ConversationAnalysis;
}

export interface ConversationTranscript {
  id: string;
  recordingId: string;
  fullText: string;
  segments: TranscriptSegment[];
  language: string;
  createdAt: string;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: 'stylist' | 'customer';
}

export interface ConversationAnalysis {
  id: string;
  recordingId: string;
  summary?: string;
  topics: string[];
  sentiment?: Sentiment;
  sentimentScore?: number;
  upsellOpportunities: UpsellOpportunity[];
  crosssellOpportunities: CrosssellOpportunity[];
  keyInsights: string[];
  nextVisitSuggestions: string[];
  conversationQualityScore?: number;
  createdAt: string;
}

export interface UpsellOpportunity {
  timing: string;
  suggestion: string;
  confidence: number;
}

export interface CrosssellOpportunity {
  product: string;
  reason: string;
  confidence: number;
}

export interface AISuggestion {
  id: string;
  companyId: string;
  visitId: string;
  customerId: string;
  type: SuggestionType;
  suggestion: string;
  confidence?: number;
  context?: Record<string, unknown>;
  status: SuggestionStatus;
  shownAt?: string;
  respondedAt?: string;
  createdAt: string;
}

export interface HairstyleSimulation {
  id: string;
  companyId: string;
  customerId: string;
  customerPhotoUrl: string;
  styleImageUrl: string;
  styleSource?: 'pinterest' | 'upload' | 'catalog';
  generatedImageUrl?: string;
  thumbnailUrl?: string;
  status: SimulationStatus;
  customerApproved?: boolean;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface TranscribeInput {
  visitId: string;
  audioBlob: Blob;
  language?: string;
}

export interface AnalyzeConversationInput {
  visitId: string;
  transcript: string;
  customerId: string;
  customerContext?: {
    visitHistory?: { date: string; menus: string[] }[];
    purchaseHistory?: { date: string; products: string[] }[];
    preferences?: string[];
  };
}

export interface GenerateHairstyleInput {
  customerId: string;
  customerPhotoUrl: string;
  styleImageUrl: string;
  styleSource?: 'pinterest' | 'upload' | 'catalog';
}
