import { createSystemSetup } from '@/lib/db/setup';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/lib/constants';
import { jsonNoStore } from '@/lib/utils';
import { revalidateTag } from 'next/cache';


export async function POST(request: Request) {
    try {
        const body = await request.json() as any;

        const { site_name, site_description, domain, currency, user_name, email, user_password } = body;

        const translations = {
            [DEFAULT_LANGUAGE]: {
                site_name,
                site_description: site_description ?? null,
            },
            ...SUPPORTED_LANGUAGES
                .filter(lang => lang !== DEFAULT_LANGUAGE)
                .reduce((acc, lang) => {
                    acc[lang] = {
                        site_name: '',
                        site_description: null,
                    };
                    return acc;
                }, {} as Record<string, any>),
        };

        const result = await createSystemSetup({ domain, currency, user_name, email, user_password, translations });

        if (!result.success) return jsonNoStore({ success: false, error: result.error, code: 'VALIDATION_ERROR' }, 500);

        revalidateTag('config', { expire: 0 });

        return jsonNoStore(result, 200);

    } catch (err: any) {
        console.error('POST setup route:', err);
        return jsonNoStore({ success: false, error: err.message, code: 'INTERNAL_ERROR' }, 500);
    }
}
