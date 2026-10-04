'use client';
import { useAdminConfig } from '@/context/AdminConfigContext';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { CreateMetadataRequestInput, IMetadataOutput, UpdateMetadataRequestInput } from '@/lib/schemas/metadata';
import { IConfig } from '@/lib/schemas/config';
import { buildImageUrl, extractData, apiFetch } from '@/lib/utils';
import { MetadataManager } from '@/components/MetadataManager/MetadataManager';
import { LanguageTabs } from '@/components/LanguageTabs/LanguageTabs';
import ImageWithFallback from '@/components/ImageWithFallback/imageWithFallback';
import { PlaceholderImage } from '@/components/PlaceholderImage/PlaceholderImage';
import { LANGUAGE_FLAGS, LANGUAGE_LABELS, SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES } from '@/lib/constants';
import { SupportedLanguage } from '@/lib/types/generic';
import { useRouter } from '@/i18n/navigation';
import { useToast } from '@/components/ToastSystem';
import { Button } from '@/components/ui/button';
import { FaSave } from 'react-icons/fa';
import { loginHref } from '@/i18n/routing';


const TARGET_TYPE = 'config';
const TARGET_ID = 1;

const NOTHING_TOUCHED: Record<SupportedLanguage, boolean> = SUPPORTED_LANGUAGES.reduce(
    (acc, lang) => ({ ...acc, [lang]: false }),
    {} as Record<SupportedLanguage, boolean>
);

type LocalizedConfigFields = { site_name: string; site_description: string };
type ConfigTranslations = Record<SupportedLanguage, LocalizedConfigFields>;

const EMPTY_TRANSLATIONS: ConfigTranslations = SUPPORTED_LANGUAGES.reduce(
    (acc, lang) => ({ ...acc, [lang]: { site_name: '', site_description: '' } }),
    {} as ConfigTranslations
);

