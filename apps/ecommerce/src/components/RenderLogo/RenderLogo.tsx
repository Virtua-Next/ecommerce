
'use client'
import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl';
import Image from 'next/image'
import { useConfig } from '@/context/ConfigContext'
import { buildImageUrl, isExternalUrl } from '@/lib/utils'
import { SupportedLanguage } from '@/lib/types/generic';


interface SiteLogoProps {
    lightLogo?: string
    darkLogo?: string
    className?: string
    logoWidth?: number
    logoHeight?: number
}

export default function RenderLogo({ className = '', logoWidth = 150, logoHeight = 50 }: SiteLogoProps) {
    const locale = useLocale();
    const { config } = useConfig();
    const [isLoading, setIsLoading] = useState(true)
    const translation = config?.translations?.[locale as SupportedLanguage]

    useEffect(() => {
        if (config) {
            setIsLoading(false)
        }
    }, [config])

    if (isLoading) {
        return (
            <div className={`w-32 h-10 bg-bg dark:bg-dark animate-pulse rounded ${className}`} />
        )
    }

    if (config?.light_logo && !config?.dark_logo) {
        return (
            <Image src={buildImageUrl(config.cdn, config.light_logo)} alt={translation?.site_name ?? config?.site_name ?? ''} width={logoWidth} height={logoHeight} className={className} unoptimized={isExternalUrl(config.light_logo)} priority />
        )
    }

    if (!config?.light_logo && config?.dark_logo) {
        return (
            <Image src={buildImageUrl(config.cdn, config.dark_logo)} alt={translation?.site_name ?? config?.site_name ?? ''} width={logoWidth} height={logoHeight} className={className} unoptimized={isExternalUrl(config.dark_logo)} priority />
        )
    }

    if (!config?.light_logo && !config?.dark_logo) {
        return (
            <h1 className={`text-xl font-bold dark:text-white ${className}`}>
                {translation?.site_name ?? config?.site_name}
            </h1>
        )
    }

    return (
        <div className={className}>
            <Image src={buildImageUrl(config.cdn, config.light_logo)} alt={translation?.site_name ?? config?.site_name ?? ''} width={logoWidth} height={logoHeight} className={`dark:hidden ${className}`} unoptimized={isExternalUrl(config.light_logo!)} priority />
            <Image src={buildImageUrl(config.cdn, config.dark_logo!)} alt={translation?.site_name ?? config?.site_name ?? ''} width={logoWidth} height={logoHeight} className={`hidden dark:block ${className}`} unoptimized={isExternalUrl(config.dark_logo!)} priority />
        </div>
    )
}
