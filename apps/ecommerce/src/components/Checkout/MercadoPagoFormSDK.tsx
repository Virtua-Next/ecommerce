import React, { useRef, forwardRef, useImperativeHandle, useEffect, useState, useMemo, useCallback } from 'react';
import { initMercadoPago, Payment, getInstallments } from '@mercadopago/sdk-react';
import { useToast } from '@/components/ToastSystem';
import { SupportedLanguage } from '@/lib/types/generic';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';


export type MercadoPagoPayload =
    | {
        paymentMethodType: 'credit_card';
        token: string;
        issuer_id: string;
        payment_method_id: string;
        installments: number;
        transaction_amount: number;
        payer_identification: { type: string; number: string };
    }
    | {
        paymentMethodType: 'bank_transfer';
        payment_method_id: 'pix';
        transaction_amount: number;
    }
    | {
        paymentMethodType: 'ticket';
        payment_method_id: 'bolbradesco';
        transaction_amount: number;
        payer_identification: { type: string; number: string };
        payer_first_name?: string;
        payer_last_name?: string;
    };

interface Props {
    user: any
    publicKey: string;
    amount: number;
    installmentSale: boolean;
    maxInstallments: number;
    locale: SupportedLanguage;
    methodType: 'card' | 'pix' | 'boleto';
    setTotalWithFee: React.Dispatch<React.SetStateAction<number | null>>;
    setInstallmentPrice: React.Dispatch<React.SetStateAction<number | null>>;
    setQtyInstallmentsSelected: React.Dispatch<React.SetStateAction<number>>;
    billingAddress?: {
        zip: string;
        street: string;
        address_number: string;
        complement?: string;
        neighborhood: string;
        city: string;
        address_state: string;
    } | null;
}

declare global {
    interface Window {
        paymentBrickController?: {
            getFormData: () => Promise<{ formData: any }>;
            getAdditionalData: () => Promise<any>;
            update: (data: { amount: number }) => boolean | Promise<boolean>;
        };
    }
}

