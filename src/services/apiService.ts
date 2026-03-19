import { supabase } from '../supabase';

export const apiFetchUserCollection = async <T>(collection: string, userId?: string): Promise<T[]> => {
  // Se houver RLS configurado, o Supabase filtrará automaticamente,
  // mas vamos garantir usando eq('user_id', userId) se a coleção não for admin/pública.
  // Como o app antigo usava `saveToFirestore(uid, col)`, vamos assumir que o Supabase lida com auth auto.
  const { data, error } = await supabase.from(collection).select('*');
  if (error) {
    console.warn(`Erro ao buscar coleção ${collection} na API:`, error);
    throw error;
  }
  return data as T[];
};

export const apiFetchAdmin = async (): Promise<any> => {
  const { data, error } = await supabase.from('admin').select('*').limit(1).single();
  if (error && error.code !== 'PGRST116') { // PGRST116 = missing row
    console.warn('Erro ao buscar admin na API:', error);
    throw error;
  }
  return data;
};

export const apiUpsertDoc = async (collection: string, payload: any): Promise<void> => {
  const { error } = await supabase.from(collection).upsert(payload);
  if (error) {
    console.warn(`Erro ao salvar ${collection} na API:`, error);
    throw error;
  }
};

export const apiDeleteDoc = async (collection: string, docId: string): Promise<void> => {
  // Admin shouldn't be deleted this way, usually.
  const { error } = await supabase.from(collection).delete().eq('id', docId);
  if (error) {
    console.warn(`Erro ao deletar de ${collection} na API:`, docId, error);
    throw error;
  }
};
