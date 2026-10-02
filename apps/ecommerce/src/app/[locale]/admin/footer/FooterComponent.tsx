'use client';
import { useAdminConfig } from '@/context/AdminConfigContext';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { FaPencilAlt, FaTrash, FaPlus, FaEyeSlash, FaEye, FaEllipsisV, FaSave } from 'react-icons/fa';
import { extractData, apiFetch } from '@/lib/utils';
import TableBuilder from '@/components/TableBuilder/TableBuilder';
import { LanguageTabs } from '@/components/LanguageTabs/LanguageTabs';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import AdminSearch from '@/components/Features/admin-search';
import { IFooterTranslated, ILocalizedFooterFields } from '@/lib/schemas/footer';
import ConteudoEditor, { getNovoItemPorTipo } from './ConteudoEditor';
import { SUPPORTED_LANGUAGES, FOOTER_TYPES } from '@/lib/constants'
import { FooterTypesType, SupportedLanguage } from '@/lib/types/generic'
import { useRouter } from '@/i18n/navigation'
import { useToast } from '@/components/ToastSystem';
import { Button } from '@/components/ui/button';
import { loginHref } from '@/i18n/routing';


interface FooterFormState {
    id?: number;
    footer_type: FooterTypesType;
    footer_order: number;
    active: boolean;
    translations: Record<(typeof SUPPORTED_LANGUAGES)[number], ILocalizedFooterFields>;
}

const EMPTY_LOCALIZED: ILocalizedFooterFields = { title: '', content: '' };

const EMPTY_TRANSLATIONS = SUPPORTED_LANGUAGES.reduce((acc, lang) => {
    acc[lang] = { ...EMPTY_LOCALIZED };
    return acc;
}, {} as Record<SupportedLanguage, ILocalizedFooterFields>);

const EMPTY_FORM: FooterFormState = {
    id: undefined,
    footer_type: FOOTER_TYPES[0],
    footer_order: 0,
    active: true,
    translations: EMPTY_TRANSLATIONS,
};

const NOTHING_TOUCHED: Record<SupportedLanguage, boolean> = SUPPORTED_LANGUAGES.reduce(
    (acc, lang) => ({ ...acc, [lang]: false }),
    {} as Record<SupportedLanguage, boolean>
);

