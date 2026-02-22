import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';

export const useClients = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchClients = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: supabaseError } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            if (supabaseError) throw supabaseError;
            setClients(data || []);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar clientes');
            console.error('Error fetching clients:', err);
        } finally {
            setLoading(false);
        }
    };

    const addClient = async (client: Omit<Client, 'id'>) => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .insert([client])
                .select()
                .single();

            if (error) throw error;

            setClients(prev => [data, ...prev]);
            return { success: true, data };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    return {
        clients,
        loading,
        error,
        refetch: fetchClients,
        addClient
    };
};
