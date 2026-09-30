'use client';
import { Check } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatPrice, resolveApiErrorKey } from '@/lib/utils';
import { useToast } from '@/components/ToastSystem';
import { ICarrierTranslated, IShippingOption } from '@/lib/schemas/carrier';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { DEFAULT_CURRENCY, DEFAULT_LANGUAGE } from '@/lib/constants';
import { IConfig } from '@/lib/schemas/config';
import { buildShippingOptions } from '@/lib/shipping/shipping';


interface CarrierSelectionProps {
    config: IConfig;
    enderecoSelecionado: any;
    transportadoraSelecionada: IShippingOption | null;
    transportadoras: ICarrierTranslated[];
    cart: any[];
    setTransportadoraSelecionada: (t: IShippingOption | null) => void;
    setPacote: (p: IShippingOption | null) => void;
    pacote: IShippingOption | null;
    dimensoes: { length: number; width: number; height: number; weight: number };
}

export const CarrierSelection = ({ config, enderecoSelecionado, transportadoraSelecionada, transportadoras, cart, setTransportadoraSelecionada, dimensoes, setPacote }: CarrierSelectionProps) => {
    const t = useTranslations('CarrierSelection');
    const [fretes, setFretes] = useState<IShippingOption[]>([]);
    const [loading, setLoading] = useState(false);
    const locale = useLocale();
    const { showAlert } = useToast();

    const totalCarrinho = useMemo(
        () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
        [cart]
    );

    const buscarFrete = useCallback(async () => {
        if (!enderecoSelecionado?.zip || cart.length === 0) return;
        setLoading(true);

        try {
            const melhorEnvio = transportadoras.find((tr) => tr.carrier_type === 'melhor_envio' && tr.active);

            let melhorEnvioServices: any[] = [];
            if (melhorEnvio) {
                const response = await fetch('/api/melhor-envio/services', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cepDestino: enderecoSelecionado.zip,
                        peso: dimensoes.weight,
                        altura: dimensoes.height,
                        largura: dimensoes.width,
                        comprimento: dimensoes.length,
                        transportadora: melhorEnvio,
                    }),
                });

                const { success, error, code, data } = (await response.json()) as any;
                if (!success) {
                    const key = resolveApiErrorKey(code);
                    showAlert('warning', key ? t(`errors.${key}`) : error);
                    return;
                }
                melhorEnvioServices = data;
            }

            const options = buildShippingOptions({
                melhorEnvioCarrier: melhorEnvio,
                melhorEnvioServices,
                transportadoras,
                totalCarrinho,
                locale,
                customQuoteLabel: t('customQuote'),
            });

            setFretes(options);

        } catch (error: any) {
            showAlert('warning', error.message || t('errors.genericFailure'));
        } finally {
            setLoading(false);
        }
        
    }, [enderecoSelecionado?.zip, totalCarrinho, dimensoes.weight, dimensoes.height, dimensoes.width, dimensoes.length, transportadoras, cart.length, t, locale, showAlert]);

    useEffect(() => {
        buscarFrete();
        setTransportadoraSelecionada(null);
        setPacote(null);
    }, [enderecoSelecionado?.cep, buscarFrete, setPacote, setTransportadoraSelecionada]);

    const handleSelecionarFrete = (id: string) => {
        const frete = fretes.find((f) => f.id === id);
        if (!frete) return;
        setTransportadoraSelecionada(frete);
        setPacote(frete);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <div className="animate-spin h-10 w-10 border-t-2 border-border rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('title')}</h3>

            {fretes.length === 0 && <p className="text-sm">{t('empty')}</p>}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {fretes.map((frete) => (
                    <div
                        key={frete.id}
                        onClick={() => handleSelecionarFrete(frete.id)}
                        className={`border rounded-lg p-4 shadow-sm transition-all duration-200 cursor-pointer ${transportadoraSelecionada?.id === frete.id
                            ? 'border-primary g-hover/30'
                            : 'border-border hover:bg-hover/30'
                            }`}
                    >
                        <div className="flex justify-between mb-2">
                            <span className="font-medium">{frete.serviceName}</span>
                            {transportadoraSelecionada?.id === frete.id && (
                                <Check className="w-5 h-5 text-primary" />
                            )}

                            {frete.carrierType === 'personalized' ? (
                                <span className="py-0.5 rounded-full bg-red-600 text-center w-20">
                                    <span className="text-white font-bold text-sm">
                                        {frete.carrierName}
                                    </span>
                                </span>
                            ) : (
                                <span className="px-2 py-1 rounded-full bg-white w-20">
                                    {frete.logo && (
                                        <Image src={frete.logo} alt={frete.carrierName} width={50} height={50} />
                                    )}
                                </span>
                            )}
                        </div>

                        <div className="text-sm">
                            <p>
                                {t('price')}{': '}
                                <strong>
                                    {frete.price === 0
                                        ? t('freeShipping')
                                        : formatPrice(
                                            frete.price,
                                            locale || DEFAULT_LANGUAGE,
                                            config?.currency || DEFAULT_CURRENCY
                                        )}
                                </strong>
                            </p>
                            <p>
                                {t('deliveryTime')}: {frete.time}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
