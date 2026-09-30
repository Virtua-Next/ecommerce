'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Link } from '@/i18n/navigation';
import { apiFetch, extractData } from "@/lib/utils";


type ConfirmState = 'idle' | 'loading' | 'success' | 'error';

export default function ConfirmComponent() {
    const t = useTranslations('ConfirmRegistration');
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [state, setState] = useState<ConfirmState>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleConfirm = async () => {
        if (!token) return;
        setState('loading');

        try {
            const result = await apiFetch('/api/auth/register/confirm', { method: 'POST', body: JSON.stringify({ token }) });
            extractData(result, 'object');
            setState('success');
        } catch (err: any) {
            setErrorMessage(err.message ?? t('genericError'));
            setState('error');
        }
    };

    if (!token) {
        return (
            <div className='flex flex-col gap-4 text-center'>
                <StatusIcon variant="error" />
                <h1 className="text-xl font-semibold">{t('missingTokenTitle')}</h1>
                <p className="text-secondary text-sm">{t('missingTokenDescription')}</p>
                <Link prefetch={false} href={{ pathname: '/register' }} className="text-sm underline underline-offset-4">
                    {t('backToSignup')}
                </Link>
            </div>
        );
    }

    if (state === 'success') {
        return (
            <div className='flex flex-col gap-4 text-center'>
                <StatusIcon variant="success" />
                <h1 className="text-xl font-semibold text-center">{t('successTitle')}</h1>
                <p className="text-secondary text-center text-sm">{t('successDescription')}</p>
                <Link prefetch={false} href={{ pathname: '/login' }} className="w-full">
                    <Button className="border border-border w-full bg-button hover:bg-buttonHover text-white">
                        {t('goToLogin')}
                    </Button>
                </Link>
            </div>
        );
    }

    if (state === 'error') {
        return (
            <div className='flex flex-col gap-4 text-center'>
                <StatusIcon variant="error" />
                <h1 className="text-xl font-semibold text-center">{t('errorTitle')}</h1>
                <p className="text-secondary text-center text-sm">{errorMessage}</p>
                <Link prefetch={false} href={{ pathname: '/register' }} className="text-sm underline underline-offset-4 text-center">
                    {t('backToSignup')}
                </Link>
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-4 text-center'>
            <h1 className="text-xl font-semibold text-center">{t('idleTitle')}</h1>
            <p className="text-secondary text-center text-sm">{t('idleDescription')}</p>
            <Button onClick={handleConfirm} disabled={state === 'loading'} className="border border-border w-full bg-button hover:bg-buttonHover text-white">{state === 'loading' ? t('confirming') : t('confirmButton')}</Button>
        </div>
    );
}

function StatusIcon({ variant }: { variant: 'success' | 'error' }) {
    if (variant === 'success') {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
    }
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
    );
}
