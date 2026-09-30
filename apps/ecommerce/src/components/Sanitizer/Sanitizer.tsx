'use client';
import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';


export function Sanitize({ html }: { html: string }) {
    const [cleanHtml, setCleanHtml] = useState('');

    useEffect(() => {
        const sanitized = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: [
                'p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'u', 'a', 'img',
                'h1', 'h2', 'h3', 'div', 'span'
            ],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'style', 'class', 'target', 'rel']
        });

        const processedHtml = sanitized
            .replace(/<p><\/p>/g, '<p><br></p>')
            .replace(/(<p[^>]*>)\s*(<\/p>)/g, '$1<br>$2')
            .replace(/\n/g, '<br>');

        setCleanHtml(processedHtml);
    }, [html]);

    return (
        <div className="prose max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: cleanHtml }} />
    );
}
