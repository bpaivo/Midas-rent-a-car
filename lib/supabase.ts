import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bbxsyrdnamjamjbddxxp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJieHN5cmRuYW1qYW1qYmRkeHhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MDMxMTcsImV4cCI6MjA4NTQ3OTExN30.um2dr0qz5TO-_p9kelwFKkBT51jwtQF61PQ3W8bn5vI";

// Instância única para todo o projeto
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'midas-auth-token' // Chave única para evitar conflitos com outros apps Supabase
  }
});