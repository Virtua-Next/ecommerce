'use client';
import { useAdminConfig } from '@/context/AdminConfigContext';
import { PlaceholderImage } from '@/components/PlaceholderImage/PlaceholderImage';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { FaPencilAlt, FaTrash, FaPlus, FaEyeSlash, FaEye, FaEllipsisV, FaSave } from 'react-icons/fa';
import { buildImageUrl, apiFetch, extractData } from '@/lib/utils';
import TableBuilder from '@/components/TableBuilder/TableBuilder';
import { LanguageTabs } from '@/components/LanguageTabs/LanguageTabs';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import AdminSearch from '@/components/Features/admin-search';
import ImageWithFallback from '@/components/ImageWithFallback/imageWithFallback';
import ColorPicker from '@/components/ColorPicker/ColorPicker';
import { ISlideTranslated, SlideFormState, EMPTY_FORM, ILocalizedSlideFields } from '@/lib/schemas/slide';
import { SUPPORTED_LANGUAGES, SLIDE_LOCATIONS } from '@/lib/constants'
import { SupportedLanguage, SlideLocationsType } from '@/lib/types/generic'
import { useRouter } from '@/i18n/navigation'
import { useToast } from '@/components/ToastSystem';
import { Button } from '@/components/ui/button';


const NOTHING_TOUCHED: Record<SupportedLanguage, boolean> = SUPPORTED_LANGUAGES.reduce(
    (acc, lang) => ({ ...acc, [lang]: false }),
    {} as Record<SupportedLanguage, boolean>
);