const ConfigComponent = React.memo(function ConfigComponent() {
    const t = useTranslations('ConfigAdmin');
    const tCommon = useTranslations('AdminCatalog');
    const locale = useLocale() as SupportedLanguage;
    const { config, loading, setConfig } = useAdminConfig();
    const isMountedRef = useRef(true);
    const tabelaSiteRef = useRef<HTMLDivElement>(null);
    const [novoConfig, setNovoConfig] = useState<IConfig | null>(null);
    const [translations, setTranslations] = useState<ConfigTranslations>(EMPTY_TRANSLATIONS);
    const [translationsOriginal, setTranslationsOriginal] = useState<ConfigTranslations>(EMPTY_TRANSLATIONS);
    const [touchedLanguages, setTouchedLanguages] = useState<Record<SupportedLanguage, boolean>>(NOTHING_TOUCHED);
    const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>(locale);
    const [isEditing, setIsEditing] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [metadataLoading, setMetadataLoading] = useState(true);
    const [currentMetadata, setCurrentMetadata] = useState<IMetadataOutput | null>(null);
    const [showMetadataModal, setShowMetadataModal] = useState(false);
    const { showAlert } = useToast();
    const router = useRouter();

    useEffect(() => {
        if (config) {
            setNovoConfig(config);
            const initialTranslations = SUPPORTED_LANGUAGES.reduce((acc, lang) => ({
                ...acc,
                [lang]: {
                    site_name: (config as any).translations?.[lang]?.site_name ?? '',
                    site_description: (config as any).translations?.[lang]?.site_description ?? '',
                },
            }), {} as ConfigTranslations);

            setTranslations(initialTranslations);
            setTranslationsOriginal(initialTranslations);
            setTouchedLanguages(
                SUPPORTED_LANGUAGES.reduce(
                    (acc, lang) => ({ ...acc, [lang]: Boolean(initialTranslations[lang]?.site_name) }),
                    {} as Record<SupportedLanguage, boolean>
                )
            );
        }
    }, [config]);

    useEffect(() => {
        isMountedRef.current = true;
        const abortController = new AbortController();

        const carregarMetadados = async () => {
            try {
                setMetadataLoading(true);
                const data = await apiFetch(`/api/admin/metadata/${TARGET_TYPE}/${TARGET_ID}`, { method: 'GET', signal: abortController.signal });
                if (isMountedRef.current) {
                    setCurrentMetadata(extractData(data, 'object') as IMetadataOutput);
                }
            } catch (error: any) {
                if (error.name === 'AbortError' || !isMountedRef.current) return;

                if (error.status === 401 || error.status === 403) {
                    showAlert('danger', tCommon('sessionExpired'), () => {
                        router.push(loginHref('/admin/config/config-site'));
                    });
                } else {
                    console.error('Error loading config metadata', error);
                    showAlert(error.status === 400 || error.status === 404 ? 'warning' : 'danger', tCommon('loadError') ?? error.message);
                }
            } finally {
                if (isMountedRef.current) setMetadataLoading(false);
            }
        };

        if (!loading) carregarMetadados();

        return () => {
            isMountedRef.current = false;
            abortController.abort();
        };
    }, [loading, showAlert, tCommon, router]);

    const updateLocalizedField = useCallback((lang: SupportedLanguage, field: keyof LocalizedConfigFields, value: string) => {
        setTouchedLanguages(prev => ({ ...prev, [lang]: true }));
        setTranslations(prev => {
            const updated = { ...prev, [lang]: { ...prev[lang], [field]: value } };
            for (const other of SUPPORTED_LANGUAGES) {
                if (other !== lang && !touchedLanguages[other]) {
                    updated[other] = { ...updated[other], [field]: value };
                }
            }
            return updated;
        });
    }, [touchedLanguages]);

    const missingLanguages = useMemo(
        () => SUPPORTED_LANGUAGES.filter(lang => !translations[lang]?.site_name),
        [translations]
    );

    const handleInputChange = (field: keyof IConfig, value: any) => {
        if (!novoConfig) return;
        setNovoConfig({ ...novoConfig, [field]: value });
    };

    const handleEditSite = () => {
        setIsEditing(true);
        setActiveLanguage(locale);
        tabelaSiteRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCancel = () => {
        setIsEditing(false);
        setNovoConfig(config);
        setTranslations(translationsOriginal);
        setTouchedLanguages(
            SUPPORTED_LANGUAGES.reduce(
                (acc, lang) => ({ ...acc, [lang]: Boolean(translationsOriginal[lang]?.site_name) }),
                {} as Record<SupportedLanguage, boolean>
            )
        );
    };

    const handleSave = useCallback(async () => {
        if (!novoConfig) return;
        setSaveLoading(true);
        try {
            const payload = {
                ...novoConfig,
                maintenance: Boolean(novoConfig.maintenance),
                show_price: Boolean(novoConfig.show_price),
                new_address_checkout: Boolean(novoConfig.new_address_checkout),
                in_store_pickup: Boolean(novoConfig.in_store_pickup),
                products_per_page: Number(novoConfig.products_per_page),
                products_per_row: Number(novoConfig.products_per_row),
                translations,
            };

            const data = await apiFetch('/api/admin/config', { method: 'PATCH', body: JSON.stringify(payload) });
            const updatedConfig = extractData(data, 'object') as IConfig;

            if (isMountedRef.current) {
                setNovoConfig(updatedConfig);
                setConfig?.(updatedConfig);
                const updatedTranslations = (updatedConfig as any).translations ?? translations;
                setTranslations(updatedTranslations);
                setTranslationsOriginal(updatedTranslations);
                setIsEditing(false);
                showAlert('success', t('alerts.saveSuccess'));
            }

        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-site'));
                });
            } else if (error.status === 409) {
                showAlert('warning', t('alerts.noChanges') ?? error.message);
            } else {
                console.error('Error saving config', error);
                showAlert('danger', t('alerts.saveError') ?? error.message);
            }
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [novoConfig, translations, setConfig, showAlert, t, tCommon, router]);

    const handleSaveMetadata = useCallback(async (metadata: CreateMetadataRequestInput | UpdateMetadataRequestInput) => {
        setSaveLoading(true);
        try {
            const result = await apiFetch(`/api/admin/metadata/${TARGET_TYPE}/${TARGET_ID}`, { method: 'PUT', body: JSON.stringify(metadata) });

            if (isMountedRef.current) {
                setCurrentMetadata(extractData(result, 'object') as IMetadataOutput);
                setShowMetadataModal(false);
                showAlert('success', tCommon('metadataSaved'));
            }
            return true;
        } catch (error: any) {
            if (!isMountedRef.current) return false;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-site'));
                });
            } else {
                console.error('Error saving config metadata', error);
                showAlert('danger', tCommon('metadataSaveError') ?? error.message);
            }
            return false;
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [showAlert, tCommon, router]);

    const handleDeleteMetadata = useCallback(async () => false, []);

    const getFieldLabel = (key: string) => t(`fieldLabels.${key}`) || key;

    const renderFlag = (code: string) => {
        const lang = LANGUAGE_FLAGS.find((l) => l.code === code);
        return lang
            ? <lang.Flag key={code} title={lang.label} className="h-4 w-6 rounded-sm" />
            : <span key={code}>{code}</span>;
    };

    const formatValue = (value: any, key: string) => {
        if (value === null || value === undefined || value === '') return t('none');
        if (['maintenance', 'show_price', 'new_address_checkout', 'in_store_pickup'].includes(key)) {
            return value ? t('yes') : t('no');
        }
        if (key === 'default_language') {
            return renderFlag(String(value));
        }
        if (key === 'enabled_languages') {
            const codes: string[] = Array.isArray(value)
                ? value
                : String(value).split(',').map((s) => s.trim()).filter(Boolean);
            return <span className="flex items-center gap-2">{codes.map(renderFlag)}</span>;
        }
        return value;
    };

    const isTranslatedField = (key: string) => key === 'site_name' || key === 'site_description';

    const enabledLanguages: string[] = (() => {
        try {
            const raw = novoConfig?.enabled_languages;
            if (!raw) return [];
            return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
            return [];
        }
    })();

    const toggleLanguage = (langCode: SupportedLanguage) => {
        const isRemoving = enabledLanguages.includes(langCode);
        const updated = isRemoving
            ? enabledLanguages.filter((l) => l !== langCode)
            : [...enabledLanguages, langCode];

        // Não deixa remover o último idioma
        if (updated.length === 0) return;

        handleInputChange('enabled_languages' as keyof IConfig, updated as any);

        // Se o default caiu fora, joga pro primeiro habilitado
        if (!updated.includes(novoConfig?.default_language as SupportedLanguage)) {
            handleInputChange('default_language' as keyof IConfig, updated[0] as any);
        }
    };

    const currencyNames = new Intl.DisplayNames([locale], { type: 'currency' });

    if (loading || metadataLoading || !novoConfig) return <div className="p-6">{tCommon('loading')}</div>;

    if (!config) return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">{t('pageTitle')}</h1>
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <p>{t('configError')}</p>
            </div>
        </div>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold ml-3">{t('pageTitle')}</h1>
                <div ref={tabelaSiteRef} className="flex gap-2">
                    {isEditing ? (
                        <>
                            <Button variant={'outline'} size={'default'} onClick={handleCancel}>{tCommon('cancel')}</Button>
                            <Button variant={'theme'} size={'default'} onClick={handleSave} disabled={saveLoading} className="mr-3">
                                <FaSave className="h-4 w-4 mx-1" />
                                {saveLoading ? tCommon('saving') : tCommon('save')}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button size={'default'} onClick={handleEditSite} className="mr-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{t('editConfig')}</Button>
                            <Button size={'default'} onClick={() => { setShowMetadataModal(true); }} className="mr-3 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">{t('editMetadata')}</Button>
                        </>
                    )}
                </div>
            </div>

            {isEditing && (
                <div className="mb-4">
                    <LanguageTabs active={activeLanguage} onChange={setActiveLanguage} incomplete={missingLanguages} config={config} />
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-8">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-600">{tCommon('title')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{tCommon('description')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {Object.entries(novoConfig).filter(([key]) => key !== 'id' && key !== 'translations').map(([key, value]) => (
                            <tr key={key}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white w-5 border-r dark:border-gray-700">
                                    {getFieldLabel(key)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                    {isEditing ? (
                                        isTranslatedField(key) ? (
                                            <div className="space-y-2">
                                                {SUPPORTED_LANGUAGES.map(lang => (
                                                    <div key={lang} className="flex items-center gap-2">
                                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-12">{lang}</span>
                                                        <input type="text" className="flex-1 p-2 border dark:border-gray-700 rounded text-sm" value={translations[lang]?.[key as keyof LocalizedConfigFields] ?? ''} onChange={(e) => updateLocalizedField(lang, key as keyof LocalizedConfigFields, e.target.value)} />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : key.includes('logo') || key.includes('favicon') ? (
                                            <div className="flex flex-col gap-2">
                                                <input type="text" className="w-full p-2 border dark:border-gray-700 rounded" value={String(novoConfig[key as keyof IConfig] ?? '')} onChange={(e) => handleInputChange(key as keyof IConfig, e.target.value)} placeholder={novoConfig.cdn ? `${novoConfig.cdn}/path/to/image.png` : t('urlPlaceholder')} />
                                                <ImageWithFallback src={buildImageUrl(novoConfig.cdn, novoConfig[key as keyof IConfig] as string)} alt={String(novoConfig[key as keyof IConfig] ?? tCommon('imageNotAvailable'))} fallbackComponent={<PlaceholderImage size="sm" className={key.includes('favicon') ? 'w-8' : 'h-12 w-12'} />} className={key.includes('favicon') ? 'w-8' : 'h-12 w-12'} width={50} height={50} />
                                            </div>
                                        ) : ['maintenance', 'show_price', 'new_address_checkout', 'in_store_pickup'].includes(key) ? (
                                            <select className="w-full p-2 border dark:border-gray-700 rounded" value={novoConfig[key as keyof IConfig] ? '1' : '0'} onChange={(e) => handleInputChange(key as keyof IConfig, e.target.value === '1')}>
                                                <option value="1">{t('yes')}</option>
                                                <option value="0">{t('no')}</option>
                                            </select>
                                        ) : key === 'theme' || key === 'domain' ? (
                                            <span>{String(value) || t('none')}</span>
                                        ) : key === 'default_language' ? (
                                            <div role="radiogroup" className="flex flex-wrap gap-4 p-3 border dark:border-gray-700 rounded">
                                                {LANGUAGE_FLAGS.filter((l) => enabledLanguages.includes(l.code)).map(({ code, label, Flag }) => (
                                                    <label key={code} className="flex items-center gap-2 cursor-pointer select-none">
                                                        <input
                                                            type="radio"
                                                            name="default_language"
                                                            value={code}
                                                            checked={novoConfig.default_language === code}
                                                            onChange={() => handleInputChange('default_language' as keyof IConfig, code)}
                                                            className="w-4 h-4 cursor-pointer"
                                                        />
                                                        <Flag className="h-4 w-6 rounded-sm" />
                                                        <span>{label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : key === 'enabled_languages' ? (
                                            <div className="flex flex-wrap gap-4 p-3 border dark:border-gray-700 rounded">
                                                {LANGUAGE_FLAGS.map(({ code, label, Flag }) => (
                                                    <label
                                                        key={code}
                                                        className="flex items-center gap-2 cursor-pointer select-none"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={enabledLanguages.includes(code)}
                                                            onChange={() => toggleLanguage(code)}
                                                            className="w-4 h-4 cursor-pointer"
                                                        />
                                                        <Flag className="h-4 w-6 rounded-sm" />
                                                        <span>{label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : key === 'currency' ? (
                                            <div role="radiogroup" className="flex flex-wrap gap-4 p-3 border dark:border-gray-700 rounded">
                                                {SUPPORTED_CURRENCIES.map((code) => (
                                                    <label key={code} className="flex items-center gap-2 cursor-pointer select-none">
                                                        <input
                                                            type="radio"
                                                            name="currency"
                                                            value={code}
                                                            checked={novoConfig.currency === code}
                                                            onChange={() => handleInputChange('currency' as keyof IConfig, code)}
                                                            className="w-4 h-4 cursor-pointer"
                                                        />
                                                        <span className="font-medium">{code}</span>
                                                        <span className="text-gray-500">{currencyNames.of(code)}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <input type="text" className="w-full p-2 border dark:border-gray-700 rounded" value={String(novoConfig[key as keyof IConfig] ?? '')} onChange={(e) => handleInputChange(key as keyof IConfig, e.target.value)} />
                                        )
                                    ) : (
                                        isTranslatedField(key) ? (
                                            <span>{translations[locale]?.[key as keyof LocalizedConfigFields] || formatValue(value, key)}</span>
                                        ) : key.includes('logo') || key.includes('favicon') ? (
                                            <ImageWithFallback src={buildImageUrl(novoConfig.cdn, value as string)} alt={String(value ?? tCommon('imageNotAvailable'))} fallbackComponent={<PlaceholderImage size="sm" className={key.includes('favicon') ? 'w-8' : 'h-12 w-12'} />} className={key.includes('favicon') ? 'w-8' : 'h-12 w-12'} width={50} height={50} />
                                        ) : (
                                            formatValue(value, key)
                                        )
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showMetadataModal && currentMetadata && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold dark:font-normal">{tCommon('metadataOf', { title: t('pageTitle') })}</h2>
                            <button onClick={() => setShowMetadataModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">&times;</button>
                        </div>
                        <MetadataManager targetType={TARGET_TYPE} targetId={TARGET_ID} onSave={handleSaveMetadata} onDelete={handleDeleteMetadata} initialMetadata={currentMetadata} setShowMetadataModal={setShowMetadataModal} />
                    </div>
                </div>
            )}
        </div>
    );
});

export default ConfigComponent;
