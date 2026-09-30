import { NextRequest } from 'next/server';
import { jsonNoStore } from "@/lib/utils";
import { requireLoged } from '@/lib/auth/require-loged';
import { calculateMelhorEnvioShipping } from '@/lib/shipping/melhor-envio';


export async function POST(req: NextRequest): Promise<any> {
    const auth = await requireLoged(req);
    if (!auth.ok) {
        return jsonNoStore(
            { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
            401
        );
    }

    const { cepDestino, peso, altura, largura, comprimento, transportadora } =
        (await req.json()) as any;

    const result = await calculateMelhorEnvioShipping({
        carrierId: transportadora.id,
        cepDestino,
        peso,
        altura,
        largura,
        comprimento,
    });

    if (!result.success) {
        // status coerente com o código
        const status =
            result.code === 'NOT_FOUND'
                ? 404
                : result.code === 'VALIDATION_ERROR'
                    ? 400
                    : 500;
        return jsonNoStore(result, status);
    }

    return jsonNoStore({ success: true, data: result.data }, 200);
}
