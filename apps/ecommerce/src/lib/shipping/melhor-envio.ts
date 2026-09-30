import { getEnv } from '@/lib/cloudflare/context';
import { ApiErrorCode } from '@/lib/types/generic';
import { adminCarrierById, updateCarrier } from '../db/carrier-admin';


export interface MelhorEnvioServiceDTO {
    serviceId: string | number;
    serviceName: string;
    carrierName: string;
    price: string;
    time: string;
    logo: string;
}

export interface CalculateMelhorEnvioInput {
    carrierId: number;
    cepDestino: string;
    peso: number;
    altura: number;
    largura: number;
    comprimento: number;
}

export interface MelhorEnvioRawService {
    serviceId: string | number;
    serviceName?: string;
    companyName?: string;
    company?: string;
    logo?: string;
    price: string | number;
    time?: string;
    [key: string]: any;
}

export type CalculateMelhorEnvioResult = | { success: true; data: MelhorEnvioServiceDTO[] } | { success: false; error: string; code: ApiErrorCode };


// Checkout > CarrierSelection > route.ts > calculateMelhorEnvioShipping :
// Busca fretes do melhor envio chamado por /api/melhor-envio-services
export async function calculateMelhorEnvioShipping(input: CalculateMelhorEnvioInput): Promise<CalculateMelhorEnvioResult> {
    const env = getEnv();
    const isProduction = env.NEXTJS_ENV === 'production';
    const baseUrl = isProduction ? 'https://melhorenvio.com.br' : 'https://sandbox.melhorenvio.com.br';

    const carrier = await adminCarrierById(input.carrierId);
    if (!carrier) {
        return {
            success: false,
            error: 'Carrier not found',
            code: 'NOT_FOUND' as ApiErrorCode,
        };
    }

    if (!carrier.origin_zip || !carrier.api_key) {
        return {
            success: false,
            error: 'Carrier not configured',
            code: 'VALIDATION_ERROR' as ApiErrorCode,
        };
    }

    const expiresAtValue = carrier.token_expires_at;
    
    const tokenEstaExpirado =
        typeof expiresAtValue === 'string'
            ? new Date(expiresAtValue) < new Date(Date.now() + 5 * 60 * 1000)
            : true;

    let tokenAtual = carrier.api_key;

    if ( tokenEstaExpirado && carrier.client_id && carrier.client_secret && carrier.refresh_token) {
        try {
            const renewResponse = await fetch(`${baseUrl}/oauth/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: carrier.refresh_token,
                    client_id: carrier.client_id,
                    client_secret: carrier.client_secret,
                }),
            });

            if (!renewResponse.ok) {
                const errorData: any = await renewResponse.json().catch(() => null);
                console.error('Erro ao renovar token:', errorData);
                throw new Error(errorData?.error_description || 'Falha ao renovar token');
            }

            const renewData: any = await renewResponse.json();
            tokenAtual = renewData.access_token;

            await updateCarrier(carrier.id, {
                api_key: renewData.access_token,
                refresh_token: renewData.refresh_token || carrier.refresh_token,
                token_expires_at: new Date(
                    Date.now() + renewData.expires_in * 1000
                ).toISOString(),
            });
        } catch (error: any) {
            console.error('Falha ao renovar token:', error);
            return {
                success: false,
                error: error.message || 'Falha ao renovar token de autenticação',
                code: 'INTERNAL_ERROR' as ApiErrorCode,
            };
        }
    }

    const body = {
        from: { postal_code: carrier.origin_zip },
        to: { postal_code: input.cepDestino },
        products: [
            {
                width: Number(input.largura),
                height: Number(input.altura),
                length: Number(input.comprimento),
                weight: Number(input.peso),
                quantity: 1,
            },
        ],
        services: '',
    };

    try {
        const response = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenAtual}`,
                Accept: 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error: any = await response.json().catch(() => null);
            console.error('Erro na API:', error);
            return {
                success: false,
                error: error?.message || 'Erro ao calcular frete',
                code: 'INTERNAL_ERROR' as ApiErrorCode,
            };
        }

        const resultado = (await response.json()) as any[];

        const fretes: MelhorEnvioServiceDTO[] = resultado
            .filter((servico: any) => !servico.error)
            .map((servico: any) => ({
                serviceId: servico.id,
                serviceName: servico.name,
                carrierName: servico.company.name,
                price: servico.price.toString(),
                time: `${servico.delivery_time} dias úteis`,
                logo: servico.company.picture,
            }));

        return { success: true, data: fretes };
    } catch (err: any) {
        console.error('Erro geral:', err);
        return {
            success: false,
            error: err.message || 'Erro inesperado ao calcular frete',
            code: 'INTERNAL_ERROR' as ApiErrorCode,
        };
    }
}
