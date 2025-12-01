import { getSupabaseClient } from '../client';
import type { Tables } from '../types/database';

export interface SignUpData {
  email: string;
  password: string;
  companyName: string;
  lastName: string;
  firstName: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  companyId: string;
  staffId: string | null;
  role: string;
}

export const authService = {
  async signUp(data: SignUpData) {
    const supabase = getSupabaseClient();

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          company_name: data.companyName,
          last_name: data.lastName,
          first_name: data.firstName,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('ユーザー作成に失敗しました');

    // Create company
    const { data: company, error: companyError } = await (supabase
      .from('companies') as ReturnType<typeof supabase.from>)
      .insert({
        name: data.companyName,
        settings: {},
      } as Record<string, unknown>)
      .select()
      .single();

    if (companyError) throw companyError;

    // Create staff record for the owner
    const { data: staff, error: staffError } = await (supabase
      .from('staff') as ReturnType<typeof supabase.from>)
      .insert({
        company_id: (company as { id: string }).id,
        user_id: authData.user.id,
        employee_code: 'OWNER001',
        last_name: data.lastName,
        first_name: data.firstName,
        email: data.email,
        role: 'owner',
        is_active: true,
      } as Record<string, unknown>)
      .select()
      .single();

    if (staffError) throw staffError;

    return {
      user: authData.user,
      company,
      staff,
    };
  },

  async signIn(data: SignInData) {
    const supabase = getSupabaseClient();

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;
    if (!authData.user) throw new Error('ログインに失敗しました');

    // Get staff info
    const { data: staff } = await supabase
      .from('staff')
      .select('*, company:companies(*)')
      .eq('user_id', authData.user.id)
      .eq('is_active', true)
      .single();

    return {
      user: authData.user,
      session: authData.session,
      staff,
    };
  },

  async signOut() {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = getSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: staff } = await (supabase
      .from('staff') as ReturnType<typeof supabase.from>)
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!staff) return null;

    const staffData = staff as { id: string; company_id: string; role: string };
    return {
      id: user.id,
      email: user.email || '',
      companyId: staffData.company_id,
      staffId: staffData.id,
      role: staffData.role,
    };
  },

  async getSession() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async refreshSession() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  },

  async resetPassword(email: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    const supabase = getSupabaseClient();
    return supabase.auth.onAuthStateChange(callback);
  },
};
