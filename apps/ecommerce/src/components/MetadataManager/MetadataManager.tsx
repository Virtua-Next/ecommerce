'use client';
import { useConfig } from '@/context/ConfigContext';
import { useState, useEffect, useMemo } from 'react';
import { FaTrash, FaSave } from 'react-icons/fa';
import { buildImageUrl } from '@/lib/utils';
import { CreateMetadataRequestInput, IMetadataOutput, UpdateMetadataRequestInput, ILocalizedMetadataFields, MetadataFormState, EMPTY_FORM } from "@/lib/schemas/metadata";
import { LanguageTabs } from '@/components/LanguageTabs/LanguageTabs';
import ImageWithFallback from '@/components/ImageWithFallback/imageWithFallback';
import { PlaceholderImage } from '../PlaceholderImage/PlaceholderImage';
import { useTranslations, useLocale } from 'next-intl';
import { SUPPORTED_LANGUAGES } from '@/lib/constants'
import { useToast } from '@/components/ToastSystem';
import { SupportedLanguage } from '@/lib/types/generic'
import { Button } from '../ui/button';


interface MetadataManagerProps {
    targetType: string;
    targetId: number;
    initialMetadata?: IMetadataOutput | null;
    onSave: (metadata: CreateMetadataRequestInput | UpdateMetadataRequestInput) => Promise<boolean>;
    onDelete?: () => Promise<boolean>;
    setShowMetadataModal: any;
}

const NOTHING_TOUCHED: Record<SupportedLanguage, boolean> = SUPPORTED_LANGUAGES.reduce(
    (acc, lang) => ({ ...acc, [lang]: false }),
    {} as Record<SupportedLanguage, boolean>
);

