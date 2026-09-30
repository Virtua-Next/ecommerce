import { ICarrierTranslated, IShippingOption } from "@/lib/schemas/carrier";
import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { MelhorEnvioRawService, calculateMelhorEnvioShipping } from "./melhor-envio";


export interface BuildQuoteParams {
    melhorEnvioCarrier?: ICarrierTranslated;
    melhorEnvioServices?: MelhorEnvioRawService[];
    transportadoras: ICarrierTranslated[];
    totalCarrinho: number;
    locale?: string;
    /** label traduzido para o "tempo" das personalizadas (t('customQuote')) */
    customQuoteLabel: string;
}

export type DimensionLine = {
    length?: number | null;
    width?: number | null;
    height?: number | null;
    weight?: number | null;
    quantity: number;
};

export type ResolvedShipping = {
    carrierId: number;
    carrierType: 'personalized' | 'melhor_envio';
    serviceId: number | string;
    serviceName: string;
    carrierName: string; // nome da empresa que efetivamente entrega (Correios, Jadlog, ou a própria transportadora personalizada)
    price: number;
    isFreeShipping: boolean;
};

interface ResolveInput {
    shippingOptionId: string;              // "me:123" | "custom:45"
    cepDestino: string;
    dimensoes: { length: number; width: number; height: number; weight: number };
    totalCarrinho: number;
    carriers: ICarrierTranslated[];        // carregue do banco no backend
}

// CarrierSelection > buildShippingOptions
// monta todas as transportadoras disponiveis (nao faz fetch, só monta)
export function buildShippingOptions({ melhorEnvioCarrier, melhorEnvioServices = [], transportadoras, totalCarrinho, locale, customQuoteLabel }: BuildQuoteParams): IShippingOption[] {
    const options: IShippingOption[] = [];
    const translationLocale = (locale || DEFAULT_LANGUAGE) as keyof NonNullable<ICarrierTranslated['translations']>;

    /* ===== MELHOR ENVIO ===== */
    if (melhorEnvioCarrier?.active && melhorEnvioServices.length) {
        const elegivelFreteGratis =
            !!melhorEnvioCarrier.free_shipping_from &&
            Number(melhorEnvioCarrier.free_shipping_from) <= totalCarrinho;

        const mapped: IShippingOption[] = melhorEnvioServices.map((frete) => ({
            id: `me:${frete.serviceId}`,
            carrierId: melhorEnvioCarrier.id,
            carrierType: 'melhor_envio',
            serviceId: frete.serviceId,
            serviceName: frete.serviceName ?? '',
            carrierName: frete.companyName ?? frete.company ?? melhorEnvioCarrier.carrier_name ?? '',
            companyName: frete.companyName ?? frete.company,
            logo: frete.logo,
            originalPrice: Number(frete.price),
            price: elegivelFreteGratis ? 0 : Number(frete.price),
            isFreeShipping: elegivelFreteGratis,
            time: frete.time ?? '',
        }));

        if (elegivelFreteGratis) {
            // Regra mantida: só a opção com menor preço original entra
            options.push(
                mapped.reduce((a, b) => (a.originalPrice < b.originalPrice ? a : b))
            );
        } else {
            options.push(...mapped);
        }
    }

    /* ===== PERSONALIZADAS ===== */
    transportadoras
        .filter((t) => t.carrier_type === 'personalized' && t.active)
        .forEach((transp) => {
            const ehGratis =
                !!transp.free_shipping &&
                Number(transp.free_shipping_from) <= totalCarrinho;

            const carrierName = transp.translations?.[translationLocale]?.carrier_name ?? transp.carrier_name ?? '';

            options.push({
                id: `custom:${transp.id}`,
                carrierId: transp.id,
                carrierType: 'personalized',
                serviceId: transp.id,
                serviceName: carrierName,
                carrierName,
                originalPrice: Number(transp.price),
                price: ehGratis ? 0 : Number(transp.price),
                isFreeShipping: ehGratis,
                time: customQuoteLabel,
            });
        });

    return options;
}

export function calculateOrderDimensions(lines: DimensionLine[]) {
    return lines.reduce(
        (acc, l) => ({
            length: acc.length + (l.length || 0),
            width: acc.width + (l.width || 0),
            height: acc.height + (l.height || 0),
            weight: acc.weight + (l.weight || 0) * l.quantity,
        }),
        { length: 0, width: 0, height: 0, weight: 0 }
    );
}

export async function resolveShippingSelection(input: ResolveInput): Promise<ResolvedShipping | null> {
    const [prefix, rawId] = input.shippingOptionId.split(':');
    if (!prefix || !rawId) return null;

    if (prefix === 'custom') {
        const transp = input.carriers.find((c) => c.id === Number(rawId) && c.carrier_type === 'personalized' && c.active);
        if (!transp) return null;

        const isFree = !!transp.free_shipping && Number(transp.free_shipping_from) <= input.totalCarrinho;

        return {
            carrierId: transp.id,
            carrierType: 'personalized',
            serviceId: transp.id,
            serviceName: transp.carrier_name ?? '',
            carrierName: transp.carrier_name ?? '',
            price: isFree ? 0 : Number(transp.price),
            isFreeShipping: isFree,
        };
    }

    if (prefix === 'me') {
        const me = input.carriers.find((c) => c.carrier_type === 'melhor_envio' && c.active);
        if (!me) return null;

        const result = await calculateMelhorEnvioShipping({
            carrierId: me.id,
            cepDestino: input.cepDestino,
            peso: input.dimensoes.weight,
            altura: input.dimensoes.height,
            largura: input.dimensoes.width,
            comprimento: input.dimensoes.length,
        });
        if (!result.success) return null;

        const svc = result.data.find((s) => String(s.serviceId) === String(rawId));
        if (!svc) return null;

        const isFree = !!me.free_shipping_from && Number(me.free_shipping_from) <= input.totalCarrinho;

        return {
            carrierId: me.id,
            carrierType: 'melhor_envio',
            serviceId: svc.serviceId,
            serviceName: svc.serviceName,   // "SEDEX", "PAC"...
            carrierName: svc.carrierName,   // "Correios", "Jadlog"...
            price: isFree ? 0 : Number(svc.price),
            isFreeShipping: isFree,
        };
    }

    return null;
}
