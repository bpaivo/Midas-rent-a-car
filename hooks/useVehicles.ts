import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Vehicle } from '../types';

export const useVehicles = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: supabaseError } = await supabase
                .from('vehicles')
                .select('*')
                .order('model', { ascending: true });

            if (supabaseError) throw supabaseError;
            setVehicles(data || []);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar veículos');
            console.error('Error fetching vehicles:', err);
        } finally {
            setLoading(false);
        }
    };

    const addVehicle = async (vehicle: Omit<Vehicle, 'id'>) => {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .insert([vehicle])
                .select()
                .single();

            if (error) throw error;

            setVehicles(prev => [data, ...prev]);
            return { success: true, data };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    return {
        vehicles,
        loading,
        error,
        refetch: fetchVehicles,
        addVehicle
    };
};
