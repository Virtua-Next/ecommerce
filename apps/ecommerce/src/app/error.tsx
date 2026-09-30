'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_LANGUAGE } from '@/lib/constants';


export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
    const router = useRouter();

    useEffect(() => {
        router.replace(`/${DEFAULT_LANGUAGE}`);
    }, [router]);

    return (
        <html lang={DEFAULT_LANGUAGE}>
            <body>
                <div style={{ padding: 24, textAlign: 'center' }}>
                    Redirecting…
                </div>
            </body>
        </html>
    );
}
