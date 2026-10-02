'use client';
import { useAdminConfig } from '@/context/AdminConfigContext';
import slugify from 'slugify';
import { FaPencilAlt, FaTrash, FaPlus, FaEyeSlash, FaEye, FaTags, FaEllipsisV, FaSave } from 'react-icons/fa';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { CreateMetadataRequestInput, IMetadataOutput, UpdateMetadataRequestInput } from '@/lib/schemas/metadata';
import { buildImageUrl, extractData, apiFetch, stripHtmlToText } from '@/lib/utils';
import { TiptapEditor } from "@/components/TiptapEditor/TiptapEditor";
import TableBuilder from "@/components/TableBuilder/TableBuilder";
import { MetadataManager } from '@/components/MetadataManager/MetadataManager';
import { LanguageTabs } from '@/components/LanguageTabs/LanguageTabs';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/lib/constants'
import { SupportedLanguage } from '@/lib/types/generic'
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import AdminSearch from "@/components/Features/admin-search";
import ImageWithFallback from '@/components/ImageWithFallback/imageWithFallback';
import { IPageTranslated, PageFormState, EMPTY_FORM, LocalizedPageFields } from '@/lib/schemas/page';
import { PlaceholderImage } from '@/components/PlaceholderImage/PlaceholderImage';
import { useRouter, Link } from '@/i18n/navigation'
import { useToast } from '@/components/ToastSystem';
import { Button } from '@/components/ui/button';
import { loginHref } from '@/i18n/routing';


const TARGET_TYPE = 'page';

const NOTHING_TOUCHED: Record<SupportedLanguage, boolean> = SUPPORTED_LANGUAGES.reduce(
    (acc, lang) => ({ ...acc, [lang]: false }),
    {} as Record<SupportedLanguage, boolean>
);