export const MetadataManager = ({ targetType, targetId, initialMetadata, onSave, onDelete, setShowMetadataModal }: MetadataManagerProps) => {
    const t = useTranslations('MetadataManager');
    const { config } = useConfig();
    const locale = useLocale() as SupportedLanguage;
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<MetadataFormState>(EMPTY_FORM);
    const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>(locale);
    const [touchedLanguages, setTouchedLanguages] = useState<Record<SupportedLanguage, boolean>>(NOTHING_TOUCHED);
    const hasExistingMetadata = Boolean(initialMetadata?.id);
    const { showAlert } = useToast();

    const robotsOptions = [
        { value: 'index, follow', label: t('robotsOptions.indexFollow') },
        { value: 'noindex, nofollow', label: t('robotsOptions.noindexNofollow') },
        { value: 'index, nofollow', label: t('robotsOptions.indexNofollow') },
        { value: 'noindex, follow', label: t('robotsOptions.noindexFollow') },
        { value: 'none', label: t('robotsOptions.none') },
        { value: 'noarchive', label: t('robotsOptions.noarchive') },
        { value: 'nosnippet', label: t('robotsOptions.nosnippet') }
    ];

    useEffect(() => {
        if (initialMetadata) {
            const translations = { ...EMPTY_FORM.translations };
            const touched = { ...NOTHING_TOUCHED };

            for (const lang of SUPPORTED_LANGUAGES) {
                const fields = initialMetadata.translations?.[lang];
                if (fields) {
                    translations[lang] = {
                        title: fields.title ?? '',
                        metadata_description: fields.metadata_description ?? '',
                        keywords: fields.keywords ?? '',
                        og_title: fields.og_title ?? '',
                        og_description: fields.og_description ?? '',
                        x_title: fields.x_title ?? '',
                        x_description: fields.x_description ?? '',
                    };
                    touched[lang] = Boolean(fields.title);
                }
            }

            setForm({
                robots_directive: initialMetadata.robots_directive ?? 'index, follow',
                og_image: initialMetadata.og_image ?? '',
                x_image: initialMetadata.x_image ?? '',
                translations,
            });
            setTouchedLanguages(touched);
        }
    }, [initialMetadata]);

    const handleBaseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const updateLocalizedField = (lang: SupportedLanguage, field: keyof ILocalizedMetadataFields, value: string) => {
        setTouchedLanguages(prev => ({ ...prev, [lang]: true }));
        setForm(prev => {
            const translations = { ...prev.translations, [lang]: { ...prev.translations[lang], [field]: value } };
            for (const other of SUPPORTED_LANGUAGES) {
                if (other !== lang && !touchedLanguages[other]) {
                    translations[other] = { ...translations[other], [field]: value };
                }
            }
            return { ...prev, translations };
        });
    };

    const hasSavableContent = useMemo(
        () => SUPPORTED_LANGUAGES.some(lang => form.translations[lang].title),
        [form.translations]
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                target_type: targetType,
                target_id: targetId,
                robots_directive: form.robots_directive,
                og_image: form.og_image || null,
                x_image: form.x_image || null,
                translations: form.translations,
            };

            await onSave(payload)

        } catch (error: any) {
            console.error('Erro saving metadata:', error);
            showAlert('danger', error.message || t('alerts.saveError'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (confirm(t('deleteConfirm'))) {
            try {
                if (onDelete) {
                    await onDelete();
                    setForm(EMPTY_FORM);
                    setTouchedLanguages(NOTHING_TOUCHED);
                }
            } catch (error: any) {
                console.error('Erro ao excluir metadados:', error);
                showAlert('danger', error.message || t('alerts.deleteError'));
            }
        }
    };

    const currentFields = form.translations[activeLanguage];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold dark:font-normal">{t('title')}</h2>
                {hasExistingMetadata && onDelete && targetType !== 'config' && (
                    <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded flex items-center gap-1 text-sm">
                        <FaTrash className="h-3 w-3" /> {t('delete')}
                    </button>
                )}
            </div>

            <LanguageTabs active={activeLanguage} onChange={setActiveLanguage} incomplete={SUPPORTED_LANGUAGES.filter(l => !form.translations[l].title)} config={config!} />

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold dark:font-light border-t dark:border-gray-700 pt-4 pb-2">{t('seoBasic')}</h3>
                    <div>
                        <label className="block text-sm font-medium dark:font-extralight mb-1">{t('seoTitle')}</label>
                        <input type="text" name="title" value={currentFields.title ?? ''} onChange={(e) => updateLocalizedField(activeLanguage, 'title', e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700 dark:font-extralight" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium dark:font-extralight mb-1">{t('seoDescription')}</label>
                        <textarea name="metadata_description" value={currentFields.metadata_description ?? ''} onChange={(e) => updateLocalizedField(activeLanguage, 'metadata_description', e.target.value)} rows={4} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700 dark:font-extralight" />
                        <p className="text-xs text-gray-500 mt-1">{t('seoDescriptionMax')}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium dark:font-extralight mb-1">{t('seoKeywords')}</label>
                        <input type="text" name="keywords" value={currentFields.keywords ?? ''} onChange={(e) => updateLocalizedField(activeLanguage, 'keywords', e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700 dark:font-extralight" placeholder={t('seoKeywordsPlaceholder')} />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold dark:font-light border-t dark:border-gray-700 pt-4 pb-2">{t('generalConfig')} <span className="text-xs text-gray-500">{t('generalConfigCommon')}</span></h3>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:font-extralight">{t('robotsDirective')}</label>
                        <select name="robots_directive" value={form.robots_directive} onChange={handleBaseChange} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700 dark:font-extralight" required>
                            {robotsOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold dark:font-light border-t dark:border-gray-700 pt-4 pb-2">{t('openGraph')} <span className="text-xs text-gray-500">{t('openGraphPlatform')}</span></h3>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:font-extralight">{t('ogTitle')}</label>
                        <input type="text" name="og_title" value={currentFields.og_title ?? ''} onChange={(e) => updateLocalizedField(activeLanguage, 'og_title', e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700 dark:font-extralight" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:font-extralight">{t('ogDescription')}</label>
                        <textarea name="og_description" value={currentFields.og_description ?? ''} onChange={(e) => updateLocalizedField(activeLanguage, 'og_description', e.target.value)} rows={4} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700 dark:font-extralight" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:font-extralight">{t('ogImage')} <span className="text-xs text-gray-500">{t('ogImageCommon')}</span></label>
                        <input type="text" name="og_image" value={form.og_image} onChange={handleBaseChange} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700 dark:font-extralight" />
                        <div className="mt-2">
                            <p className="text-xs font-medium mb-1 dark:font-extralight">{t('preview')}</p>
                            {form.og_image && (
                                <ImageWithFallback src={buildImageUrl(config?.cdn, form.og_image)} alt={t('imageNotAvailable')} fallbackComponent={<PlaceholderImage size="sm" className="w-12 h-12" />} width={50} height={50} />
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold dark:font-light border-t dark:border-gray-700 pt-4 pb-2">{t('x')}</h3>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:font-extralight">{t('xTitle')}</label>
                        <input type="text" name="x_title" value={currentFields.x_title ?? ''} onChange={(e) => updateLocalizedField(activeLanguage, 'x_title', e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700 dark:font-extralight" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:font-extralight">{t('xDescription')}</label>
                        <textarea name="x_description" value={currentFields.x_description ?? ''} onChange={(e) => updateLocalizedField(activeLanguage, 'x_description', e.target.value)} rows={4} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700 dark:font-extralight" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:font-extralight">{t('xImage')} <span className="text-xs text-gray-500">{t('xImageCommon')}</span></label>
                        <input type="text" name="x_image" value={form.x_image} onChange={handleBaseChange} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700 dark:font-extralight" />
                        <div className="mt-2">
                            <p className="text-xs font-medium mb-1 dark:font-extralight">{t('preview')}</p>
                            {form.x_image && (
                                <ImageWithFallback src={buildImageUrl(config?.cdn, form.x_image)} alt={t('imageNotAvailable')} fallbackComponent={<PlaceholderImage size="sm" className="w-12 h-12" />} width={50} height={50} />
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 gap-2">
                    <Button variant={'outline'} size={'default'} type="button" onClick={() => setShowMetadataModal(false)}>
                        {t('cancel')}
                    </Button>
                    <Button variant={'theme'} size={'default'} type="submit" disabled={loading || !hasSavableContent}>
                        <FaSave className="h-4 w-4" />
                        {loading ? t('saving') : t('save')}
                    </Button>
                </div>
            </form>
        </div>
    );
};
