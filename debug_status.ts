
import { supabase } from './lib/supabase';

async function checkStatus() {
    const { data, error } = await supabase
        .from('clients')
        .select('status')
        .limit(10);

    if (error) {
        console.error('Erro ao buscar status:', error);
        return;
    }

    console.log('Status encontrados no banco:', data.map(d => d.status));
}

checkStatus();
