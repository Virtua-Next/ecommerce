'use client';
import { useState } from 'react';
import Image from 'next/image';
import { PlaceholderImage } from '@/components/PlaceholderImage/PlaceholderImage';


export default function ImageWithFallback({ src, alt, fallbackComponent, ...props }: any) {
    const [error, setError] = useState(false);

    const hasValidSrc = src && typeof src === 'string' && src.trim() !== '';

    if (!hasValidSrc || error) {
        if (fallbackComponent) {
            return fallbackComponent;
        }
        return <PlaceholderImage size="md" className={props.className} />;
    }

    return (
        <Image {...props} src={src} alt={alt} onError={() => setError(true)} />
    );
}
