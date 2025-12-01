import { getSupabaseClient } from '../client';

export interface HairStyleCategory {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HairStyle {
  id: string;
  company_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  length: string | null;
  gender: string;
  image_url: string | null;
  thumbnail_url: string | null;
  tags: string[];
  source: string | null;
  source_url: string | null;
  popularity_score: number;
  is_featured: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HairStyleWithCategory extends HairStyle {
  category: HairStyleCategory | null;
}

export interface HairStyleFavorite {
  id: string;
  customer_id: string;
  hair_style_id: string;
  created_at: string;
}

export interface HairStyleInsert {
  company_id: string;
  category_id?: string | null;
  name: string;
  description?: string | null;
  length?: string | null;
  gender?: string;
  image_url?: string | null;
  thumbnail_url?: string | null;
  tags?: string[];
  source?: string | null;
  source_url?: string | null;
  is_featured?: boolean;
  is_active?: boolean;
  created_by?: string | null;
}

export interface HairStyleUpdate {
  category_id?: string | null;
  name?: string;
  description?: string | null;
  length?: string | null;
  gender?: string;
  image_url?: string | null;
  thumbnail_url?: string | null;
  tags?: string[];
  source?: string | null;
  source_url?: string | null;
  is_featured?: boolean;
  is_active?: boolean;
  popularity_score?: number;
}

export interface HairStyleSearchParams {
  category_id?: string;
  length?: string;
  gender?: string;
  tags?: string[];
  query?: string;
  featured_only?: boolean;
  limit?: number;
  offset?: number;
}

// Mock data for when table doesn't exist yet
const mockHairStyles: HairStyle[] = [
  {
    id: '1',
    company_id: '',
    category_id: null,
    name: 'ナチュラルショートボブ',
    description: '清潔感のあるナチュラルなショートボブスタイル',
    length: 'short',
    gender: 'female',
    image_url: null,
    thumbnail_url: null,
    tags: ['人気', '小顔効果', 'お手入れ簡単'],
    source: 'original',
    source_url: null,
    popularity_score: 100,
    is_featured: true,
    is_active: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    company_id: '',
    category_id: null,
    name: 'ゆるふわミディアム',
    description: '柔らかいウェーブが特徴のミディアムヘア',
    length: 'medium',
    gender: 'female',
    image_url: null,
    thumbnail_url: null,
    tags: ['人気', 'デート向け'],
    source: 'original',
    source_url: null,
    popularity_score: 90,
    is_featured: true,
    is_active: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    company_id: '',
    category_id: null,
    name: 'エレガントロング',
    description: '美しいツヤと毛流れのロングヘア',
    length: 'long',
    gender: 'female',
    image_url: null,
    thumbnail_url: null,
    tags: ['艶髪', 'フォーマル向け'],
    source: 'original',
    source_url: null,
    popularity_score: 85,
    is_featured: false,
    is_active: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    company_id: '',
    category_id: null,
    name: 'カジュアルマッシュ',
    description: 'カジュアルで動きのあるマッシュスタイル',
    length: 'short',
    gender: 'unisex',
    image_url: null,
    thumbnail_url: null,
    tags: ['トレンド', 'ユニセックス'],
    source: 'original',
    source_url: null,
    popularity_score: 80,
    is_featured: true,
    is_active: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    company_id: '',
    category_id: null,
    name: 'パーマミディアム',
    description: '程よいボリューム感のパーマスタイル',
    length: 'medium',
    gender: 'female',
    image_url: null,
    thumbnail_url: null,
    tags: ['ボリュームアップ', '華やか'],
    source: 'original',
    source_url: null,
    popularity_score: 75,
    is_featured: false,
    is_active: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    company_id: '',
    category_id: null,
    name: 'レイヤーロング',
    description: '軽やかな動きを出したレイヤースタイル',
    length: 'long',
    gender: 'female',
    image_url: null,
    thumbnail_url: null,
    tags: ['軽やか', '動きあり'],
    source: 'original',
    source_url: null,
    popularity_score: 70,
    is_featured: false,
    is_active: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const hairStyleService = {
  // Categories
  async getCategories(companyId: string): Promise<HairStyleCategory[]> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('hair_style_categories')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      // Return empty if table doesn't exist
      console.warn('Hair style categories table may not exist:', error);
      return [];
    }
  },

  async createCategory(
    companyId: string,
    name: string,
    description?: string
  ): Promise<HairStyleCategory | null> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('hair_style_categories')
        .insert({
          company_id: companyId,
          name,
          description,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      return null;
    }
  },

  // Hair Styles
  async getAll(companyId: string, params?: HairStyleSearchParams): Promise<HairStyle[]> {
    const supabase = getSupabaseClient();
    try {
      let query = supabase
        .from('hair_styles')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (params?.category_id) {
        query = query.eq('category_id', params.category_id);
      }
      if (params?.length) {
        query = query.eq('length', params.length);
      }
      if (params?.gender && params.gender !== 'all') {
        query = query.or(`gender.eq.${params.gender},gender.eq.unisex`);
      }
      if (params?.featured_only) {
        query = query.eq('is_featured', true);
      }
      if (params?.query) {
        query = query.or(`name.ilike.%${params.query}%,description.ilike.%${params.query}%`);
      }
      if (params?.tags && params.tags.length > 0) {
        query = query.overlaps('tags', params.tags);
      }

      const { data, error } = await query
        .order('popularity_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(params?.limit || 50)
        .range(params?.offset || 0, (params?.offset || 0) + (params?.limit || 50) - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      // Return mock data if table doesn't exist
      console.warn('Hair styles table may not exist, using mock data:', error);
      let filteredMock = [...mockHairStyles];

      if (params?.length) {
        filteredMock = filteredMock.filter(s => s.length === params.length);
      }
      if (params?.query) {
        const q = params.query.toLowerCase();
        filteredMock = filteredMock.filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.tags.some(t => t.toLowerCase().includes(q))
        );
      }
      if (params?.featured_only) {
        filteredMock = filteredMock.filter(s => s.is_featured);
      }

      return filteredMock;
    }
  },

  async getById(id: string): Promise<HairStyleWithCategory | null> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('hair_styles')
        .select(`
          *,
          category:hair_style_categories(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as HairStyleWithCategory;
    } catch (error) {
      console.error('Error getting hair style:', error);
      const mockStyle = mockHairStyles.find(s => s.id === id);
      return mockStyle ? { ...mockStyle, category: null } : null;
    }
  },

  async getFeatured(companyId: string, limit: number = 6): Promise<HairStyle[]> {
    return this.getAll(companyId, { featured_only: true, limit });
  },

  async getPopular(companyId: string, limit: number = 10): Promise<HairStyle[]> {
    return this.getAll(companyId, { limit });
  },

  async create(style: HairStyleInsert): Promise<HairStyle | null> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('hair_styles')
        .insert(style)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating hair style:', error);
      return null;
    }
  },

  async update(id: string, updates: HairStyleUpdate): Promise<HairStyle | null> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('hair_styles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating hair style:', error);
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    try {
      const { error } = await supabase
        .from('hair_styles')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting hair style:', error);
      return false;
    }
  },

  async incrementPopularity(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    try {
      await supabase.rpc('increment_hair_style_popularity', { style_id: id });
    } catch (error) {
      console.warn('Could not increment popularity:', error);
    }
  },

  // Favorites
  async getFavorites(customerId: string): Promise<HairStyle[]> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('hair_style_favorites')
        .select(`
          hair_style:hair_styles(*)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data?.map(d => d.hair_style).filter(Boolean) as HairStyle[] || [];
    } catch (error) {
      console.warn('Error getting favorites:', error);
      return [];
    }
  },

  async addFavorite(customerId: string, hairStyleId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    try {
      const { error } = await supabase
        .from('hair_style_favorites')
        .upsert({
          customer_id: customerId,
          hair_style_id: hairStyleId,
        }, {
          onConflict: 'customer_id,hair_style_id',
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding favorite:', error);
      return false;
    }
  },

  async removeFavorite(customerId: string, hairStyleId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    try {
      const { error } = await supabase
        .from('hair_style_favorites')
        .delete()
        .eq('customer_id', customerId)
        .eq('hair_style_id', hairStyleId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing favorite:', error);
      return false;
    }
  },

  async isFavorite(customerId: string, hairStyleId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('hair_style_favorites')
        .select('id')
        .eq('customer_id', customerId)
        .eq('hair_style_id', hairStyleId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      return false;
    }
  },

  // Image upload
  async uploadImage(
    companyId: string,
    imageFile: File
  ): Promise<{ imageUrl: string; thumbnailUrl: string } | null> {
    const supabase = getSupabaseClient();
    try {
      const fileName = `${Date.now()}.jpg`;
      const filePath = `hair-styles/${companyId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('hair-styles')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('hair-styles')
        .getPublicUrl(filePath);

      return {
        imageUrl: urlData.publicUrl,
        thumbnailUrl: urlData.publicUrl, // Could create a thumbnail version
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  },
};