const PageComponent = React.memo(function PageComponent() {
    const t = useTranslations('PageAdmin');
    const tCommon = useTranslations('AdminCatalog');
    const locale = useLocale() as SupportedLanguage;
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const { config, loading } = useAdminConfig();
    const [pages, setPages] = useState<IPageTranslated[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showMetadataModal, setShowMetadataModal] = useState(false);
    const [currentMetadata, setCurrentMetadata] = useState<IMetadataOutput | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState<PageFormState>(EMPTY_FORM);
    const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
    const [, setEditorImages] = useState<string[]>([]);
    const { searchTerm } = useGlobalSearch();
    const [touchedLanguages, setTouchedLanguages] = useState<Record<SupportedLanguage, boolean>>(NOTHING_TOUCHED);
    const isMountedRef = useRef(true);
    const { showAlert } = useToast();
    const router = useRouter();

    useEffect(() => {
        isMountedRef.current = true;
        const abortController = new AbortController();
        const fetchPages = async () => {
            try {
                const pages: IPageTranslated[] = await apiFetch(`/api/admin/page?locale=${locale}`, { method: 'GET', signal: abortController.signal });

                if (isMountedRef.current) {
                    setPages(extractData(pages, 'array') || []);
                }

            } catch (error: any) {
                if (error.name === 'AbortError' || !isMountedRef.current) return;

                if (error.status === 401 || error.status === 403) {
                    showAlert('danger', tCommon('sessionExpired'), () => {
                        router.push(loginHref('/admin/page'));
                    });
                } else {
                    console.error('error loading pages', error);
                    showAlert(error.status === 400 || error.status === 404 ? 'warning' : 'danger', tCommon('loadError') ?? error.message);
                }
            }
        };
        if (!loading) {
            fetchPages();
        }

        return () => {
            isMountedRef.current = false;
            abortController.abort();
        };

    }, [locale, loading, showAlert, tCommon, t]);


    const pickDisplayRow = useCallback((rows: IPageTranslated[]): IPageTranslated =>
        rows.find(row => row.translation_language === locale) ?? rows[0],
        [locale]
    );

    const updateLocalizedField = useCallback((lang: SupportedLanguage, field: keyof LocalizedPageFields, value: string) => {
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
    }, [touchedLanguages]);

    const handleTitleChange = useCallback((lang: SupportedLanguage, value: string) => {
        setTouchedLanguages(prev => ({ ...prev, [lang]: true }));
        setForm(prev => {
            const slugFor = (targetLang: SupportedLanguage) =>
                editMode ? prev.translations[targetLang].slug : slugify(value, { lower: true, strict: true, locale: targetLang.split('-')[0] });

            const translations = {
                ...prev.translations,
                [lang]: { ...prev.translations[lang], title: value, slug: slugFor(lang) },
            };

            for (const other of SUPPORTED_LANGUAGES) {
                if (other !== lang && !touchedLanguages[other]) {
                    translations[other] = { ...translations[other], title: value, slug: slugFor(other) };
                }
            }

            return { ...prev, translations };
        });
    }, [editMode, touchedLanguages]);

    const resetForm = useCallback(() => {
        setForm(EMPTY_FORM);
        setTouchedLanguages(NOTHING_TOUCHED);
        setActiveLanguage(locale);
        setEditMode(false);
    }, [locale]);

    const openEditModal = useCallback((row: IPageTranslated) => {
        if (!row?.id) {
            showAlert('danger', t('alerts.loadForEditError'));
            return;
        }

        const translations = { ...EMPTY_FORM.translations };
        const touched: Record<SupportedLanguage, boolean> = { ...NOTHING_TOUCHED };

        for (const lang of SUPPORTED_LANGUAGES) {
            const fields = row.translations?.[lang];
            if (fields) {
                translations[lang] = {
                    title: fields.title ?? '',
                    page_description: fields.page_description ?? '',
                    content: fields.content ?? '',
                    slug: fields.slug ?? '',
                };
                touched[lang] = Boolean(fields.title);
            }
        }

        setForm({ id: row?.id, page_image: row?.page_image ?? '', page_order: row?.page_order, active: Boolean(row?.active), translations });
        setTouchedLanguages(touched);
        setEditMode(true);
        setActiveLanguage(locale);
        setShowModal(true);

    }, [t, showAlert, locale]);

    const missingLanguages = useMemo(
        () => SUPPORTED_LANGUAGES.filter(lang => !form.translations[lang].title || !form.translations[lang].slug || !form.translations[lang].content),
        [form.translations]
    );

    const hasSavableContent = useMemo(
        () => SUPPORTED_LANGUAGES.some(lang => form.translations[lang].title && form.translations[lang].slug || !form.translations[lang].content),
        [form.translations]
    );

    const handleSavePage = useCallback(async () => {
        setSaveLoading(true);
        try {
            const payload = {
                page_image: form.page_image?.trim() || null,
                page_order: form.page_order,
                active: form.active,
                translations: form.translations,
            };

            const url = editMode ? `/api/admin/page/${form.id}` : '/api/admin/page';
            const method = editMode ? 'PUT' : 'POST';

            const data = await apiFetch(url, { method: method, body: JSON.stringify(payload) })

            const result = extractData(data, 'array') as IPageTranslated[];
            const rows = Array.isArray(result) ? result : (result ? [result] : []);
            const savedRow = pickDisplayRow(rows);

            if (isMountedRef.current) {
                if (editMode) {
                    setPages((prev) => prev.map((pag) => (pag.id === form.id ? savedRow : pag)));
                } else {
                    setPages((prev) => [savedRow, ...prev]);
                }

                setShowModal(false);
                resetForm();
                showAlert('success', t('alerts.saveSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 409) {
                showAlert('warning', t('alerts.saveError'), () => setShowModal(false));
            }
            else if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/page'));
                });
            } else {
                console.error('Error saving page', error);
                showAlert('danger', t('alerts.saveError') ?? error.message);
            }

        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [editMode, form, pickDisplayRow, resetForm, showAlert, t]);

    const handleDelete = useCallback(async (id: number) => {
        if (!confirm(tCommon('confirmDelete'))) return;

        try {
            await apiFetch(`/api/admin/page/${id}`, { method: 'DELETE' });

            if (isMountedRef.current) {
                setPages(prev => prev.filter(pag => pag.id !== id));
                showAlert('success', t('alerts.deleteSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/page'));
                });
            } else {
                console.error('Error deleting page', error);
                showAlert('danger', t('alerts.deleteError') ?? error.message);
            }
        }
    }, [tCommon, t, showAlert]);

    const toggleActive = useCallback(async (id: number) => {
        setSaveLoading(true);
        try {
            const pag = pages.find(p => p.id === id);
            if (pag) {
                const newStatus = !pag.active;
                const data = await apiFetch(`/api/admin/page/${id}`, { method: 'PUT', body: JSON.stringify({ ...pag, active: newStatus }) })

                const updatedRow = pickDisplayRow(extractData(data, 'array') as IPageTranslated[]);

                if (isMountedRef.current) {
                    setPages(prev => prev.map(p => p.id === id ? updatedRow : p));
                    showAlert('success', t('alerts.saveSuccess'));
                }
            }

        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/page'));
                });
            } else {
                console.error('Error activating/deactivating page', error);
                showAlert('danger', t('alerts.saveError') ?? error.message);
            }
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [pages, pickDisplayRow, showAlert, t]);

    const openMetadataModal = useCallback(async (pag: IPageTranslated) => {
        const buildLocaleMetadata = (p: IPageTranslated, lang: SupportedLanguage) => {
            const pageT = p.translations?.[lang];
            const configT = config?.translations?.[lang];
            const title = pageT?.title ?? p.title;
            const description = pageT?.page_description ?? p.page_description ?? t('seo.description', { site: configT?.site_name ?? '', title });
            const siteName = configT?.site_name ?? (config?.site_name ?? '');

            const cleanedDescription = stripHtmlToText(description);

            return {
                title: `${siteName} - ${title}`,
                metadata_description: cleanedDescription,
                keywords: title,
                og_title: `${siteName} - ${title}`,
                og_description: cleanedDescription,
                x_title: `${siteName} - ${title}`,
                x_description: cleanedDescription
            };
        };

        const buildDefaultMetadata = (p: IPageTranslated): IMetadataOutput => ({
            target_type: TARGET_TYPE,
            target_id: p.id,
            robots_directive: 'index, follow',
            og_image: p.page_image ?? null,
            x_image: p.page_image ?? null,
            id: 0,
            translations: SUPPORTED_LANGUAGES.reduce((acc, lang) => {
                acc[lang] = buildLocaleMetadata(p, lang);
                return acc;
            }, {} as Record<SupportedLanguage, ReturnType<typeof buildLocaleMetadata>>)
        });

        try {
            const data = await apiFetch(`/api/admin/metadata/${TARGET_TYPE}/${pag.id}`, { method: 'GET' });

            const metadata = extractData(data, 'object')

            if (isMountedRef.current) {
                setCurrentMetadata(metadata ?? buildDefaultMetadata(pag));
                if (!metadata) showAlert('warning', tCommon('newMetadata'));
                setShowMetadataModal(true);
            }

        } catch (error: any) {
            if (!isMountedRef.current) return;

            if (error.status === 404) {
                showAlert('warning', tCommon('newMetadata'));
                setCurrentMetadata(buildDefaultMetadata(pag));
                setShowMetadataModal(true);
            } else if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/page'));
                });
            } else {
                console.error('Error opening metadata modal', error);
                showAlert('warning', tCommon('metadataOpenError') ?? error.message);
            }
        }
    }, [config?.site_name, config?.domain, config?.translations, t, tCommon, showAlert]);

    const handleSaveMetadata = useCallback(async (metadata: CreateMetadataRequestInput | UpdateMetadataRequestInput) => {
        setSaveLoading(true);
        try {
            let url: string;
            let method: 'PUT' | 'POST';
            let body: CreateMetadataRequestInput | UpdateMetadataRequestInput;

            if (currentMetadata?.id) {
                url = `/api/admin/metadata/${TARGET_TYPE}/${currentMetadata.target_id}`;
                method = 'PUT';
                body = metadata;
            } else if (currentMetadata?.target_id) {
                url = '/api/admin/metadata';
                method = 'POST';
                body = { ...metadata, target_type: TARGET_TYPE, target_id: currentMetadata.target_id } as CreateMetadataRequestInput;
            } else {
                throw new Error(tCommon('metadataSaveError'));
            }

            const result = await apiFetch(url, { method, body: JSON.stringify(body) });

            if (!result.success) throw new Error(tCommon('metadataSaveError'));

            if (isMountedRef.current) {
                setCurrentMetadata(extractData(result, 'array') as IMetadataOutput);
                setShowMetadataModal(false);
                showAlert('success', tCommon('metadataSaved'));
            }
            return true;
        } catch (error: any) {
            if (isMountedRef.current) {
                if (error.status === 401 || error.status === 403) {
                    showAlert('danger', tCommon('sessionExpired') ?? error.message, () => {
                        router.push(loginHref('/admin/page'));
                    });
                } else {
                    console.error('Error saving metadata', error);
                    showAlert('danger', tCommon('metadataSaveError') ?? error.message);
                }
            }
            return false;
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [currentMetadata, showAlert, tCommon]);

    const handleDeleteMetadata = useCallback(async () => {
        if (!currentMetadata?.target_id) return false;

        try {
            await apiFetch(`/api/admin/metadata/${TARGET_TYPE}/${currentMetadata.target_id}`, { method: 'DELETE' });

            if (isMountedRef.current) {
                setCurrentMetadata(null);
                showAlert('success', tCommon('metadataDeleted'));
            }
            return true;
        } catch (error: any) {
            if (!isMountedRef.current) return false;

            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/page'));
                });
            } else {
                console.error('Error deleting metadata', error);
                showAlert('danger', tCommon('metadataDeleteError') ?? error.message);
            }
            return false;
        }
    }, [currentMetadata, showAlert, t]);

    const filteredPages = useMemo(() => {
        const search = searchTerm.toLowerCase();
        return pages.filter(p =>
            searchTerm === '' ||
            p.id?.toString().includes(search) ||
            p.title?.toLowerCase().includes(search) ||
            p.slug?.toLowerCase().includes(search) ||
            p.page_description?.toLowerCase().includes(search)
        );
    }, [pages, searchTerm]);

    const columns = useMemo(() => [
        {
            key: 'page_image',
            header: tCommon('image'),
            render: (image: string) => {
                const imgSrc = buildImageUrl(config?.cdn, image);
                return (
                    <ImageWithFallback src={imgSrc} alt={t('entityName')} title={imgSrc} width={50} height={50} fallbackComponent={<PlaceholderImage size="sm" className="w-10 h-10" />} className="object-cover rounded" />
                );
            },
            className: 'hidden md:table-cell'
        },
        { key: "title", header: tCommon('title') },
        {
            key: "slug",
            header: tCommon('slug'),
            render: (_: any, row: IPageTranslated) => (
                <Link prefetch={false} href={{ pathname: '/page/[slug]', params: { slug: row.slug } }} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {row.slug}
                </Link>
            )
        },
        {
            key: 'actions',
            header: tCommon('actions'),
            render: (_: any, row: IPageTranslated) => (
                <div className="relative">
                    <div className='inline-flex'>
                        <button className="text-gray-600 hover:text-gray-800" title={tCommon('options')}>
                            <FaEllipsisV className="h-5 w-5" onClick={() => setOpenMenuId(prev => (prev === row.id ? null : row.id))} />
                        </button>
                    </div>
                    {openMenuId === row.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md border border-gray-200 z-50">
                            <div className="py-1">
                                <button onClick={() => { openEditModal(row); setOpenMenuId(null); }} className="text-blue-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100" title={t('editEntity')}>
                                    <FaPencilAlt className="inline h-4 w-4 mr-2" />
                                    {t('editEntity')}
                                </button>
                                <button onClick={() => { openMetadataModal(row); setOpenMenuId(null); }} className="text-purple-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100" title={tCommon('editMetadata')}>
                                    <FaTags className="inline h-4 w-4 mr-2" />
                                    {tCommon('editMetadata')}
                                </button>
                                {row.id !== 1 && (
                                    <button onClick={() => { handleDelete(row.id); setOpenMenuId(null); }} className="text-red-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100" title={t('deleteEntity')}>
                                        <FaTrash className="inline h-4 w-4 mr-2" />
                                        {t('deleteEntity')}
                                    </button>
                                )}
                                <button onClick={() => { toggleActive(row.id); setOpenMenuId(null) }} className={`px-4 py-2 ${row.active ? 'text-green-500 hover:dark:text-gray-500' : 'text-gray-500 hover:text-green-500'} block mr-2 text-sm w-full text-left`} title={row.active ? tCommon('deactivate') : tCommon('activate')}>
                                    {row.active ? <FaEye className="inline h-4 w-4 mr-2" /> : <FaEyeSlash className="inline h-4 w-4 mr-2" />}
                                    {row.active ? tCommon('deactivate') : tCommon('activate')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ),
            className: 'text-right'
        }
    ], [config?.cdn, openEditModal, handleDelete, openMetadataModal, toggleActive, openMenuId, t, tCommon]);

    if (loading) return <div>{tCommon('loading')}</div>

    if (!config) return (
        <div>
            <h1 className="text-2xl font-bold mb-6">{t('pageTitle')}</h1>
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <p>{tCommon('loadError')}</p>
            </div>
        </div>
    );

    const currentFields = form.translations[activeLanguage];

    return (
        <div>
            <div className="block lg:hidden max-w-fit p-3">
                <AdminSearch />
            </div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold ml-3">{t('pageTitle')}</h1>
                <Button variant={'theme'} size={'default'} onClick={() => { resetForm(); setShowModal(true); }} className="mr-3">
                    <FaPlus className="h-4 w-4" />
                    {tCommon('add')}
                </Button>
            </div>


            <TableBuilder data={filteredPages} columns={columns} emptyMessage={t('noEntities')} />

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[calc(100vh-4rem)] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-2">{editMode ? t('editEntity') : t('addEntity')}</h2>

                        <LanguageTabs active={activeLanguage} onChange={setActiveLanguage} incomplete={missingLanguages} />

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('title')}<span className='text-red-500'>*</span></label>
                                <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={currentFields.title} onChange={(e) => handleTitleChange(activeLanguage, e.target.value)} required />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('slug')}<span className='text-red-500'>*</span></label>
                                <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={currentFields.slug} onChange={(e) => updateLocalizedField(activeLanguage, 'slug', e.target.value)} required />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('description')}</label>
                                <textarea value={currentFields.page_description} onChange={(e) => updateLocalizedField(activeLanguage, 'page_description', e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" rows={3} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('content')}<span className='text-red-500'>*</span></label>
                                <TiptapEditor key={activeLanguage} content={currentFields.content} onChange={(html) => updateLocalizedField(activeLanguage, 'content', html)} onImagesChange={setEditorImages} className="mt-1 dark:border-gray-700" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('featuredImage')}</label>
                                <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.page_image} onChange={(e) => setForm({ ...form, page_image: e.target.value })} placeholder={'https://path/to/image.png'} />
                                <div className="mt-2">
                                    <ImageWithFallback src={buildImageUrl(config?.cdn, form.page_image)} alt={form.page_image || tCommon('imageNotAvailable')} fallbackComponent={<PlaceholderImage size="sm" className="h-30 w-full border dark:border-gray-700 rounded" />} className="h-20 w-20 object-contain border dark:border-gray-700 rounded" width={50} height={50} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('order')} <span className='text-xs text-gray-700 dark:text-gray-400'>{t('orderHint')}</span></label>
                                <input type="number" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.page_order} onChange={(e) => setForm({ ...form, page_order: Number(e.target.value) })} />
                            </div>

                            <div className="flex items-center">
                                <input type="checkbox" id="active" className="h-4 w-4 text-blue-600 rounded" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                                <label htmlFor="active" className="ml-2 block text-sm font-medium">{tCommon('activate')}</label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant={'outline'} size={'default'} type="button" onClick={() => { setShowModal(false); resetForm(); }}>
                                {tCommon('cancel')}
                            </Button>
                            <Button variant={'theme'} size={'default'} type="button" onClick={handleSavePage} disabled={!hasSavableContent || saveLoading}>
                                <FaSave className="h-4 w-4 mx-1" />
                                {saveLoading ? (editMode ? tCommon('updating') : tCommon('saving')) : (editMode ? tCommon('update') : tCommon('save'))}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showMetadataModal && currentMetadata && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold dark:font-normal">{tCommon('metadataOf', { title: currentMetadata.translations?.[locale as SupportedLanguage].title as string })}</h2>
                            <button onClick={() => setShowMetadataModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">&times;</button>
                        </div>
                        <MetadataManager targetType={TARGET_TYPE} targetId={currentMetadata.target_id} onSave={handleSaveMetadata} onDelete={handleDeleteMetadata} initialMetadata={currentMetadata || undefined} setShowMetadataModal={setShowMetadataModal} />
                    </div>
                </div>
            )}
        </div>
    );

});

export default PageComponent;
