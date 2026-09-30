'use client';
import { useTranslations } from 'next-intl';

export default function PublicError({ error, reset }: { error: Error; reset: () => void }) {
    const t = useTranslations('PageError');
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
            <p className="text-lg text-gray-700 dark:text-gray-300">{t('errorMessage')}</p>
            <button onClick={reset} className="...">{t('tryAgainButton')}</button>
        </div>
    );
}