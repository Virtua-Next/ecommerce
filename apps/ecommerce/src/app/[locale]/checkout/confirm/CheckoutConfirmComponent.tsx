'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { initializeStripe } from '@/components/Stripe/InitializeStripe';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/components/ToastSystem';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';


export default function CheckoutConfirmComponent() {
    const t = useTranslations('CheckoutConfirm');
    const searchParams = useSearchParams();
    const router = useRouter();
    const { clearCart } = useCart();
    const { showAlert } = useToast();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        const clientSecret = searchParams.get('payment_intent_client_secret');

        if (!clientSecret) {
            setStatus('error');
            return;
        }

        (async () => {
            const stripe = await initializeStripe();
            if (!stripe) {
                setStatus('error');
                return;
            }

            const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);

            if (error || !paymentIntent) {
                setStatus('error');
                return;
            }

            switch (paymentIntent.status) {

                case 'succeeded':
                    setStatus('success');
                    showAlert('success', t('alert.success'));
                    clearCart();
                    break;

                case 'processing':
                    setStatus('loading');
                    break;

                default:
                    setStatus('error');
                    showAlert('warning', t('alert.error'));
            }
        })();
    }, [searchParams]);

    if (status === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-lg text-primary">{t('loading.title')}</p>
                <p className="text-sm text-secondary">{t('loading.subtitle')}</p>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold">{t('success.title')}</h1>
                <p className="text-primary">{t('success.subtitle')}</p>
                <Button size={'lg'} variant={'theme'} onClick={() => router.push({ pathname: '/' })}>{t('success.button')}</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
            <h1 className="text-2xl font-bold">{t('error.title')}</h1>
            <p className="text-secondary">{t('error.subtitle')}</p>
            <div className="flex gap-3 mt-4">
                <Button size={'lg'} variant={'outline'} onClick={() => router.push({ pathname: '/' })}>{t('error.backButton')}</Button>
                <Button size={'lg'} variant={'theme'} onClick={() => router.push({ pathname: '/checkout' })}>{t('error.retryButton')}</Button>
            </div>
        </div>
    );
}
