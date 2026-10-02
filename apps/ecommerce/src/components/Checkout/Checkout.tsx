'use client'
import { useTheme } from 'next-themes';
import { useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useConfig } from '@/context/ConfigContext';
import { FormEvent, useEffect, useState, useRef, useMemo } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import type { Appearance } from '@stripe/stripe-js';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { initializeStripe } from '@/components/Stripe/InitializeStripe';
import { CardForm } from '@/components/Stripe/CardForm';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Check, Loader2, TriangleAlert } from 'lucide-react';
import { Input } from '../ui/input';
import { AddressSelection } from './AddressSelection';
import { CarrierSelection } from './CarrierSelection';
import { formatPrice, buildImageUrl, extractData, apiFetch, parseNumber } from '@/lib/utils';
import { ICarrierTranslated, IShippingOption } from '@/lib/schemas/carrier';
import { IPaymentApi, IPaymentMethodTranslated } from '@/lib/schemas/payment';
import { MercadoPagoFormSDK, MercadoPagoPayload } from './MercadoPagoFormSDK';
import { ICON_MAP_PAYMENT } from '@/components/IconDropdown/IconDropdown';
import { FaArrowLeft, FaExclamationTriangle, FaRegTimesCircle } from 'react-icons/fa';
import ImageWithFallback from '@/components/ImageWithFallback/imageWithFallback';
import { PlaceholderImage } from '@/components/PlaceholderImage/PlaceholderImage';
import { useToast } from '@/components/ToastSystem'; import { DELIVERY_OPTIONS, PAYMENT_METHODS } from '@/lib/constants';
import { SupportedLanguage, SupportedPaymentMethods } from '@/lib/types/generic';
import { IUser } from '@/lib/schemas/user';
import PixPaymentModal from './PixPaymentModal';
import { CreateOrderInput } from '@/lib/db/order';
import { calculateOrderDimensions } from '@/lib/shipping/shipping';
import { loginHref } from '@/i18n/routing';