export const MercadoPagoFormSDK = forwardRef(function MercadoPagoFormSDK({
    user, publicKey, amount, installmentSale, maxInstallments, locale, methodType,
    setTotalWithFee, setInstallmentPrice, setQtyInstallmentsSelected, billingAddress
}: Props, ref) {
    const t = useTranslations('Checkout.MerdadopagoBrick');
    const { showAlert } = useToast();
    const [brickReady, setBrickReady] = useState(false);
    const { resolvedTheme } = useTheme();
    const paymentBrickTheme: 'default' | 'flat' | 'dark' | 'bootstrap' =
        resolvedTheme === 'dark' ? 'dark' : 'default';

    useEffect(() => {
        initMercadoPago(publicKey, { locale: locale === 'ja-JP' ? 'en-US' : locale });
    }, [publicKey, locale]);


    const paymentMethods = useMemo(() => {
        switch (methodType) {
            case 'card':
                return {
                    creditCard: 'all' as const,
                    minInstallments: 1,
                    maxInstallments: installmentSale ? (maxInstallments ?? 1) : 1,
                };
            case 'pix':
                return { bankTransfer: ['pix'] };
            case 'boleto':
                return { ticket: 'all' as const };
        }
    }, [methodType, installmentSale, maxInstallments]);

    const initialBillingAddressRef = useRef(billingAddress);
    useEffect(() => {
        if (!initialBillingAddressRef.current && billingAddress) {
            initialBillingAddressRef.current = billingAddress;
        }
    }, [billingAddress]);

    const initialAmount = useRef(amount);

    const initialization = useMemo(() => {
        const addr = initialBillingAddressRef.current;

        return {
            amount: initialAmount.current,
            payer: {
                email: user.email,
                ...(methodType === 'boleto' && addr
                    ? {
                        firstName: user.user_name?.split(' ')[0] ?? '',
                        lastName:
                            user.user_name?.split(' ').slice(1).join(' ') || user.user_name || '',
                        address: {
                            zipCode: addr.zip.replace(/\D/g, ''),
                            federalUnit: addr.address_state,
                            city: addr.city,
                            neighborhood: addr.neighborhood,
                            streetName: addr.street,
                            streetNumber: addr.address_number,
                            complement: addr.complement,
                        },
                    }
                    : {}),
            },
        };
    }, [user.email, user.user_name, methodType]);

    const customization = useMemo(() => {
        const defaultPaymentOption =
            methodType === 'card' ? { creditCardForm: true } :
                methodType === 'boleto' ? { ticketForm: true } :
                    methodType === 'pix' ? { bankTransferForm: true } :
                        undefined;

        return {
            paymentMethods,
            visual: {
                hidePaymentButton: true,
                hideFormTitle: true,
                style: { theme: paymentBrickTheme },
                ...(defaultPaymentOption ? { defaultPaymentOption } : {}),
            },
        };
    }, [paymentMethods, paymentBrickTheme, methodType]);

    useEffect(() => {
        if (!brickReady) return;
        try {
            Promise.resolve(window.paymentBrickController?.update({ amount }))
                .then((ok) => { if (ok === false) console.warn('Brick refused the new amount:', amount); })
                .catch(console.error);
        } catch (err) {
            console.error(err);
        }
    }, [amount, brickReady]);

    const onSubmit = useCallback(async () => { }, []);

    const onError = useCallback(async (error: any) => {
        if (error?.type === 'non_critical') return;

        console.error('Payment Brick error:', error);
        showAlert('warning', t('paymentProcessingError'));

    }, [showAlert]);

    const onReady = useCallback(async () => {
        setBrickReady(true);
    }, []);

    const quoteInstallments = async (base: number, installments: number) => {
        try {
            const additional = await window.paymentBrickController?.getAdditionalData();
            const bin = additional?.bin ?? additional?.additionalData?.bin;
            if (!bin) return null;

            const result: any = await getInstallments({ amount: String(base), locale, bin });
            const cost = result?.[0]?.payer_costs?.find((c: any) => Number(c.installments) === installments);
            if (!cost) return null;

            return { installmentAmount: Number(cost.installment_amount), total: Number(cost.total_amount) };
        } catch (err) {
            console.error('Error when querying installments:', err);
            return null;
        }
    };

    useImperativeHandle(ref, () => ({
        submit: async (): Promise<MercadoPagoPayload | null> => {
            const resetInstallments = () => {
                setQtyInstallmentsSelected(1);
                setTotalWithFee(null);
                setInstallmentPrice(null);
            };

            if (!brickReady || !window.paymentBrickController) {
                showAlert('warning', t('formNotReady'));
                return null;
            }

            try {
                const { formData } = await window.paymentBrickController.getFormData();

                if (!formData?.payment_method_id) {
                    showAlert('warning', t('selectPaymentMethod'));
                    return null;
                }

                if (formData.payment_method_id === 'pix') {
                    resetInstallments();
                    const payload: MercadoPagoPayload = {
                        paymentMethodType: 'bank_transfer',
                        payment_method_id: 'pix',
                        transaction_amount: formData.transaction_amount,
                    };

                    return payload;
                }

                if (formData.payment_method_id === 'bolbradesco') {
                    resetInstallments();
                    const payload: MercadoPagoPayload = {
                        paymentMethodType: 'ticket',
                        payment_method_id: 'bolbradesco',
                        transaction_amount: formData.transaction_amount,
                        payer_identification: {
                            type: formData.payer?.identification?.type,
                            number: formData.payer?.identification?.number,
                        },
                        payer_first_name: formData.payer?.first_name,
                        payer_last_name: formData.payer?.last_name,
                    };

                    return payload;
                }

                const installments = Number(formData.installments) || 1;
                const base = Number(formData.transaction_amount);

                const quote = installments > 1 ? await quoteInstallments(base, installments) : null;
                if (quote) {
                    setQtyInstallmentsSelected(installments);
                    setTotalWithFee(quote.total);
                    setInstallmentPrice(quote.installmentAmount);
                } else {
                    resetInstallments(); // 1x, ou consulta falhou: o resumo esconde a linha de parcelas
                }

                const payload: MercadoPagoPayload = {
                    paymentMethodType: 'credit_card',
                    token: formData.token,
                    issuer_id: formData.issuer_id,
                    payment_method_id: formData.payment_method_id,
                    installments,
                    transaction_amount: formData.transaction_amount,
                    payer_identification: {
                        type: formData.payer?.identification?.type,
                        number: formData.payer?.identification?.number,
                    },
                };
                return payload;
            } catch (error) {
                console.error('Erro ao obter dados do Payment Brick:', error);
                showAlert('warning', t('PaymentDataProcessingError'));
                return null;
            }
        },
    }));

    return (
        <div className="space-y-4">
            <Payment
                initialization={initialization}
                customization={customization}
                onSubmit={onSubmit}
                onError={onError}
                onReady={onReady}
                locale={locale}
            />
        </div>
    );
});
