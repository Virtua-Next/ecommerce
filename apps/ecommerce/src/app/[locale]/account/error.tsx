'use client';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';


export default function PublicError({ error, reset }: { error: Error; reset: () => void }) {
    const t = useTranslations('PageError');

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
            <p className="text-lg text-gray-700 dark:text-gray-300">
                {t('errorMessage')}
            </p>
            <Button variant={'theme'} size={'default'} onClick={reset}>
                {t('tryAgainButton')}
            </Button>
        </div>
    );
}
