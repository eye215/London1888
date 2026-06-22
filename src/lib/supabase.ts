import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isDatabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
);

export interface Reservation {
  id: string;
  name: string;
  phone: string;
  num_people: number;
  schedule: string;
  actor_name: string;
  created_at: string;
}

export interface Message {
  id: string;
  reservation_id: string;
  actor_name: string;
  message: string | null;
  booking_number: string;
  created_at: string;
}

export interface Review {
  id: string;
  nickname: string;
  schedule: string;
  review_content: string;
  created_at: string;
}
