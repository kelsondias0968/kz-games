
import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface UseDepositPollingOptions {
    enabled: boolean;
    interval?: number; // em milissegundos
    onUpdate?: () => void;
}

export const useDepositPolling = ({
    enabled,
    interval = 15000, // 15 segundos por padrão
    onUpdate
}: UseDepositPollingOptions) => {
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!enabled) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        const checkPendingDeposits = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
                const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

                // Chamar a Edge Function para verificar depósitos
                const response = await fetch(
                    `${supabaseUrl}/functions/v1/check-pending-deposits`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'apikey': supabaseKey,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const result = await response.json();

                if (response.ok && result.processed > 0) {
                    console.log(`✅ ${result.processed} depósito(s) processado(s) automaticamente`);
                    if (onUpdate) {
                        onUpdate();
                    }
                }
            } catch (error) {
                console.error('Erro ao verificar depósitos:', error);
            }
        };

        // Executar imediatamente
        checkPendingDeposits();

        // Configurar intervalo
        intervalRef.current = setInterval(checkPendingDeposits, interval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled, interval, onUpdate]);
};
