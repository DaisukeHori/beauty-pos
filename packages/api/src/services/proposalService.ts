import { getSupabaseClient } from '../client';

export interface StyleProposal {
  id: string;
  company_id: string;
  store_id: string;
  customer_id: string;
  visit_id: string | null;
  staff_id: string;
  hair_style_id: string | null;
  style_name: string;
  description: string | null;
  reason: string | null;
  image_url: string | null;
  simulation_id: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  customer_feedback: string | null;
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StyleProposalWithDetails extends StyleProposal {
  staff: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  hair_style?: {
    id: string;
    name: string;
    image_url: string | null;
    description: string | null;
  } | null;
}

export interface CreateProposalData {
  company_id: string;
  store_id: string;
  customer_id: string;
  visit_id?: string;
  staff_id: string;
  hair_style_id?: string;
  style_name: string;
  description?: string;
  reason?: string;
  image_url?: string;
  simulation_id?: string;
  expires_at?: string;
}

// Mock data for when table doesn't exist
const mockProposals: StyleProposalWithDetails[] = [
  {
    id: '1',
    company_id: '',
    store_id: '',
    customer_id: '',
    visit_id: null,
    staff_id: '1',
    hair_style_id: null,
    style_name: 'ゆるふわミディアム',
    description: '柔らかいウェーブで女性らしさを引き出すスタイルです。お手入れも簡単で、毎日のスタイリングが楽になります。',
    reason: 'お客様の髪質と顔型に合わせて、より柔らかい印象になるスタイルをご提案いたします。前回のカラーとの相性も良く、より魅力的に見えると思います。',
    image_url: null,
    simulation_id: null,
    status: 'pending',
    customer_feedback: null,
    responded_at: null,
    expires_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    staff: {
      id: '1',
      first_name: '美咲',
      last_name: '田中',
      avatar_url: null,
    },
    hair_style: null,
  },
];

export const proposalService = {
  async getByCustomer(
    customerId: string,
    status?: string
  ): Promise<StyleProposalWithDetails[]> {
    const supabase = getSupabaseClient();
    try {
      let query = supabase
        .from('style_proposals')
        .select(`
          *,
          staff:staff(id, first_name, last_name, avatar_url),
          hair_style:hair_styles(id, name, image_url, description)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as StyleProposalWithDetails[] || [];
    } catch (error) {
      console.warn('Style proposals table may not exist, using mock data:', error);
      return status
        ? mockProposals.filter(p => p.status === status)
        : mockProposals;
    }
  },

  async getPending(customerId: string): Promise<StyleProposalWithDetails[]> {
    return this.getByCustomer(customerId, 'pending');
  },

  async getByVisit(visitId: string): Promise<StyleProposalWithDetails[]> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('style_proposals')
        .select(`
          *,
          staff:staff(id, first_name, last_name, avatar_url),
          hair_style:hair_styles(id, name, image_url, description)
        `)
        .eq('visit_id', visitId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StyleProposalWithDetails[] || [];
    } catch (error) {
      console.warn('Error getting proposals by visit:', error);
      return [];
    }
  },

  async getById(id: string): Promise<StyleProposalWithDetails | null> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('style_proposals')
        .select(`
          *,
          staff:staff(id, first_name, last_name, avatar_url),
          hair_style:hair_styles(id, name, image_url, description)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as StyleProposalWithDetails;
    } catch (error) {
      console.error('Error getting proposal:', error);
      const mock = mockProposals.find(p => p.id === id);
      return mock || null;
    }
  },

  async create(proposalData: CreateProposalData): Promise<StyleProposal | null> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('style_proposals')
        .insert({
          ...proposalData,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating proposal:', error);
      return null;
    }
  },

  async accept(
    id: string,
    feedback?: string
  ): Promise<StyleProposal | null> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('style_proposals')
        .update({
          status: 'accepted',
          customer_feedback: feedback,
          responded_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error accepting proposal:', error);
      return null;
    }
  },

  async reject(
    id: string,
    feedback?: string
  ): Promise<StyleProposal | null> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('style_proposals')
        .update({
          status: 'rejected',
          customer_feedback: feedback,
          responded_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      return null;
    }
  },

  async addFeedback(
    id: string,
    feedback: string
  ): Promise<StyleProposal | null> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('style_proposals')
        .update({
          customer_feedback: feedback,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding feedback:', error);
      return null;
    }
  },

  async countPending(customerId: string): Promise<number> {
    const supabase = getSupabaseClient();
    try {
      const { count, error } = await supabase
        .from('style_proposals')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    } catch (error) {
      // Return mock count
      return mockProposals.filter(p => p.status === 'pending').length;
    }
  },

  async expireOld(): Promise<number> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('style_proposals')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Error expiring proposals:', error);
      return 0;
    }
  },

  // Get proposals created by a staff member
  async getByStaff(
    staffId: string,
    limit: number = 20
  ): Promise<StyleProposalWithDetails[]> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('style_proposals')
        .select(`
          *,
          staff:staff(id, first_name, last_name, avatar_url),
          hair_style:hair_styles(id, name, image_url, description),
          customer:customers(id, first_name, last_name)
        `)
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as StyleProposalWithDetails[] || [];
    } catch (error) {
      console.error('Error getting staff proposals:', error);
      return [];
    }
  },
};
