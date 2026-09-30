'use client';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { useConfig } from '@/context/ConfigContext';


export default function GoogleAnalytics() {
    const [analyticsId, setAnalyticsId] = useState<string | undefined>(undefined);
    const { config } = useConfig();

    useEffect(() => {
        if (config) {
            setAnalyticsId(config.google_analytics as string)
        }
    }, [config])

    if (!analyticsId) return null

    return (
        <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`} strategy="afterInteractive" />
            <Script
                id="gtag-init"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
						window.dataLayer = window.dataLayer || [];
						function gtag(){dataLayer.push(arguments);}
						gtag('js', new Date());
						gtag('config', '${analyticsId}');
					`,
                }}
            />
        </>
    );
}
