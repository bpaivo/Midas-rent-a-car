import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Reservation } from '../types';

export const useReservations = () => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReservations = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: supabaseError } = await supabase
                .from('reservations')
                .select('*, clients(name), vehicles(model, plate)')
                .order('created_at', { ascending: false });

            if (supabaseError) throw supabaseError;

            if (data) {
                const now = new Date();
                const transformed: Reservation[] = await Promise.all(data.map(async (r: any) => {
                    // Lógica automática: converter "aguardando retirada" para "reserva perdida" se o tempo passou (tolerância de 30 min)
                    const pickupDate = new Date(r.pickup_date);
                    const toleranceDate = new Date(pickupDate.getTime() + 30 * 60 * 1000);
                    let currentStatus = r.status;
                    let currentObservations = r.observations || '';

                    if (currentStatus === 'aguardando retirada' && toleranceDate < now) {
                        currentStatus = 'reserva perdida' as any;
                        currentObservations = currentObservations
                            ? `${currentObservations}\nNo-show`
                            : 'No-show';

                        // Atualizar no banco sem esperar para não atrasar o render
                        supabase.from('reservations')
                            .update({
                                status: 'reserva perdida',
                                observations: currentObservations
                            })
                            .eq('id', r.id)
                            .then(({ error }) => {
                                if (error) console.error('Erro ao atualizar status automático:', error);
                            });
                    }

                    return {
                        ...r,
                        status: currentStatus,
                        clientName: r.clients?.name || 'N/A',
                        vehicleModel: r.vehicles?.model || 'N/A',
                        vehiclePlate: r.vehicles?.plate || 'N/A',
                        dateStr: new Date(r.created_at).toLocaleDateString('pt-BR')
                    };
                }));
                setReservations(transformed);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar reservas');
            console.error('Error fetching reservations:', err);
        } finally {
            setLoading(false);
        }
    };

    const addReservation = async (reservation: Omit<Reservation, 'id'>) => {
        try {
            const { data, error } = await supabase
                .from('reservations')
                .insert([reservation])
                .select()
                .single();

            if (error) throw error;
            await fetchReservations();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const updateReservation = async (id: string, updates: Partial<Reservation>) => {
        try {
            const { error } = await supabase
                .from('reservations')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            await fetchReservations();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const getVehicleReservations = async (vehicleId: string) => {
        try {
            const { data, error } = await supabase
                .from('reservations')
                .select('pickup_date, return_date, status')
                .eq('vehicle_id', vehicleId)
                .neq('status', 'reserva cancelada')
                .neq('status', 'reserva perdida');

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Error fetching vehicle availability:', err);
            return [];
        }
    };

    useEffect(() => {
        fetchReservations();
    }, []);

    return {
        reservations,
        loading,
        error,
        refetch: fetchReservations,
        addReservation,
        updateReservation,
        getVehicleReservations
    };
};
