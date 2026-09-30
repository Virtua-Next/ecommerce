import { buildImageUrl } from '@/lib/utils';
import { getCachedConfig } from '@/lib/cache/config';
import Image from 'next/image';
import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { DEFAULT_LANGUAGE } from '@/lib/constants';


export async function Maintenance() {
    const t = await getTranslations('Maintenance');

    const locale = await getLocale();
    const efectiveLocale = locale ?? DEFAULT_LANGUAGE;

    const config = await getCachedConfig(efectiveLocale);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="bg-gray-800 p-6 text-center">
                    <div className='flex justify-end'>
                        <LanguageSwitcher />
                    </div>
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-700 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white">{t('maintenanceProgress')}</h1>
                </div>

                <div className="p-8 text-center">
                    <p className="text-gray-600 mb-8">{t('makingImprovements')}</p>
                    <div className="mb-8 flex justify-center">
                        {config?.light_logo ? (
                            <div className="rounded-full flex items-center justify-center">
                                <Image src={buildImageUrl(config?.cdn, config?.light_logo)} alt={config?.site_name ?? 'Online Shopping'} />
                            </div>
                        ) : (
                            <div className="bg-gray-100 p-2 rounded flex items-center justify-center">
                                <span className="text-gray-400 text-xs">{config?.site_name ?? 'Online Shopping'}</span>
                            </div>
                        )}
                    </div>

                    <Link prefetch={false} href={{ pathname: '/' }} className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg transition-colors duration-200">{t('backToHome')}</Link>
                </div>

                <div className="bg-gray-100 px-6 py-4 text-center">
                    <p className="text-xs text-gray-500">{t('appreciate')}</p>
                </div>
            </div>
        </div>
    );
}