export default function Checkout() {
    const t = useTranslations('Checkout');
    const locale = useLocale() as SupportedLanguage;
    const { config, user } = useConfig();
    const [stripe, setStripe] = useState<Stripe | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const ORDER_METHODS = useMemo(() => PAYMENT_METHODS, []);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const cardFormRef = useRef<{ submit: () => void }>(null);
    const mercadoPagoRef = useRef<any>(null);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [selectedAddress, setSelectedAddress] = useState<any | null>(null);
    const [primaryAddress, setPrimaryAddress] = useState<any | null>(null);
    const [carriers, setCarriers] = useState<ICarrierTranslated[] | null>(null);
    const [selectedCarrier, setSelectedCarrier] = useState<IShippingOption | null>(null);
    const [pack, setPack] = useState<IShippingOption | null>(null);
    const { cart, total, validateCart, products, removeFromCart, clearCart, updateCart, updateQuantity } = useCart();
    const [activeStep, setActiveStep] = useState(1);
    const [deliveryMethodSelected, setDeliveryMethodSelected] = useState<'pickup' | 'delivery' | ''>('');
    const [availableMethods, setAvailableMethods] = useState<IPaymentMethodTranslated[]>([]);
    const [selectedMetodoApiId, setSelectedMetodoApiId] = useState<number | null>(null);
    const [paymentMethodSelected, setPaymentMethodSelected] = useState<SupportedPaymentMethods | ''>('');
    const [paymentApisAvailable, setPaymentApisAvailable] = useState<IPaymentApi[] | null>();
    const [installmentPrice, setInstallmentPrice] = useState<number | null>(null);
    const [qtyInstallmentsSelected, setQtyInstallmentsSelected] = useState(1);
    const [totalWithFee, setTotalWithFee] = useState<number | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const showConfirm = paymentMethodSelected && (paymentApisAvailable?.find(pay => pay.id === selectedMetodoApiId)?.api_provider !== 'stripe' || paymentApisAvailable?.find(pay => pay.id === selectedMetodoApiId)?.api_provider === 'stripe' && clientSecret);
    const [loadingCarriers, setLoadingCarriers] = useState(false);
    const { showAlert } = useToast();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const [pixModal, setPixModal] = useState<{
        barcode?: string;
        kind: 'pix' | 'boleto';
        qrCode?: string;
        qrCodeBase64?: string;
        ticketUrl?: string;
        expiresAt?: string | null;
        amount?: number;
    } | null>(null);
    const isDarkMode = mounted && resolvedTheme === 'dark';
    const appearance: Appearance = {
        theme: isDarkMode ? 'night' : 'stripe',
        variables: {
            colorText: isDarkMode ? '#D1D5DB' : '#374151',
            colorTextPlaceholder: isDarkMode ? '#CCC' : '#777'
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const [addressesData, methodsData, paymentApisData] = await Promise.all([
                    apiFetch('/api/user/address'),
                    apiFetch(`/api/payment/method?locale=${locale}`),
                    apiFetch(`/api/payment?locale=${locale}`),
                ]);

                // =========== ADDRESSES ============
                const listAddresses = extractData(addressesData, 'array') || [];
                setAddresses(listAddresses);

                if (listAddresses.length > 0) {
                    setPrimaryAddress(listAddresses[0])
                    setSelectedAddress(listAddresses.find((a: { address_primary: boolean }) => a.address_primary) || listAddresses[0])
                }
                // ======= PAYMENT METHODS =======
                const activeMethods = (extractData(methodsData, 'array') || [])
                    .filter((met: { active: any }) => Boolean(met?.active))
                    .sort((a: { method_type: string }, b: { method_type: string }) => {
                        const indexA = (ORDER_METHODS as readonly string[]).indexOf(a.method_type);
                        const indexB = (ORDER_METHODS as readonly string[]).indexOf(b.method_type);
                        return indexA - indexB;
                    });
                setAvailableMethods(activeMethods);

                // ======== PAYMENT APIS =========
                setPaymentApisAvailable(extractData(paymentApisData, 'array') || []);

            } catch (error: any) {
                console.error('Error loading checkout data:', error);
                showAlert('danger', t('alerts.errorLoadingData'));
            } finally {
                setLoading(false);
            }
        };

        loadData();

    }, [ORDER_METHODS, user, router]);

    const dimensoesPedido = calculateOrderDimensions(
        cart.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            return {
                length: product?.length,
                width: product?.width,
                height: product?.height,
                weight: product?.weight,
                quantity: item.quantity
            };
        })
    );

    const steps = [
        { id: 1, name: t('steps.info'), status: activeStep >= 1 ? 'current' : 'upcoming' },
        { id: 2, name: t('steps.delivery'), status: activeStep >= 2 ? 'current' : 'upcoming' },
        { id: 3, name: t('steps.payment'), status: activeStep >= 3 ? 'current' : 'upcoming' },
        { id: 4, name: t('steps.confirmation'), status: 'upcoming' }
    ]

    const getMetodosOrdenados = () => {
        return availableMethods.filter(met => met.method_type !== 'cash' || deliveryMethodSelected === 'pickup').sort((a, b) => ORDER_METHODS.indexOf(a.method_type) - ORDER_METHODS.indexOf(b.method_type));
    };

    const totalWithShipping = deliveryMethodSelected === 'delivery' && selectedCarrier ? total + parseNumber(pack?.price ?? '0') : total

    const verifyFreeShipping = async (newTotal: number) => {
        const MinFreeShipping = Number(
            carriers?.find(c => c.id === Number(selectedCarrier?.id))?.free_shipping_from
        ) || 0;

        const gotFreeShipping = newTotal >= MinFreeShipping;
        const lostFreeShipping = !gotFreeShipping && pack?.price !== pack?.originalPrice;

        if (!pack) return;

        if (gotFreeShipping) {
            setPack({
                ...pack,
                price: pack.price,
            });
        } else if (lostFreeShipping) {
            setPack({
                ...pack,
                price: pack.originalPrice,
            });
        }
    };

    // Verify stock before proceed checkout
    const verifyCart = async () => {
        const validatedItems = await validateCart(cart)
        const invalidItems = validatedItems.filter(item => !item.isValid)

        let updated = false;
        const updatedCart = cart.map(item => {
            const product = products.find(prod => prod.id === item.productId);
            if (!product) return item;

            if (item.quantity > (product.stock || 0)) {
                updated = true;

                return {
                    ...item,
                    quantity: product.stock || 0
                };
            }

            return item;
        });

        updateCart(updatedCart);
        if (invalidItems.length > 0 || updated) {
            showAlert('warning', t('alerts.cartUpdated'))
            setLoading(false)
            setPaymentMethodSelected('')
            return
        }
    }

    useEffect(() => {
        setConfirmed(false);
        setInstallmentPrice(null);
        setTotalWithFee(null);
        setQtyInstallmentsSelected(1);
        reviewedKey.current = null;
    }, [totalWithShipping, paymentMethodSelected, selectedMetodoApiId]);

    const reviewedKey = useRef<string | null>(null);
    const payloadKey = (p: MercadoPagoPayload) =>
        `${p.paymentMethodType}:${p.payment_method_id}:${'installments' in p ? p.installments : 1}:${p.transaction_amount}`;

    const handlePreparePayment = async () => {
        if (loading) return;

        // Passo 1: revisar
        if (!confirmed) {
            if (isMercadoPago) {
                if (!mercadoPagoRef.current) {
                    showAlert('warning', t('alerts.paymentMethodLoadError'));
                    return;
                }
                setLoading(true);
                try {
                    const payload = await mercadoPagoRef.current.submit();
                    if (!payload) return; // formulário inválido: fica no passo 1
                    reviewedKey.current = payloadKey(payload);
                } finally {
                    setLoading(false);
                }
            }
            // Stripe e offline (pix/boleto/cash/transfer): nada a revisar aqui,
            // o valor exibido já é o final
            setConfirmed(true);
            return;
        }

        // Passo 2: confirmar
        if (isMercadoPago) {
            if (!mercadoPagoRef.current) {
                showAlert('warning', t('alerts.paymentMethodLoadError'));
                return;
            }
            setLoading(true);
            const payload = await mercadoPagoRef.current.submit();
            if (!payload) { setLoading(false); return; }

            if (payloadKey(payload) !== reviewedKey.current) {
                reviewedKey.current = payloadKey(payload);
                setLoading(false);
                showAlert('info', t('alerts.paymentChangedReview'));
                setPaymentMethodSelected('')
                setConfirmed(false);
                return;
            }
            handleFinalizePurchase(undefined, payload); // liga e desliga o loading sozinho
        } else if (isStripe) {
            cardFormRef.current?.submit();
        } else {
            // pix/boleto/cash/transfer offline
            handleFinalizePurchase(undefined);
        }
    };

    const handleFinalizePurchase = async (e: FormEvent | undefined, mpData?: MercadoPagoPayload) => {
        try {
            e?.preventDefault();
            setLoading(true);
            await verifyCart();

            if (deliveryMethodSelected === '') {
                showAlert('warning', t('alerts.noDeliveryMethod'));
                setLoading(false);
                return;
            }
            if (paymentMethodSelected === '') {
                showAlert('warning', t('alerts.noPaymentMethod'));
                setLoading(false);
                return;
            }
            if (!DELIVERY_OPTIONS.includes(deliveryMethodSelected)) {
                showAlert('warning', t('alerts.invalidDeliveryMethod'));
                setLoading(false);
                return;
            }
            if (deliveryMethodSelected === 'delivery' && !selectedAddress) {
                showAlert('warning', t('alerts.selectDeliveryAddress'));
                setLoading(false);
                return;
            }
            if (deliveryMethodSelected === 'delivery' && !selectedCarrier) {
                showAlert('warning', t('alerts.selectCarrier'));
                setLoading(false);
                return;
            }
            if (paymentMethodSelected === 'cash' && deliveryMethodSelected !== 'pickup') {
                showAlert('warning', t('alerts.cashOnlyPickup'));
                setLoading(false);
                return;
            }
            if (paymentMethodSelected !== 'card' && parseNumber(qtyInstallmentsSelected) !== 1) {
                showAlert('warning', t('alerts.installmentsCardOnly'));
                setLoading(false);
                return;
            }
            if (isMercadoPago && !mpData) {
                showAlert('warning', t('alerts.paymentMethodLoadError'));
                setLoading(false);
                return;
            }

            const isMpCard = mpData?.paymentMethodType === 'credit_card';
            const installments = mpData
                ? (isMpCard ? Number(mpData.installments) || 1 : 1) // Pix e boleto: sempre à vista
                : qtyInstallmentsSelected;                            // Stripe e demais: state, como antes

            if (paymentMethodSelected !== 'card' && installments !== 1) {
                showAlert('warning', t('alerts.installmentsCardOnly'));
                setLoading(false);
                return;
            }

            const orderData: CreateOrderInput = {
                user_id: user?.id!,
                installments,
                delivery_option: deliveryMethodSelected,
                carrier_id: selectedCarrier?.carrierId,
                shipping_option: selectedCarrier?.id != null ? String(selectedCarrier.id) : undefined,  // id da opção cotada (vem do front, revalidada no backend)
                expected_shipping_value: selectedCarrier?.price ?? undefined,
                api_id: selectedMetodoApiId ?? undefined,
                address_id: selectedAddress?.id,
                payment_method: paymentMethodSelected,  // real: 'card' | 'pix' | 'boleto' | 'cash' | 'transfer'
                items: cart.map(item => ({
                    product_id: item.productId,
                    quantity: item.quantity,
                })),
            }
            let sent = false;
            if (isStripe) {
                const result = await apiFetch('/api/order', { method: 'POST', body: JSON.stringify(orderData) });
                const data = extractData(result, 'object');

                if (!data?.paymentInfo?.clientSecret) {
                    showAlert('warning', `${data?.paymentInfo?.msg || t('alerts.paymentConfigError')}`);
                    setLoading(false);
                    return;
                }

                const initStripe = initializeStripe();
                setStripe(await initStripe);
                setClientSecret(data.paymentInfo.clientSecret);
                setLoading(false);
                return;
            }

            if (isMercadoPago) {
                if (!mpData) { showAlert('warning', t('alerts.paymentMethodLoadError')); return; }

                switch (mpData.paymentMethodType) {

                    // -- card -- 
                    case 'credit_card': {
                        const cardData = {
                            token: mpData.token,
                            payment_method_id: mpData.payment_method_id,
                            payer_identification: mpData.payer_identification,
                        };
                        const result = await apiFetch('/api/order', {
                            method: 'POST',
                            body: JSON.stringify({
                                ...orderData,
                                cardData
                            })
                        });
                        const data = extractData(result, 'object');
                        const outcome = data?.paymentInfo?.outcome;

                        if (outcome === 'approved') {
                            showAlert('success', t('alerts.orderSuccess'));
                            sent = true;
                        } else if (outcome === 'pending') {
                            showAlert('info', t('alerts.mercadoPagoPending'));
                            sent = true;
                        } else {
                            const rejectionMessages = t.raw('mercadoPagoRejectionReasons') as Record<string, string>;
                            const reason = data?.paymentInfo?.statusDetail || 'cc_rejected_other_reason';
                            showAlert('warning', rejectionMessages[reason] || t('alerts.mercadopagoGenericDecline'));
                        }
                        break;
                    }

                    // -- pix --
                    case 'bank_transfer': {
                        const result = await apiFetch('/api/order', {
                            method: 'POST',
                            body: JSON.stringify({
                                ...orderData,
                                pixData: {
                                    payment_method_id: mpData.payment_method_id,
                                    transaction_amount: mpData.transaction_amount,
                                },
                            }),
                        });
                        const data = extractData(result, 'object');

                        const { qrCode, qrCodeBase64, ticketUrl, expiresAt } = data?.paymentInfo ?? {};

                        if (!qrCode && !qrCodeBase64) {
                            showAlert('warning', t('alerts.pixQrCodeError'));
                            break;
                        }

                        setPixModal({ qrCode, qrCodeBase64, ticketUrl, expiresAt, amount: data.totalValue, kind: 'pix' });
                        sent = true;
                        break;
                    }

                    // -- Boleto --
                    case 'ticket': {
                        const ticketData = {
                            payment_method_id: mpData.payment_method_id,
                            transaction_amount: mpData.transaction_amount,
                            payer_identification: mpData.payer_identification,
                            payer_first_name: mpData.payer_first_name,
                            payer_last_name: mpData.payer_last_name,
                        };

                        const result = await apiFetch('/api/order', {
                            method: 'POST',
                            body: JSON.stringify({ ...orderData, ticketData }),
                        });
                        const data = extractData(result, 'object');

                        const { ticketUrl, barcode, expiresAt } = data?.paymentInfo ?? {};

                        if (!ticketUrl) {
                            showAlert('warning', t('alerts.boletoGenerationError'));
                            break;
                        }

                        setPixModal({ ticketUrl, barcode, expiresAt, amount: data.totalValue, kind: 'boleto' });
                        sent = true;
                        break;
                    }
                }
            }

            if (isOffline) {
                if (paymentMethodSelected === 'cash' || paymentMethodSelected === 'transfer') {
                    const result = await apiFetch('/api/order', { method: 'POST', body: JSON.stringify(orderData) });

                    const data = extractData(result, 'object');
                    if (!data?.id) throw new Error(t('alerts.orderNotRegistered'));

                    showAlert('success', t('alerts.orderSuccess'));
                    sent = true;
                }
                if (paymentMethodSelected === 'pix') {
                    const result = await apiFetch('/api/order', { method: 'POST', body: JSON.stringify(orderData) });
                    const data = extractData(result, 'object');
                    if (!data?.id) throw new Error(t('alerts.orderNotRegistered'));

                    const { qrCode, qrCodeBase64, ticketUrl } = data?.paymentInfo ?? {};

                    setPixModal({
                        qrCode,
                        qrCodeBase64,
                        ticketUrl,
                        amount: data.baseValue,
                        kind: 'pix'
                    });
                    sent = true;
                }

            }

            if (sent) {
                setTimeout(() => clearCart(), 3000);
                setPaymentMethodSelected('');
                setSelectedAddress(null);
                setSelectedCarrier(null);
                setInstallmentPrice(null);
                setQtyInstallmentsSelected(1);
                return;
            }

            showAlert('danger', t('alerts.paymentProviderDetectFail'));

        } catch (error: any) {
            if (error.status === 401) {
                showAlert('warning', error.message);
                router.push(loginHref('/checkout'));
            }
            const rejectionMessages = t.raw('mercadoPagoRejectionReasons') as Record<string, string>;
            const reason = error.message || 'cc_rejected_other_reason';
            const defaultMessage = t('alerts.mercadoPagoGenericDecline');

            showAlert('warning', rejectionMessages[reason] || error.message || defaultMessage);
        }
        finally {
            setConfirmed(false);
            setLoading(false);
        }
    }

    const handleCardSubmit = async (stripe: Stripe, elements: StripeElements) => {
        if (!clientSecret) throw new Error(t('alerts.cardInitFail'))

        setLoading(true);
        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                clientSecret,
                confirmParams: {
                    return_url: `${window.location.origin}/checkout/confirm`,
                },
                redirect: 'if_required',
            });

            if (error) throw new Error(error.message);

            if (paymentIntent?.status === 'succeeded') {
                showAlert('success', t('alerts.orderSuccess'));
                setTimeout(() => {
                    clearCart();
                    setLoading(false);
                    setPaymentMethodSelected('');
                    setSelectedAddress(null);
                    setSelectedCarrier(null);
                }, 3000);

            } else if (paymentIntent?.status === 'processing') {
                // pix/boleto síncrono em processamento
                showAlert('success', t('alerts.orderProcessing'));
                clearCart();
                setLoading(false);
                setPaymentMethodSelected('');
                setSelectedAddress(null);
                setSelectedCarrier(null);

            } else if (paymentIntent.next_action?.type === 'boleto_display_details') {
                // boleto
                showAlert('success', t('alerts.orderSuccess'));
                clearCart();
                setLoading(false);
                setPaymentMethodSelected('');
                setSelectedAddress(null);
                setSelectedCarrier(null);

            } else {
                showAlert('warning', t('alerts.orderFinalizeError'));
                throw new Error(`Status inesperado: ${paymentIntent?.status}`);
            }

        } catch (error: any) {
            console.error('Erro ao finalizar pedido:', error);

            const rejectionMessages = t.raw('stripeCardErrors') as Record<string, string>;
            const reason = error?.raw?.code || error?.code || error?.message || 'generic_decline';
            const defaultMessage = t('alerts.stripeGenericDecline');

            showAlert('warning', rejectionMessages[reason] || defaultMessage);
        } finally {
            setLoading(false);
        }
    };

    const ICON_COLORS: Record<string, string> = {
        "BuildingColumns": "bg-white rounded-full p-2 text-indigo-600",
        "Amex": "bg-white rounded-full p-2 text-sky-600",
        "Flag": "bg-white rounded-full p-2 text-slate-500",
        "CreditCard": "bg-white rounded-full p-2 text-blue-600",
        "Globe": "bg-white rounded-full p-2 text-teal-500",
        "Pager": "bg-white rounded-full p-2 text-violet-500",
        "Qrcode": "bg-white rounded-full p-2 text-fuchsia-600",
        "MoneyBill": "bg-white rounded-full p-2 text-emerald-500",
        "HandHoldingDollar": "bg-white rounded-full p-2 text-green-600",
        "DinersClub": "bg-white rounded-full p-2 text-cyan-600",
        "Mastercard": "bg-white rounded-full p-2 text-orange-500",
        "Stripe": "bg-white rounded-full p-2 text-purple-600",
        "MoneyCheck": "bg-white rounded-full p-2 text-indigo-700",
        "Visa": "bg-white rounded-full p-2 text-blue-700",
    };

    const method = availableMethods.find((m) => m.api_id === selectedMetodoApiId && m.method_type === paymentMethodSelected);
    const api = paymentApisAvailable?.find((pay) => pay.id === method?.api_id);
    const isMercadoPago = api?.api_provider === 'mercadopago';
    const isStripe = api?.api_provider === 'stripe';
    const isOffline = api?.api_provider === 'offline';
    const installmentsEnable = Boolean(method?.installment_sale);
    const needsAddress = !primaryAddress && (deliveryMethodSelected === 'delivery' || paymentMethodSelected === 'boleto');
    const canSubmit = !loading && !needsAddress && (confirmed || total > 0);

    const selectedCountry = selectedAddress?.country_code;
    useEffect(() => {
        if (deliveryMethodSelected !== 'delivery' || !selectedCountry) {
            setCarriers([]);
            return;
        }

        let canceled = false;
        setLoadingCarriers(true);
        setSelectedCarrier(null);

        (async () => {
            try {
                const data = await apiFetch(`/api/carrier?locale=${locale}&country=${encodeURIComponent(selectedCountry)}`);
                if (canceled) return;
                const active = (extractData(data, 'array') || [])
                    .filter((c: { active: any }) => Boolean(c.active));
                setCarriers(active);
            } catch (error) {
                if (canceled) return;
                console.error('Error loading carriers:', error);
                setCarriers([]);
                showAlert('danger', t('alerts.errorLoadingData'));
            } finally {
                if (!canceled) setLoadingCarriers(false);
            }
        })();

        return () => { canceled = true };
    }, [deliveryMethodSelected, selectedCountry, locale]);




    const selectedMetodo = getMetodosOrdenados().find(
        (m) => m.api_id === selectedMetodoApiId && m.method_type === paymentMethodSelected
    );

    const discountPercent = selectedMetodo?.discount_percent ?? 0;

    const discountAmount = useMemo(() => {
        if (!discountPercent) return 0;
        return totalWithShipping * (discountPercent / 100);
    }, [totalWithShipping, discountPercent]);

    const totalWithDiscount = totalWithShipping - discountAmount;



    return (
        <div className="min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
                    <div className="hidden sm:block">
                        <nav className="flex items-center">
                            <ol className="flex items-center space-x-4 w-full">
                                {steps.map((step) => (
                                    <li key={step.id} className="flex-1">
                                        <div className={`group flex flex-col border-l-4 py-2 pl-4 ${step.status === 'current' ? 'border-button text-button' : 'border-button/60 text-button/60'}`}>
                                            <span className="text-sm font-medium">{step.name}</span>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-card shadow rounded-lg p-6">
                            {activeStep === 1 && (
                                <div className="space-y-6">
                                    <h2 className="text-lg font-medium">{t('accountInfo.heading')}</h2>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label htmlFor="nome" className="block text-sm font-medium mb-1">{t('accountInfo.name')}</label>
                                            <Input type="text" id="nome" readOnly className="w-full bg-bg border-border" value={user?.user_name ?? ''} />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium mb-1">{t('accountInfo.email')}</label>
                                        <Input type="email" id="email" readOnly className="w-full bg-bg border-border" value={user?.email ?? ''} />
                                    </div>

                                    <div>
                                        <label htmlFor="phone" className="block text-sm font-medium mb-1">{t('accountInfo.phone')}</label>
                                        <Input type="tel" id="phone" readOnly required className="w-full bg-bg border-border" value={user?.phone ?? ''} />
                                    </div>

                                    <div className="flex justify-end">
                                        <Button variant={'theme'} size={'default'} type="button" onClick={() => setActiveStep(2)}>{t('accountInfo.continue')}</Button>
                                    </div>
                                </div>
                            )}
                            {activeStep === 2 && (
                                <div className="space-y-6">
                                    <h2 className="text-lg font-medium">{t('deliveryOptions.heading')}</h2>
                                    <div className="space-y-4">
                                        {config?.in_store_pickup ? (
                                            <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${deliveryMethodSelected === 'pickup' ? 'border-primary bg-primary/5' : 'border-primary/30 hover:bg-hover/20'}`} onClick={() => setDeliveryMethodSelected('pickup')}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="font-medium">{t('deliveryOptions.pickupTitle')}</h3>
                                                        <p className="text-sm">{t('deliveryOptions.pickupDescription')}</p>
                                                    </div>
                                                    {deliveryMethodSelected === 'pickup' && <Check className="h-5 w-5 text-primary" />}
                                                </div>
                                            </div>
                                        ) : null}
                                        <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${deliveryMethodSelected === 'delivery' ? 'border-primary bg-primary/5' : 'border-primary/30 hover:bg-hover/20'}`} onClick={() => setDeliveryMethodSelected('delivery')}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-medium">{t('deliveryOptions.deliveryTitle')}</h3>
                                                    <p className="text-sm">{t('deliveryOptions.deliveryDescription')}</p>
                                                </div>
                                                {deliveryMethodSelected === 'delivery' && <Check className="h-5 w-5 text-primary" />}
                                            </div>
                                        </div>

                                    </div>

                                    {deliveryMethodSelected === 'delivery' ? (
                                        <div className="mt-6 space-y-4">
                                            {addresses.length > 0 && selectedAddress ? (
                                                <>
                                                    <AddressSelection addresses={addresses} selectedAddress={selectedAddress} setSelectedAddress={setSelectedAddress} setAddresses={setAddresses} user={user as any} />

                                                    {loadingCarriers ? (
                                                        <div className="flex justify-center py-4">
                                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                        </div>
                                                    ) : carriers && carriers.length > 0 ? (
                                                        <CarrierSelection config={config as any} enderecoSelecionado={selectedAddress} cart={cart} transportadoraSelecionada={selectedCarrier} setTransportadoraSelecionada={setSelectedCarrier} dimensoes={dimensoesPedido} setPacote={setPack} pacote={pack} transportadoras={carriers} />
                                                    ) : (
                                                        <div className="flex items-center bg-red-500/10 border border-red-500 p-2 rounded">
                                                            <TriangleAlert className="w-5 h-5 text-yellow-500" />
                                                            <span className="ml-2 text-sm">{t('deliveryOptions.noCarrier')}</span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {addresses.length > 0 ? (
                                                        <div className="flex items-center bg-red-500/10 border border-red-500 p-2 rounded">
                                                            <TriangleAlert className="w-5 h-5 text-yellow-500" />
                                                            <span className="ml-2 text-sm">{t('deliveryOptions.selectAddress')}</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center bg-red-500/10 border border-red-500 p-2 rounded">
                                                                <TriangleAlert className="w-5 h-5 text-yellow-500" />
                                                                <span className="ml-2 text-sm">{t('deliveryOptions.noAddress')}</span>
                                                            </div>
                                                            <AddressSelection addresses={addresses} selectedAddress={selectedAddress} setSelectedAddress={setSelectedAddress} setAddresses={setAddresses} user={user as any} />
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ) : null}


                                    <div className="flex justify-between items-center">
                                        <Button type="button" variant="outline" onClick={() => { setActiveStep(1); setPaymentMethodSelected(''); setSelectedMetodoApiId(null); setConfirmed(false); setDeliveryMethodSelected('') }} className="border-border gap-1 hover:bg-hover/30">
                                            <FaArrowLeft className='text-yellow' />
                                            {t('deliveryOptions.back')}
                                        </Button>
                                        {deliveryMethodSelected === 'pickup' || (deliveryMethodSelected === 'delivery' && selectedCarrier) ? (
                                            <Button type="button" onClick={async () => { await verifyCart(); setActiveStep(3) }} className="bg-button hover:bg-buttonHover text-white border border-border">{t('deliveryOptions.continueToPayment')}</Button>
                                        ) : null}
                                    </div>
                                </div>
                            )}
                            {activeStep === 3 && (
                                <div className="space-y-6">
                                    <h2 className="text-lg font-medium">{t('paymentMethod.heading')}</h2>
                                    <div className="space-y-4">
                                        {getMetodosOrdenados().length === 0 ? (
                                            <div className="flex justify-center items-center h-full gap-2 text-amber-500 dark:text-amber-400">
                                                <FaExclamationTriangle />
                                                <span>{t('paymentMethod.none')}</span>
                                            </div>
                                        ) : (
                                            getMetodosOrdenados().map((metodo) => (
                                                <div key={metodo.id} className={`border border-border rounded-lg p-4 cursor-pointer transition-colors ${selectedMetodoApiId === metodo.api_id && metodo.method_type === paymentMethodSelected ? 'border-primary bg-primary/5' : 'bg-primary/5 hover:bg-hover/30'}`} onClick={() => { setPaymentMethodSelected(metodo.method_type); setSelectedMetodoApiId(metodo.api_id); }}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="inline-flex items-center gap-2">
                                                            {metodo.icon && (() => {
                                                                const Icon = ICON_MAP_PAYMENT[metodo.icon];
                                                                const colorClass = ICON_COLORS[metodo.icon] ?? "text-gray-500";
                                                                return (
                                                                    <span className={colorClass}>
                                                                        <Icon className="h-5 w-5" />
                                                                    </span>
                                                                );
                                                            })()}
                                                            <div>
                                                                <h3 className="font-medium">{metodo.title}</h3>
                                                                <p className="text-sm font-light text-secondary">{metodo.method_description}</p>
                                                            </div>
                                                        </div>
                                                        {selectedMetodoApiId === metodo.api_id && metodo.method_type === paymentMethodSelected && (
                                                            <Check className="h-5 w-5 text-primary" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    {deliveryMethodSelected === 'pickup' && paymentMethodSelected === 'cash' ? (
                                        <div className="mt-6 p-4 rounded-lg">
                                            <p className="text-sm mb-4">{t('paymentMethod.pickupCashInfo1')}</p>
                                            <p className="text-xs">{t('paymentMethod.pickupCashInfo2')}</p>
                                        </div>
                                    ) : null}
                                    {(paymentMethodSelected === 'boleto' && !isMercadoPago && !isStripe) ? (
                                        <div className="mt-6 p-4 rounded-lg">
                                            <p className="text-sm mb-4">{t('paymentMethod.boletoInfo1')}</p>
                                            <p className="text-xs">{t('paymentMethod.boletoInfo2')}</p>
                                        </div>
                                    ) : null}
                                    {paymentMethodSelected === 'transfer' ? (
                                        <div className="mt-6 p-4 rounded-lg">
                                            <p className="text-sm mb-4">{t('paymentMethod.transferInfo1')}</p>
                                            <p className="text-xs">{t('paymentMethod.transferInfo2')}</p>
                                        </div>
                                    ) : null}
                                    {(paymentMethodSelected === 'pix' && !isMercadoPago && !isStripe) ? (
                                        <div className="mt-6 p-4 rounded-lg">
                                            <p className="text-sm mb-4">{t('paymentMethod.pixInfo1')}</p>
                                            <p className="text-xs">{t('paymentMethod.pixInfoOffline')}</p>
                                        </div>
                                    ) : null}

                                    <div className="mt-6 space-y-4">
                                        {isMercadoPago && (() => {
                                            if (needsAddress) {
                                                return (
                                                    <div className="flex flex-col justify-center gap-2">
                                                        <div className="flex justify-center items-center h-full gap-2 text-amber-500 dark:text-amber-400">
                                                            <FaExclamationTriangle />
                                                            <span>{t('paymentMethod.boletoNoAddress')}</span>
                                                        </div>
                                                        <Button size={'full'} variant={'theme'} onClick={() => router.push('/account/address')} >{t('paymentMethod.addAddress')}</Button>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <MercadoPagoFormSDK
                                                    key={paymentMethodSelected}
                                                    ref={mercadoPagoRef}
                                                    methodType={paymentMethodSelected as 'card' | 'pix' | 'boleto'}
                                                    user={user}
                                                    installmentSale={installmentsEnable}
                                                    maxInstallments={parseNumber(method?.max_installments)}
                                                    publicKey={String(api?.public_key ?? '')}
                                                    amount={totalWithDiscount}
                                                    locale={locale}
                                                    setQtyInstallmentsSelected={setQtyInstallmentsSelected}
                                                    setTotalWithFee={setTotalWithFee}
                                                    setInstallmentPrice={setInstallmentPrice}
                                                    billingAddress={primaryAddress}
                                                />
                                            );
                                        })()}
                                        {isStripe ? (
                                            clientSecret && stripe ? (
                                                <Elements stripe={stripe} options={{ clientSecret, appearance }}>
                                                    <CardForm user={user as IUser} selectedAddress={selectedAddress} onSubmit={handleCardSubmit} ref={cardFormRef} />
                                                </Elements>
                                            ) : (
                                                <Button className="w-full text-white bg-button hover:bg-buttonHover border border-border" onClick={handleFinalizePurchase} disabled={loading} type="button">
                                                    {loading ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            {t('paymentMethod.preparingPayment')}
                                                        </>
                                                    ) : paymentMethodSelected === 'card' ? t('paymentMethod.addCardData') : t('paymentMethod.addBoletoData')}
                                                </Button>
                                            )
                                        ) : null}
                                    </div>

                                    <div className="flex justify-between">
                                        <Button className='gap-1 border-border hover:bg-hover/30' type="button" variant="outline" onClick={() => { setActiveStep(2); setPaymentMethodSelected(''); setSelectedMetodoApiId(null); setConfirmed(false); }}>
                                            <FaArrowLeft className='text-yellow' />
                                            {t('deliveryOptions.back')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <div className="bg-card shadow rounded-lg p-6">
                            <h2 className="text-lg font-medium mb-6 text-center">{t('orderSummary.heading')}</h2>
                            <div className="space-y-4">
                                {cart.map(item => {
                                    const valorItem = item.price * item.quantity;
                                    const product = products.find(p => p.id === item.productId);
                                    return (
                                        <div key={item.productId} className="flex justify-between border-b border-border pb-4">
                                            <div className="flex items-center">
                                                <div className="relative w-16 h-16 rounded-md overflow-hidden mr-4 flex-shrink-0">
                                                    <ImageWithFallback src={config?.cdn ? buildImageUrl(config.cdn, item.image) : item.image} alt={item.name || 'No title'} className="object-cover rounded border border-border" width={80} height={80} fill={false} fallbackComponent={<PlaceholderImage size="sm" className="w-20 h-20 rounded border border-border" />} />
                                                    <span className="absolute -top-0 -right-0 bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{item.quantity}</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-medium">{item.name}</h3>
                                                    <div className="flex items-center mt-2">
                                                        <button disabled={item.quantity <= 1} className="cursor-pointer text-red-500 w-6 h-6 flex items-center justify-center border border-gray-300 rounded-l-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
                                                            onClick={() => {
                                                                const newQuantity = item.quantity - 1;
                                                                const novoTotal = total - item.price;
                                                                if (newQuantity > 0) {
                                                                    updateQuantity(item.productId, newQuantity);
                                                                    verifyFreeShipping(novoTotal);
                                                                }
                                                            }}
                                                        >
                                                            -
                                                        </button>
                                                        <input type="number" min="1" max={product?.stock} value={item.quantity} className="w-10 h-6 text-center border-t border-b border-gray-300 dark:bg-gray-800 dark:border-gray-600"
                                                            onChange={(e) => {
                                                                const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
                                                                const diff = (newQuantity - item.quantity) * item.price;
                                                                const newTotal = total + diff;
                                                                updateQuantity(item.productId, newQuantity);
                                                                verifyFreeShipping(newTotal);
                                                            }}
                                                        />
                                                        <button disabled={item.quantity >= Number(product?.stock)} className="cursor-pointer text-green-500 w-6 h-6 flex items-center justify-center border border-gray-300 rounded-r-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                                                            onClick={() => {
                                                                const newQuantity = item.quantity + 1;
                                                                const novoTotal = total + item.price;
                                                                if (product?.stock && newQuantity <= product.stock) {
                                                                    updateQuantity(item.productId, newQuantity);
                                                                    verifyFreeShipping(novoTotal);
                                                                }
                                                            }}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {item.quantity > 0 ? (
                                                    <>
                                                        <p className="font-medium">
                                                            <span className='text-sm'>{item.quantity} ×</span> {formatPrice(item.price, locale, config?.currency)}
                                                        </p>
                                                        <p className="text-sm text-primary/80 mt-1">
                                                            {formatPrice(valorItem, locale, config?.currency)}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-red-500 dark:text-red-400 font-semibold text-lg">{t('orderSummary.outOfStock')}</span>
                                                        <div className="flex items-center">
                                                            <button onClick={() => removeFromCart(item.productId)} className="flex items-center gap-2 px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-600/40 dark:hover:bg-red-600/60 rounded-md text-red-600 dark:text-red-400 cursor-pointer shadow-md transition-all duration-200" aria-label={t('orderSummary.removeAriaLabel')}>
                                                                <FaRegTimesCircle className="w-5 h-5" />
                                                                <span className="text-red-600 dark:text-red-400 font-semibold">{t('orderSummary.remove')}</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-6 space-y-3">
                                <div className="flex justify-between">
                                    <span>{t('orderSummary.subtotal')}</span>
                                    <span>{formatPrice(total, locale, config?.currency)}</span>
                                </div>
                                {deliveryMethodSelected === 'delivery' ? (
                                    <div className="flex justify-between">
                                        <span>{t('orderSummary.shipping')}</span>
                                        <span>
                                            {pack && selectedCarrier ? (
                                                selectedCarrier.isFreeShipping && Number(pack.price) > Number(carriers?.find(c => c.id === Number(selectedCarrier?.id))?.free_shipping_from) ? (
                                                    <span>{t('orderSummary.freeShipping')}</span>
                                                ) : (
                                                    <span>{formatPrice(Number(pack.price), locale, config?.currency)}</span>
                                                )
                                            ) : (
                                                <span>{t('orderSummary.shippingNotSelected')}</span>
                                            )}
                                        </span>
                                    </div>
                                ) : null}
                                {installmentPrice && qtyInstallmentsSelected > 1 ? (
                                    <div className='flex justify-between'>
                                        <span>{t('orderSummary.payment')}</span>
                                        <div>
                                            <span className='text-end'>{t('orderSummary.installments', { count: qtyInstallmentsSelected })}{' '}</span>
                                            <span>{formatPrice(installmentPrice, locale, config?.currency)}</span>
                                        </div>
                                    </div>
                                ) : null}
                                <div className="flex justify-between pt-3 border-t border-border">
                                    <span className="font-medium">{t('orderSummary.total')}</span>
                                    <span className="text-xl font-bold text-primary">{selectedCarrier || deliveryMethodSelected === 'pickup' ? formatPrice(installmentPrice ? totalWithFee! : totalWithDiscount, locale, config?.currency) : ''}</span>
                                </div>





                                {discountAmount > 0 && !installmentPrice && (
                                    <div className="flex justify-between text-green-600 dark:text-green-400">
                                        <span>{t('orderSummary.discount', { percent: discountPercent })}</span>
                                        <span>- {formatPrice(discountAmount, locale, config?.currency)}</span>
                                    </div>
                                )}






                            </div>
                            <div className="flex flex-col items-end mt-5 pt-5 gap-2">
                                {needsAddress && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 text-right">
                                        {t('orderSummary.addressRequired')}
                                    </p>
                                )}

                                {showConfirm && paymentMethodSelected && (
                                    <Button
                                        type="button"
                                        onClick={handlePreparePayment}
                                        disabled={!canSubmit}
                                        title={needsAddress ? t('orderSummary.addressRequired') : undefined}
                                        className={
                                            confirmed
                                                ? "text-white bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
                                                : "bg-button hover:bg-buttonHover border border-border"
                                        }
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {t(confirmed ? 'orderSummary.processing' : 'orderSummary.reviewing')}
                                            </>
                                        ) : (
                                            t(confirmed ? 'orderSummary.finish' : 'orderSummary.review')
                                        )}
                                    </Button>
                                )}
                            </div>



                            {isMercadoPago && paymentMethodSelected === 'card' && installmentsEnable && !confirmed && (
                                <p className="text-right text-xs text-muted-foreground">{t('orderSummary.reviewNote')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <PixPaymentModal
                locale={locale}
                config={config}
                open={!!pixModal}
                onClose={() => setPixModal(null)}
                qrCode={pixModal?.qrCode}
                barcode={pixModal?.barcode}
                kind={pixModal?.kind}
                qrCodeBase64={pixModal?.qrCodeBase64}
                ticketUrl={pixModal?.ticketUrl}
                expiresAt={pixModal?.expiresAt}
                amount={pixModal?.amount}
            />
        </div>
    )
}
