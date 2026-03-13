import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ProgressiveDiscount } from '../types';

export const useProgressiveDiscounts = () => {
    const [discounts, setDiscounts] = useState<ProgressiveDiscount[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDiscounts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('progressive_discounts')
            .select('*')
            .order('day', { ascending: true });

        if (!error && data) {
            setDiscounts(data);
        }
        setLoading(false);
    };

    const updateDiscount = async (day: number, percent: number) => {
        const { error } = await supabase
            .from('progressive_discounts')
            .update({ discount_percent: percent })
            .eq('day', day);

        if (!error) {
            setDiscounts(prev => prev.map(d => d.day === day ? { ...d, discount_percent: percent } : d));
            return true;
        }
        return false;
    };

    useEffect(() => {
        fetchDiscounts();
    }, []);

    return { discounts, loading, updateDiscount, refetch: fetchDiscounts };
};