const FooterComponent = React.memo(function FooterComponent() {
    const t = useTranslations('FooterAdmin');
    const tCommon = useTranslations('AdminCatalog');
    const locale = useLocale() as SupportedLanguage;
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const { config, loading } = useAdminConfig();
    const [saveLoading, setSaveLoading] = useState(false);
    const [footers, setFooters] = useState<IFooterTranslated[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const { searchTerm } = useGlobalSearch();
    const [form, setForm] = useState<FooterFormState>(EMPTY_FORM);
    const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>(locale);
    const [touchedLanguages, setTouchedLanguages] = useState<Record<SupportedLanguage, boolean>>(NOTHING_TOUCHED);
    const isMountedRef = useRef(true);
    const touchedItemsRef = useRef<Record<SupportedLanguage, boolean[]>>(
        SUPPORTED_LANGUAGES.reduce((acc, lang) => ({ ...acc, [lang]: [] }), {} as Record<SupportedLanguage, boolean[]>)
    );
    const { showAlert } = useToast();
    const router = useRouter();

    useEffect(() => {
        isMountedRef.current = true;
        const abortController = new AbortController();
        const fetchSlides = async () => {
            try {
                const footers: IFooterTranslated[] = await apiFetch(`/api/admin/footer?locale=${locale}`, { method: 'GET', signal: abortController.signal })
                if (isMountedRef.current) {
                    setFooters(footers || []);
                }

            } catch (error: any) {
                if (error.name === 'AbortError' || !isMountedRef.current) return;

                if (error.status === 401 || error.status === 403) {
                    showAlert('danger', tCommon('sessionExpired'), () => {
                        router.push(loginHref('/admin/footer'));
                    });
                } else {
                    console.error('error loading slides', error);
                    showAlert(error.status === 400 || error.status === 404 ? 'warning' : 'danger', tCommon('loadError') ?? error.message);
                }
            }
        };
        if (!loading) fetchSlides();

        return () => {
            isMountedRef.current = false;
            abortController.abort();
        };

    }, [locale, loading, showAlert, tCommon, t]);

    const pickDisplayRow = useCallback((rows: IFooterTranslated[]): IFooterTranslated =>
        rows.find(row => row.translation_language === locale) ?? rows[0],
        [locale]
    );

    const updateLocalizedField = useCallback((lang: SupportedLanguage, field: keyof ILocalizedFooterFields, value: string) => {
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

    const resetForm = useCallback(() => {
        setForm(EMPTY_FORM);
        setTouchedLanguages(NOTHING_TOUCHED);
        touchedItemsRef.current = SUPPORTED_LANGUAGES.reduce((acc, lang) => ({ ...acc, [lang]: [] }), {} as Record<SupportedLanguage, boolean[]>);
        setActiveLanguage(locale);
        setEditMode(false);
    }, [locale]);

    const handleAddFooterItem = useCallback(() => {
        const novoItem = getNovoItemPorTipo(form.footer_type);

        setForm(prev => {
            const translations = { ...prev.translations };
            for (const lang of SUPPORTED_LANGUAGES) {
                let itens: any[] = [];
                try {
                    itens = JSON.parse(prev.translations[lang].content || '[]');
                } catch {
                    itens = [];
                }
                translations[lang] = { ...translations[lang], content: JSON.stringify([...itens, novoItem]) };
            }
            return { ...prev, translations };
        });

    }, [form.footer_type]);

    const handleRemoveFooterItem = useCallback((index: number) => {
        setForm(prev => {
            const translations = { ...prev.translations };
            for (const lang of SUPPORTED_LANGUAGES) {
                let itens: any[] = [];
                try {
                    itens = JSON.parse(prev.translations[lang].content || '[]');
                } catch {
                    itens = [];
                }
                itens.splice(index, 1);
                translations[lang] = { ...translations[lang], content: JSON.stringify(itens) };
            }
            return { ...prev, translations };
        });

    }, []);

    const handleItemFieldChange = useCallback((index: number, field: string, value: string) => {
        const touched = touchedItemsRef.current;
        for (const lang of SUPPORTED_LANGUAGES) {
            const arr = [...(touched[lang] || [])];
            if (lang === activeLanguage) arr[index] = true;
            touched[lang] = arr;
        }

        setForm(prevForm => {
            const translations = { ...prevForm.translations };

            const applyToLang = (lang: SupportedLanguage) => {
                let itens: any[] = [];
                try {
                    itens = JSON.parse(translations[lang].content || '[]');
                } catch {
                    itens = [];
                }
                const novosItens = [...itens];
                novosItens[index] = { ...getNovoItemPorTipo(prevForm.footer_type), ...novosItens[index], [field]: value };
                translations[lang] = { ...translations[lang], content: JSON.stringify(novosItens) };
            };

            applyToLang(activeLanguage);
            for (const lang of SUPPORTED_LANGUAGES) {
                if (lang !== activeLanguage && !(touched[lang]?.[index])) {
                    applyToLang(lang);
                }
            }

            return { ...prevForm, translations };
        });
    }, [activeLanguage]);

    const openEditModal = useCallback((row: IFooterTranslated) => {
        if (!row?.id) {
            showAlert('danger', t('alerts.loadForEditError'));
            return;
        }

        const translations = { ...EMPTY_FORM.translations };
        const touched: Record<SupportedLanguage, boolean> = { ...NOTHING_TOUCHED };
        const newTouchedItems: Record<SupportedLanguage, boolean[]> = SUPPORTED_LANGUAGES.reduce(
            (acc, lang) => ({ ...acc, [lang]: [] }), {} as Record<SupportedLanguage, boolean[]>
        );

        for (const lang of SUPPORTED_LANGUAGES) {
            const fields = row.translations?.[lang];
            if (fields) {
                translations[lang] = {
                    title: fields.title ?? '',
                    content: fields.content ?? '',
                };
                touched[lang] = Boolean(fields.title);

                try {
                    const parsedItens = JSON.parse(fields.content || '[]');
                    newTouchedItems[lang] = Array.isArray(parsedItens) ? parsedItens.map(() => true) : [];
                } catch {
                    newTouchedItems[lang] = [];
                }
            }
        }

        setForm({
            id: row.id,
            footer_type: (row.footer_type ?? 'contact') as FooterFormState['footer_type'],
            footer_order: row.footer_order ?? 0,
            active: Boolean(row.active),
            translations,
        });

        setTouchedLanguages(touched);
        touchedItemsRef.current = newTouchedItems;
        setEditMode(true);
        setActiveLanguage(locale);
        setShowModal(true);

    }, [t, showAlert, locale]);

    const missingLanguages = useMemo(
        () => SUPPORTED_LANGUAGES.filter(lang => !form.translations[lang].title || !form.translations[lang].content),
        [form.translations]
    );

    const hasSavableContent = useMemo(
        () => SUPPORTED_LANGUAGES.some(lang => form.translations[lang].title && form.translations[lang].content),
        [form.translations]
    );

    const handleSaveFooter = useCallback(async () => {
        setSaveLoading(true);
        try {
            const payload = {
                footer_type: form.footer_type,
                footer_order: form.footer_order,
                active: form.active,
                translations: form.translations,
            };

            const url = editMode ? `/api/admin/footer/${form.id}` : '/api/admin/footer';
            const method = editMode ? 'PUT' : 'POST';

            const data = await apiFetch(url, { method: method, body: JSON.stringify(payload) })

            const result = extractData(data, 'array') as IFooterTranslated[];
            const rows = Array.isArray(result) ? result : (result ? [result] : []);
            const savedRow = pickDisplayRow(rows);

            if (isMountedRef.current) {
                if (editMode) {
                    setFooters((prev) => prev.map((foo) => (foo.id === form.id ? savedRow : foo)));
                } else {
                    setFooters((prev) => [savedRow, ...prev]);
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
                    router.push(loginHref('/admin/footer'));
                });
            } else {
                console.error('Error saving footer', error);
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
            await apiFetch(`/api/admin/footer/${id}`, { method: 'DELETE' });

            if (isMountedRef.current) {
                setFooters(prev => prev.filter(foo => foo.id !== id));
                showAlert('success', t('alerts.deleteSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/footer'));
                });
            } else {
                console.error('Error deleting footer', error);
                showAlert('danger', t('alerts.deleteError') ?? error.message);
            }
        }
    }, [tCommon, t, showAlert]);

    const toggleActive = useCallback(async (id: number) => {
        setSaveLoading(true);
        try {
            const foo = footers.find(f => f.id === id);
            if (foo) {
                const newStatus = !foo.active;
                const data = await apiFetch(`/api/admin/footer/${id}`, { method: 'PUT', body: JSON.stringify({ ...foo, active: newStatus }) })

                const updatedRow = pickDisplayRow(extractData(data, 'array') as IFooterTranslated[]);

                if (isMountedRef.current) {
                    setFooters(prev => prev.map(f => f.id === id ? updatedRow : f));
                    showAlert('success', t('alerts.saveSuccess'));
                }
            }

        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/footer'));
                });
            } else {
                console.error('Error activating/deactivating footer', error);
                showAlert('danger', t('alerts.saveError') ?? error.message);
            }
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [footers, pickDisplayRow, showAlert, t]);

    const filteredFooters = useMemo(() => {
        const search = searchTerm.toLowerCase();
        return footers.filter(f =>
            searchTerm === '' ||
            f.id?.toString().includes(search) ||
            f.title?.toLowerCase().includes(search) ||
            f.footer_type?.toLowerCase().includes(search)
        );
    }, [footers, searchTerm]);

    const columns = useMemo(() => [
        {
            key: 'footer_type',
            header: tCommon('type'),
            render: (types: FooterTypesType[] | FooterTypesType) => {
                const tipes = Array.isArray(types) ? types : [types];

                const tipesMap = Object.fromEntries(
                    FOOTER_TYPES.map((typ) => [typ, t(`types.${typ}`)])
                ) as Record<FooterTypesType, string>;

                return (
                    <div className="flex flex-wrap gap-1">
                        {tipes.map((typ) => (
                            <span key={typ} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                {tipesMap[typ] || typ}
                            </span>
                        ))}
                    </div>
                );
            }
        },
        { key: 'title', header: tCommon('title'), render: (title: string) => <span className="font-medium">{title}</span> },
        { key: 'footer_order', header: tCommon('order'), render: (order: number) => <span className="font-medium">{order}</span> },
        {
            key: 'actions',
            header: tCommon('actions'),
            render: (_: any, row: IFooterTranslated) => (
                <div className="relative">
                    <div className='inline-flex'>
                        <button className="text-gray-600 hover:text-gray-800" title={tCommon('options')}>
                            <FaEllipsisV className="h-5 w-5" onClick={() => setOpenMenuId(prev => (prev === row.id ? null : row.id))} />
                        </button>
                    </div>
                    {openMenuId === row.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md border border-gray-200 z-50">
                            <div className="py-1">
                                <button onClick={() => { openEditModal(row); setOpenMenuId(null); }} className="text-blue-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100" title={tCommon('edit')}>
                                    <FaPencilAlt className="inline h-4 w-4 mr-2" />
                                    {tCommon('edit')}
                                </button>
                                <button onClick={() => { handleDelete(row.id); setOpenMenuId(null); }} className="text-red-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100" title={tCommon('delete')}>
                                    <FaTrash className="inline h-4 w-4 mr-2" />
                                    {tCommon('delete')}
                                </button>
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
    ], [openEditModal, handleDelete, toggleActive, openMenuId, t, tCommon]);


    if (loading) return <div>{tCommon('loading')}</div>;

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
                <Button variant={'theme'} size={'default'} onClick={() => { resetForm(); setShowModal(true); }} className="mr-3"><FaPlus className="h-4 w-4" />{tCommon('add')}</Button>
            </div>

            <TableBuilder data={filteredFooters} columns={columns} emptyMessage={t('noEntities')} />

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[calc(100vh-4rem)] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{editMode ? tCommon('edit') : tCommon('add')}</h2>

                        <LanguageTabs active={activeLanguage} onChange={setActiveLanguage} incomplete={missingLanguages} />

                        <div className="grid grid-cols-1 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('title')} <span className="text-red-500">*</span></label>
                                <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={currentFields.title} onChange={(e) => updateLocalizedField(activeLanguage, 'title', e.target.value)} required />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('type')} <span className="text-red-500">*</span></label>
                                <select className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.footer_type} onChange={(e) => setForm({ ...form, footer_type: e.target.value as FooterFormState['footer_type'] })} required>
                                    {FOOTER_TYPES.map((value) => (
                                        <option key={value} value={value}>
                                            {t(`types.${value}`)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('content')} <span className="text-red-500">*</span></label>
                                <ConteudoEditor tipo={form.footer_type} conteudo={currentFields.content} onChange={(content: string) => updateLocalizedField(activeLanguage, 'content', content)} onAddItem={handleAddFooterItem} onRemoveItem={handleRemoveFooterItem} onItemFieldChange={handleItemFieldChange} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('order')}</label>
                                <input type="number" min="0" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.footer_order} onChange={(e) => setForm({ ...form, footer_order: parseInt(e.target.value) || 0 })} />
                            </div>

                            <div className="flex items-center">
                                <input type="checkbox" id="active" className="h-4 w-4 text-blue-600 rounded" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                                <label htmlFor="active" className="ml-2 block text-sm font-medium">{tCommon('activate')}</label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant={'outline'} size={'default'} onClick={() => { setShowModal(false); resetForm(); }}>{tCommon('cancel')}</Button>
                            <Button variant={'theme'} size={'default'} onClick={handleSaveFooter} disabled={!hasSavableContent || saveLoading}>
                                <FaSave className="h-4 w-4 mx-1" />
                                {saveLoading ? (editMode ? tCommon('updating') : tCommon('saving')) : (editMode ? tCommon('update') : tCommon('save'))}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default FooterComponent;