const SlideComponent = React.memo(function SlideComponent() {
    const t = useTranslations('SlideAdmin');
    const tCommon = useTranslations('AdminCatalog');
    const locale = useLocale() as SupportedLanguage;
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const { config, loading } = useAdminConfig();
    const [saveLoading, setSaveLoading] = useState(false);
    const [slides, setSlides] = useState<ISlideTranslated[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const { searchTerm } = useGlobalSearch();
    const [form, setForm] = useState<SlideFormState>(EMPTY_FORM);
    const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>(locale);
    const [touchedLanguages, setTouchedLanguages] = useState<Record<SupportedLanguage, boolean>>(NOTHING_TOUCHED);
    const isMountedRef = useRef(true);
    const { showAlert } = useToast();
    const router = useRouter();

    useEffect(() => {
        isMountedRef.current = true;
        const abortController = new AbortController();
        const fetchSlides = async () => {
            try {
                const slides: ISlideTranslated[] = await apiFetch(`/api/admin/slide?locale=${locale}`, { method: 'GET', signal: abortController.signal })

                if (isMountedRef.current) {
                    setSlides(slides || []);
                }

            } catch (error: any) {
                if (error.name === 'AbortError' || !isMountedRef.current) return;

                if (error.status === 401 || error.status === 403) {
                    showAlert('danger', tCommon('sessionExpired'), () => {
                        router.push({ pathname: '/login?callback=/admin/slide' });
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

    const pickDisplayRow = useCallback((rows: ISlideTranslated[]): ISlideTranslated =>
        rows.find(row => row.translation_language === locale) ?? rows[0],
        [locale]
    );

    const updateLocalizedField = useCallback((lang: SupportedLanguage, field: keyof ILocalizedSlideFields, value: string) => {
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
        setActiveLanguage(locale);
        setEditMode(false);
    }, [locale]);

    const openEditModal = useCallback((row: ISlideTranslated) => {
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
                    subtitle: fields.subtitle ?? '',
                    button_text: fields.button_text ?? '',
                };
                touched[lang] = Boolean(fields.title);
            }
        }

        setForm({
            id: row.id,
            slide_image: row.slide_image ?? '',
            title_color: row.title_color ?? '#FFFFFF',
            subtitle_color: row.subtitle_color ?? '#FFFFFF',
            button_text_color: row.button_text_color ?? '#FFFFFF',
            button_background: row.button_background ?? '#2563EB',
            button_border: row.button_border ?? '',
            button_link: row.button_link ?? '',
            slide_location: row.slide_location ?? ['principal'],
            slide_order: row.slide_order ?? 0,
            active: Boolean(row.active),
            translations,
        });
        setTouchedLanguages(touched);
        setEditMode(true);
        setActiveLanguage(locale);
        setShowModal(true);

    }, [t, showAlert, locale]);

    const missingLanguages = useMemo(
        () => SUPPORTED_LANGUAGES.filter(lang =>
            !form.translations[lang].title ||
            !form.translations[lang].subtitle ||
            !form.translations[lang].button_text
        ),
        [form.translations]
    );

    const hasSavableContent = useMemo(
        () => SUPPORTED_LANGUAGES.some(lang =>
            form.translations[lang].title &&
            form.translations[lang].subtitle &&
            form.translations[lang].button_text
        ),
        [form.translations]
    );

    const handleSaveSlide = useCallback(async () => {
        setSaveLoading(true);
        try {
            const payload = {
                slide_image: form.slide_image?.trim() ?? null,
                title_color: form.title_color,
                subtitle_color: form.subtitle_color,
                button_text_color: form.button_text_color,
                button_background: form.button_background,
                button_border: form.button_border,
                button_link: form.button_link,
                slide_location: form.slide_location,
                slide_order: form.slide_order,
                active: form.active,
                translations: form.translations,
            };

            const url = editMode ? `/api/admin/slide/${form.id}` : '/api/admin/slide';
            const method = editMode ? 'PUT' : 'POST';

            const data = await apiFetch(url, { method: method, body: JSON.stringify(payload) })

            const result = extractData(data, 'array') as ISlideTranslated[];
            const rows = Array.isArray(result) ? result : (result ? [result] : []);
            const savedRow = pickDisplayRow(rows);

            if (isMountedRef.current) {
                if (editMode) {
                    setSlides((prev) => prev.map((sli) => (sli.id === form.id ? savedRow : sli)));
                } else {
                    setSlides((prev) => [savedRow, ...prev]);
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
                    router.push({ pathname: '/login?callback=/admin/slide' });
                });
            } else {
                console.error('Error saving slide', error);
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
            await apiFetch(`/api/admin/slide/${id}`, { method: 'DELETE' });

            if (isMountedRef.current) {
                setSlides(prev => prev.filter(sli => sli.id !== id));
                showAlert('success', t('alerts.deleteSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push({ pathname: '/login?callback=/admin/slide' });
                });
            } else {
                console.error('Error deleting slide', error);
                showAlert('danger', t('alerts.deleteError') ?? error.message);
            }
        }
    }, [tCommon, t, showAlert]);

    const toggleActive = useCallback(async (id: number) => {
        setSaveLoading(true);
        try {
            const sli = slides.find(s => s.id === id);
            if (sli) {
                const newStatus = !sli.active;
                const data = await apiFetch(`/api/admin/slide/${id}`, { method: 'PUT', body: JSON.stringify({ ...sli, active: newStatus }) })

                const updatedRow = pickDisplayRow(extractData(data, 'array') as ISlideTranslated[]);

                if (isMountedRef.current) {
                    setSlides(prev => prev.map(s => s.id === id ? updatedRow : s));
                    showAlert('success', t('alerts.saveSuccess'));
                }
            }

        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push({ pathname: '/login?callback=/admin/slide' });
                });
            } else {
                console.error('Error activating/deactivating slide', error);
                showAlert('danger', t('alerts.saveError') ?? error.message);
            }
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [slides, pickDisplayRow, showAlert, t]);

    const filteredSlides = useMemo(() => {
        const search = searchTerm.toLowerCase();
        return slides.filter(s =>
            searchTerm === '' ||
            s.id?.toString().includes(search) ||
            s.title?.toLowerCase().includes(search) ||
            s.subtitle?.toLowerCase().includes(search) ||
            s.slide_location?.some(loc => loc.toLowerCase().includes(search))
        );
    }, [slides, searchTerm]);

    const columns = useMemo(() => [
        {
            key: 'slide_image',
            header: tCommon('image'),
            render: (image: string) => {
                const imgSrc = buildImageUrl(config?.cdn, image);
                return (
                    <ImageWithFallback src={imgSrc} alt={t('entityName')} title={imgSrc} width={50} height={50} fallbackComponent={<PlaceholderImage size="sm" className="w-10 h-10" />} className="object-cover rounded" />
                );
            },
            className: 'hidden md:table-cell'
        },

        { key: 'title', header: tCommon('title'), render: (title: string) => <span className="font-medium">{title}</span> },
        { key: 'slide_order', header: tCommon('slideOrder'), render: (order: number) => <span className="font-medium">{order}</span> },
        {
            key: 'slide_location',
            header: tCommon('location'),
            render: (locations: SlideLocationsType[] | SlideLocationsType) => {
                const locals = Array.isArray(locations) ? locations : [locations];

                const locationMap = Object.fromEntries(
                    SLIDE_LOCATIONS.map((loc) => [loc, tCommon(loc)])
                ) as Record<SlideLocationsType, string>;

                return (
                    <div className="flex flex-wrap gap-1">
                        {locals.map((loc) => (
                            <span key={loc} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                {locationMap[loc] || loc}
                            </span>
                        ))}
                    </div>
                );
            }
        },
        {
            key: 'actions',
            header: tCommon('actions'),
            render: (_: any, row: ISlideTranslated) => (
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
    ], [config?.cdn, openEditModal, handleDelete, toggleActive, openMenuId, t, tCommon]);


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

    const LocalCheckbox = ({ value, label, checked, onChange }: { value: string, label: string, checked: boolean, onChange: (value: string, isChecked: boolean) => void }) => (
        <label className="flex items-center gap-2">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(value, e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            {label}
        </label>
    );

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

            <TableBuilder data={filteredSlides} columns={columns} emptyMessage={t('noEntities')} />

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[calc(100vh-4rem)] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{editMode ? tCommon('edit') : tCommon('add')}</h2>

                        <LanguageTabs active={activeLanguage} onChange={setActiveLanguage} incomplete={missingLanguages} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {/* Left column */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{tCommon('title')} <span className="text-red-500">*</span></label>
                                    <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={currentFields.title} onChange={(e) => updateLocalizedField(activeLanguage, 'title', e.target.value)} required maxLength={100} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">{tCommon('subtitle')} <span className="text-red-500">*</span></label>
                                    <textarea className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={currentFields.subtitle} onChange={(e) => updateLocalizedField(activeLanguage, 'subtitle', e.target.value)} required rows={3} maxLength={200} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">{tCommon('buttonText')} <span className="text-red-500">*</span></label>
                                    <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={currentFields.button_text} onChange={(e) => updateLocalizedField(activeLanguage, 'button_text', e.target.value)} required maxLength={50} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">{tCommon('image')} <span className="text-red-500">*</span></label>
                                    <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.slide_image} onChange={(e) => setForm({ ...form, slide_image: e.target.value })} required placeholder="https://path/to/image.png" />
                                    <div className="mt-2">
                                        <ImageWithFallback src={buildImageUrl(config?.cdn, form.slide_image)} alt="Preview" fallbackComponent={<PlaceholderImage size="xl" className="h-52 w-full border dark:border-gray-700 rounded" />} className="w-full max-h-96 object-cover border dark:border-gray-700 rounded" width={800} height={400} />
                                    </div>
                                </div>
                            </div>

                            {/* Right column */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{tCommon('buttonLink')}</label>
                                    <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.button_link || ''} onChange={(e) => setForm({ ...form, button_link: e.target.value || '' })} placeholder="https://site-example.com" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{tCommon('buttonTextColor')}</label>
                                        <ColorPicker color={form.button_text_color || '#FFFFFF'} onChange={(color) => setForm({ ...form, button_text_color: color })} allowNull />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{tCommon('buttonBackground')}</label>
                                        <ColorPicker color={form.button_background || '#2563EB'} onChange={(color) => setForm({ ...form, button_background: color })} allowNull />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{tCommon('buttonBorder')}</label>
                                        <ColorPicker color={form.button_border} onChange={(color) => setForm({ ...form, button_border: color })} allowNull />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{tCommon('titleColor')}</label>
                                        <ColorPicker color={form.title_color || '#FFFFFF'} onChange={(color) => setForm({ ...form, title_color: color })} allowNull />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{tCommon('subtitleColor')}</label>
                                        <ColorPicker color={form.subtitle_color || '#FFFFFF'} onChange={(color) => setForm({ ...form, subtitle_color: color })} allowNull />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{tCommon('slideOrder')}</label>
                                        <input type="number" min="0" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.slide_order} onChange={(e) => setForm({ ...form, slide_order: parseInt(e.target.value) || 0 })} />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">{tCommon('status')}</label>
                                        <select className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.active ? '1' : '0'} onChange={(e) => setForm({ ...form, active: e.target.value === '1' })}>
                                            <option value="1">{tCommon('active')}</option>
                                            <option value="0">{tCommon('inactive')}</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">{tCommon('locations')} <span className="text-red-500">*</span></label>
                                    <div className="space-y-2">
                                        {SLIDE_LOCATIONS.map((value) => (
                                            <LocalCheckbox key={value} value={value} label={tCommon(value)} checked={form.slide_location.includes(value)}
                                                onChange={(val, isChecked) => {
                                                    setForm(prev => {
                                                        const newLocals = isChecked
                                                            ? [...prev.slide_location, val]
                                                            : prev.slide_location.filter(l => l !== val);
                                                        return { ...prev, slide_location: newLocals.length > 0 ? newLocals : ['home'] };
                                                    });
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant={'outline'} size={'default'} onClick={() => { setShowModal(false); resetForm(); }}>{tCommon('cancel')}</Button>
                            <Button variant={'theme'} size={'default'} onClick={handleSaveSlide} disabled={!hasSavableContent || !form.slide_image || saveLoading}>
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

export default SlideComponent;