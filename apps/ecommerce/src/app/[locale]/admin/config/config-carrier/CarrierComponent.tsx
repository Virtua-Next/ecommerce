'use client';
import { useConfig } from '@/context/ConfigContext';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { FaPencilAlt, FaTrash, FaPlus, FaEyeSlash, FaEye, FaEllipsisV, FaMoneyBill, FaSave, FaPlug } from 'react-icons/fa';
import { formatPrice, toBoolean, extractData, apiFetch } from '@/lib/utils';
import TableBuilder from '@/components/TableBuilder/TableBuilder';
import { LanguageTabs } from '@/components/LanguageTabs/LanguageTabs';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import AdminSearch from '@/components/Features/admin-search';
import { ICarrierTranslated, CarrierFormState, EMPTY_FORM, ILocalizedCarrierFields } from '@/lib/schemas/carrier';
import { SUPPORTED_LANGUAGES, CARRIER_TYPES, SUPPORTED_COUNTRIES, COUNTRY_LABELS } from '@/lib/constants';
import { SupportedLanguage } from '@/lib/types/generic';
import { useRouter } from '@/i18n/navigation';
import { useToast } from '@/components/ToastSystem';
import { Button } from '@/components/ui/button';
import { loginHref } from '@/i18n/routing';


const NOTHING_TOUCHED: Record<SupportedLanguage, boolean> = SUPPORTED_LANGUAGES.reduce(
    (acc, lang) => ({ ...acc, [lang]: false }),
    {} as Record<SupportedLanguage, boolean>
);

const CarrierComponent = React.memo(function CarrierComponent() {
    const t = useTranslations('CarrierAdmin');
    const tCommon = useTranslations('AdminCatalog');
    const locale = useLocale() as SupportedLanguage;
    const { config, loading } = useConfig();
    const isMountedRef = useRef(true);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [carriers, setCarriers] = useState<ICarrierTranslated[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const { searchTerm } = useGlobalSearch();
    const [showInfoMelhorEnvio, setShowInfoMelhorEnvio] = useState(false);
    const [showInfoClienteId, setShowInfoClienteId] = useState(false);
    const [showInfoSecret, setShowInfoSecret] = useState(false);
    const [showInfoCepOrigem, setShowInfoCepOrigem] = useState(false);
    const [showInfoNomeTransportadora, setShowInfoNomeTransportadora] = useState(false);
    const [form, setForm] = useState<CarrierFormState>(EMPTY_FORM);
    const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>(locale);
    const [touchedLanguages, setTouchedLanguages] = useState<Record<SupportedLanguage, boolean>>(NOTHING_TOUCHED);
    const searchParams = useSearchParams();
    const success = searchParams.get('success');
    const { showAlert } = useToast();
    const router = useRouter();
    const isproduction = process.env.NODE_ENV === 'production'

    const CARRIER_TYPE_OPTIONS = useMemo(
        () => CARRIER_TYPES.map((type) => ({ value: type, label: tCommon(`carrierTypes.${type}`) })),
        [tCommon]
    );

    const resetForm = useCallback(() => {
        setForm(EMPTY_FORM);
        setTouchedLanguages(NOTHING_TOUCHED);
        setActiveLanguage(locale);
        setEditMode(false);
    }, [locale]);

    useEffect(() => {
        if (success === '1') {
            showAlert('success', tCommon('operationSuccess'));
            setEditMode(false);
            setShowModal(false);
            resetForm();
        } else if (success === '0' || success === 'false') {
            showAlert('warning', tCommon('operationError'));
        }
        if (success !== null) {
            window.history.replaceState(null, '', '/admin/config/config-carrier');
        }
    }, [success, showAlert, tCommon, resetForm]);

    useEffect(() => {
        isMountedRef.current = true;
        const abortController = new AbortController();

        const fetchCarriers = async () => {
            try {
                const data = await apiFetch(`/api/admin/carrier?locale=${locale}`, { method: 'GET', signal: abortController.signal });

                if (isMountedRef.current) {
                    setCarriers(extractData(data, 'array') as ICarrierTranslated[] || []);
                }

            } catch (error: any) {
                if (error.name === 'AbortError' || !isMountedRef.current) return;

                if (error.status === 401 || error.status === 403) {
                    showAlert('danger', tCommon('sessionExpired'), () => {
                        router.push(loginHref('/admin/config/config-carrier'));
                    });
                } else {
                    console.error('Error fetching carriers:', error);
                    showAlert(error.status === 400 || error.status === 404 ? 'warning' : 'danger', tCommon('loadError') ?? error.message);
                }
            }
        };

        if (!loading) fetchCarriers();

        return () => {
            isMountedRef.current = false;
            abortController.abort();
        };
    }, [locale, loading, showAlert, tCommon, router]);

    const pickDisplayRow = useCallback((rows: ICarrierTranslated[]): ICarrierTranslated =>
        rows.find((row) => row.translation_language === locale) ?? rows[0],
        [locale]
    );

    const updateLocalizedField = useCallback((lang: SupportedLanguage, field: keyof ILocalizedCarrierFields, value: string) => {
        setTouchedLanguages((prev) => ({ ...prev, [lang]: true }));
        setForm((prev) => {
            const translations = { ...prev.translations, [lang]: { ...prev.translations[lang], [field]: value } };
            for (const other of SUPPORTED_LANGUAGES) {
                if (other !== lang && !touchedLanguages[other]) {
                    translations[other] = { ...translations[other], [field]: value };
                }
            }
            return { ...prev, translations };
        });
    }, [touchedLanguages]);

    const openEditModal = useCallback((row: ICarrierTranslated) => {
        if (!row?.id) {
            showAlert('danger', t('alerts.loadForEditError'));
            return;
        }

        const translations = { ...EMPTY_FORM.translations };
        const touched: Record<SupportedLanguage, boolean> = { ...NOTHING_TOUCHED };

        for (const lang of SUPPORTED_LANGUAGES) {
            const fields = row.translations?.[lang];
            if (fields) {
                translations[lang] = { carrier_name: fields.carrier_name ?? '' };
                touched[lang] = Boolean(fields.carrier_name);
            }
        }

        setForm({
            id: row.id,
            api_key: row.api_key ?? '',
            refresh_token: row.refresh_token ?? '',
            origin_zip: row.origin_zip ?? '',
            free_shipping: Boolean(row.free_shipping),
            free_shipping_from: row.free_shipping_from ?? 0,
            price: row.price ?? 0,
            carrier_type: row.carrier_type ?? 'personalized',
            carrier_service: row.carrier_service ?? '',
            client_id: row.client_id ?? '',
            client_secret: row.client_secret ?? '',
            token_expires_at: row.token_expires_at ?? '',
            calculation_method: row.calculation_method ?? 'fixed',
            active: Boolean(row.active),
            translations,
            supported_countries: row.supported_countries ?? []
        });

        setTouchedLanguages(touched);
        setEditMode(true);
        setActiveLanguage(locale);
        setShowModal(true);

    }, [t, showAlert, locale]);

    const missingLanguages = useMemo(
        () => SUPPORTED_LANGUAGES.filter((lang) => !form.translations[lang].carrier_name),
        [form.translations]
    );

    const hasSavableContent = useMemo(
        () => SUPPORTED_LANGUAGES.some((lang) => form.translations[lang].carrier_name),
        [form.translations]
    );

    const handleSaveCarrier = useCallback(async () => {
        setSaveLoading(true);
        try {
            const payload = {
                api_key: form.api_key ?? null,
                refresh_token: form.refresh_token ?? null,
                origin_zip: form.origin_zip ?? null,
                free_shipping: form.free_shipping,
                free_shipping_from: Number(form.free_shipping_from),
                price: Number(form.price),
                carrier_type: form.carrier_type,
                carrier_service: form.carrier_service ?? null,
                client_id: form.client_id ?? null,
                client_secret: form.client_secret ?? null,
                token_expires_at: form.token_expires_at ?? null,
                calculation_method: form.calculation_method ?? null,
                active: form.active,
                translations: form.translations,
                supported_countries: form.supported_countries,
            };

            const url = editMode ? `/api/admin/carrier/${form.id}` : '/api/admin/carrier';
            const method = editMode ? 'PUT' : 'POST';

            const { data } = await apiFetch(url, { method, body: JSON.stringify(payload) });
            const rows = extractData(data, 'array') as ICarrierTranslated[];
            const savedRow = pickDisplayRow(Array.isArray(rows) ? rows : (rows ? [rows] : []));

            if (isMountedRef.current) {
                if (editMode) {
                    setCarriers((prev) => prev.map((c) => (c.id === form.id ? savedRow : c)));
                } else {
                    setCarriers((prev) => [savedRow, ...prev]);
                }
                setShowModal(false);
                resetForm();
                showAlert('success', editMode ? t('alerts.saveSuccess') : t('alerts.saveSuccess'));
            }

        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 409) {
                showAlert('warning', t('alerts.saveError'), () => setShowModal(false));
            } else if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-carrier'));
                });
            } else {
                console.error('Error saving carrier', error);
                showAlert(error.status === 400 || error.status === 404 ? 'warning' : 'danger', t('alerts.saveError') ?? error.message);
            }
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [form, editMode, pickDisplayRow, resetForm, showAlert, t, tCommon, router]);

    const handleDelete = useCallback(async (id: number) => {
        if (!confirm(tCommon('confirmDelete'))) return;

        try {
            await apiFetch(`/api/admin/carrier/${id}`, { method: 'DELETE' });

            if (isMountedRef.current) {
                setCarriers((prev) => prev.filter((c) => c.id !== id));
                showAlert('success', t('alerts.deleteSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-carrier'));
                });
            } else {
                console.error('Error deleting carrier', error);
                showAlert(error.status === 400 || error.status === 404 ? 'warning' : 'danger', t('alerts.deleteError') ?? error.message);
            }
        }
    }, [tCommon, t, showAlert, router]);

    const toggleActive = useCallback(async (id: number) => {
        setSaveLoading(true);
        try {
            const carrier = carriers.find((c) => c.id === id);
            if (carrier) {
                const newStatus = !carrier.active;
                const data = await apiFetch(`/api/admin/carrier/${id}`, { method: 'PUT', body: JSON.stringify({ active: newStatus }) });
                const updatedRow = pickDisplayRow(extractData(data, 'array') as ICarrierTranslated[]);

                if (isMountedRef.current) {
                    setCarriers((prev) => prev.map((c) => (c.id === id ? updatedRow : c)));
                    showAlert('success', t('alerts.saveSuccess'));
                }
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-carrier'));
                });
            } else {
                console.error('Error changing carrier status', error);
                showAlert(error.status === 400 || error.status === 404 ? 'warning' : 'danger', t('alerts.statusError') ?? error.message);
            }
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [carriers, pickDisplayRow, showAlert, t, tCommon, router]);

    const toggleFreeShipping = useCallback(async (id: number) => {
        setSaveLoading(true);
        try {
            const carrier = carriers.find((c) => c.id === id);
            if (carrier) {
                const newStatus = !carrier.free_shipping;
                const data = await apiFetch(`/api/admin/carrier/${id}`, { method: 'PUT', body: JSON.stringify({ free_shipping: newStatus }) });
                const updatedRow = pickDisplayRow(extractData(data, 'array') as ICarrierTranslated[]);

                if (isMountedRef.current) {
                    setCarriers((prev) => prev.map((c) => (c.id === id ? updatedRow : c)));
                    showAlert('success', t('alerts.saveSuccess'));
                }
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-carrier'));
                });
            } else {
                console.error('Error changing free shipping status', error);
                showAlert(error.status === 400 || error.status === 404 ? 'warning' : 'danger', t('alerts.statusError') ?? error.message);
            }
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [carriers, pickDisplayRow, showAlert, t, tCommon, router]);

    const connectMelhorEnvio = useCallback(async () => {
        if (!form.client_id || !form.client_secret || !form.origin_zip) {
            showAlert('warning', tCommon('fillMelhorEnvioFields'));
            return;
        }

        setSaveLoading(true);
        try {
            const { client_id, client_secret, origin_zip, free_shipping, free_shipping_from, active } = form;
            const domain = isproduction ? `https://${config?.domain}` : `https://${process.env.NEXT_PUBLIC_TEST_DOMAIN}`;

            if (editMode && form.api_key) {
                const confirm = window.confirm(tCommon('confirmRevokeCredentials'));
                if (!confirm) {
                    setSaveLoading(false);
                    return;
                }

                await apiFetch(`/api/admin/carrier/${form.id}/melhor-envio/revoke`, {
                    method: 'POST',
                    body: JSON.stringify({ token: form.api_key }),
                });
            }

            const state = Math.random().toString(36).substring(2);

            const authData = {
                client_id,
                client_secret,
                origin_zip,
                free_shipping: toBoolean(free_shipping),
                free_shipping_from,
                active: toBoolean(active),
                carrier_id: editMode ? form.id : null,
                domain,
            };

            document.cookie = `melhorEnvioState=${state}; path=/; max-age=300; SameSite=Lax`;
            document.cookie = `melhorEnvioAuth=${btoa(JSON.stringify(authData))}; path=/; max-age=300; SameSite=Lax`;

            const params = new URLSearchParams({
                client_id: client_id as string,
                redirect_uri: `${domain}/api/melhor-envio/auth`,
                response_type: 'code',
                state,
                scope: 'shipping-calculate users-read',
            });

            const baseUrl = isproduction ? 'https://melhorenvio.com.br' : 'https://sandbox.melhorenvio.com.br';
            window.location.href = `${baseUrl}/oauth/authorize?${params.toString()}`;
        } catch (error: any) {
            if (!isMountedRef.current) return;
            console.error('Error connecting Melhor Envio:', error);
            showAlert('danger', error.message || tCommon('connectError'));
            setSaveLoading(false);
        }
    }, [form, isproduction, config?.domain, editMode, showAlert, tCommon]);

    const columns = useMemo(() => [
        {
            key: 'translations',
            header: tCommon('name'),
            render: (_: any, row: ICarrierTranslated) => (
                <span className="font-medium">
                    {row.translations?.[locale]?.carrier_name || row.carrier_name || '-'}
                </span>
            ),
        },
        {
            key: 'carrier_type',
            header: tCommon('type'),
            render: (type: string) => CARRIER_TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type,
        },
        { key: 'origin_zip', header: tCommon('originZip'), render: (zip: string) => zip || '-' },
        {
            key: 'price',
            header: tCommon('price'),
            render: (price: number, row: ICarrierTranslated) =>
                row.carrier_type === 'personalized' ? formatPrice(Number(price), locale, config?.currency) : '-',
        },
        {
            key: 'free_shipping_from',
            header: tCommon('freeShippingFrom'),
            render: (value: number, row: ICarrierTranslated) =>
                row.free_shipping ? formatPrice(Number(value), locale, config?.currency) : <span>-</span>,
        },
        {
            key: 'actions',
            header: tCommon('actions'),
            render: (_: any, row: ICarrierTranslated) => (
                <div className="relative">
                    <div className="inline-flex">
                        <button className="text-gray-600 hover:text-gray-800" title={tCommon('options')}>
                            <FaEllipsisV className="h-5 w-5" onClick={() => setOpenMenuId((prev) => (prev === row.id ? null : row.id))} />
                        </button>
                    </div>
                    {openMenuId === row.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md border border-gray-200 z-50">
                            <div className="py-1">
                                <button
                                    onClick={() => { toggleFreeShipping(row.id); setOpenMenuId(null); }}
                                    className={`${row.free_shipping ? 'text-green-500 hover:dark:text-gray-500' : 'text-gray-500/70 line-through hover:text-green-500 hover:no-underline'} block px-4 py-2 text-sm w-full text-left hover:bg-gray-100`}
                                    title={row.free_shipping ? tCommon('disableFreeShipping') : tCommon('enableFreeShipping')}
                                >
                                    <FaMoneyBill className="inline h-4 w-4 mr-2" />
                                    {tCommon('freeShipping')}
                                </button>
                                <button onClick={() => { openEditModal(row); setOpenMenuId(null); }} className="text-blue-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100" title={tCommon('edit')}>
                                    <FaPencilAlt className="inline h-4 w-4 mr-2" />
                                    {tCommon('edit')}
                                </button>
                                {row.id !== 1 && (
                                    <button onClick={() => { handleDelete(row.id); setOpenMenuId(null); }} className="text-red-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100" title={tCommon('delete')}>
                                        <FaTrash className="inline h-4 w-4 mr-2" />
                                        {tCommon('delete')}
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
            className: 'text-right',
        },
    ], [toggleActive, toggleFreeShipping, openEditModal, handleDelete, openMenuId, t, tCommon, locale, CARRIER_TYPE_OPTIONS]);

    const filteredCarriers = useMemo(() => {
        const search = searchTerm.toLowerCase();
        return carriers.filter((c) =>
            searchTerm === '' ||
            c.id?.toString().includes(search) ||
            c.carrier_name?.toLowerCase().includes(search) ||
            c.carrier_type?.toLowerCase().includes(search)
        );
    }, [carriers, searchTerm]);

    if (loading) return <div>{tCommon('loading')}</div>;

    if (!config) {
        return (
            <div>
                <h1 className="text-2xl font-bold mb-6">{t('pageTitle')}</h1>
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    <p>{tCommon('loadError')}</p>
                </div>
            </div>
        );
    }

    const currentFields = form.translations[activeLanguage];

    return (
        <div>
            <div className="block lg:hidden max-w-fit p-3">
                <AdminSearch />
            </div>

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold ml-3">{t('pageTitle')}</h1>
                <Button variant={'theme'} size={'default'} className="mr-3" onClick={() => { resetForm(); setShowModal(true); }}>
                    <FaPlus className="h-4 w-4" />
                    {tCommon('add')}
                </Button>
            </div>

            <TableBuilder data={filteredCarriers} columns={columns} emptyMessage={t('noEntities')} />

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{editMode ? tCommon('edit') : tCommon('add')}</h2>

                        {form.carrier_type !== 'melhor_envio' && (
                            <LanguageTabs active={activeLanguage} onChange={setActiveLanguage} incomplete={missingLanguages} />
                        )}

                        <div className="grid grid-cols-1 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {tCommon('type')} <span className="text-red-500">*</span>
                                    {form.carrier_type === 'melhor_envio' && (
                                        <button type="button" onClick={() => setShowInfoMelhorEnvio(!showInfoMelhorEnvio)} className="ml-2 text-blue-500 hover:text-blue-400">ℹ️</button>
                                    )}
                                </label>
                                <select
                                    className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700"
                                    value={form.carrier_type}
                                    onChange={(e) => {
                                        const tipo = e.target.value as CarrierFormState['carrier_type'];
                                        setForm({
                                            ...form,
                                            carrier_type: tipo,
                                            ...(tipo === 'melhor_envio' && { price: 0, calculation_method: 'api' }),
                                            ...(tipo === 'personalized' && { client_id: '', client_secret: '', calculation_method: 'fixed' }),
                                        });
                                    }}
                                    required
                                >
                                    {CARRIER_TYPE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>

                                {form.carrier_type === 'melhor_envio' && showInfoMelhorEnvio && (
                                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-4 p-3 border-l-4 border-green-500 bg-gray-50 dark:bg-gray-800 rounded">
                                        <p className="font-medium">{t('melhorEnvio.description')}</p>
                                    </div>
                                )}
                            </div>

                            {form.carrier_type === 'personalized' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        {tCommon('name')} <span className="text-red-500">*</span>
                                        <button type="button" onClick={() => setShowInfoNomeTransportadora(!showInfoNomeTransportadora)} className="ml-2 text-blue-500 hover:text-blue-400">ℹ️</button>
                                    </label>
                                    <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={currentFields.carrier_name} onChange={(e) => updateLocalizedField(activeLanguage, 'carrier_name', e.target.value)} required />
                                    {showInfoNomeTransportadora && (
                                        <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 p-3 border-l-4 border-gray-300 bg-gray-50 dark:bg-gray-800 rounded">
                                            <p>{t('personalized.nameVisible')}</p>
                                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                                <li>{t('personalized.useShortName')}</li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {form.carrier_type === 'personalized' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">{tCommon('fixedPrice')}</label>
                                    <input type="number" step="0.01" min="0" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} placeholder="49.99" />
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{tCommon('fixedPriceHint')}</span>
                                </div>
                            )}

                            {form.carrier_type === 'melhor_envio' && (
                                <div className="space-y-4 p-4 border dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800/50">
                                    <h3 className="font-medium text-sm">{tCommon('melhorEnvioCredentials')}</h3>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {tCommon('clientId')} <span className="text-red-500">*</span>
                                            <button type="button" onClick={() => setShowInfoClienteId(!showInfoClienteId)} className="ml-2 text-blue-500 hover:text-blue-400">ℹ️</button>
                                        </label>
                                        <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.client_id || ''} onChange={(e) => setForm({ ...form, client_id: e.target.value })} autoComplete="new-password" required />
                                        {showInfoClienteId && (
                                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 p-3 border-l-4 border-green-500 bg-gray-50 dark:bg-gray-800 rounded">
                                                <p className="font-medium">{t('melhorEnvio.howToGetClientId')}</p>
                                                <ol className="font-light list-decimal ml-5 mt-2 space-y-1">
                                                    <li>{t.rich('melhorEnvio.steps.createAccount', { link: (chunks) => <a href="https://melhorenvio.com.br/cadastre-se" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{chunks}</a> })}</li>
                                                    <li>{t.rich('melhorEnvio.steps.goToIntegrations', { integrations: (chunks) => <span className="font-medium">{chunks}</span>, devArea: (chunks) => <span className="font-medium">{chunks}</span> })}</li>
                                                    <li>{t.rich('melhorEnvio.steps.registerApp', { registerApp: (chunks) => <span className="font-medium">{chunks}</span> })}</li>
                                                    <li>
                                                        <ul className="list-disc ml-6 space-y-1 mt-1">
                                                            <li>{t('melhorEnvio.steps.platformName')}</li>
                                                            <li>{t.rich('melhorEnvio.steps.platformSite', { url: () => <span className="text-green-500">https://{config?.domain}</span> })}</li>
                                                            <li>{t('melhorEnvio.steps.contactEmail')}</li>
                                                            <li>{t.rich('melhorEnvio.steps.testUrl', { url: () => <span className="text-green-500">https://{config?.domain}/api/melhor-envio/checkout</span> })}</li>
                                                            <li>{t.rich('melhorEnvio.steps.redirectUrl', { url: () => <span className="text-green-500">https://{config?.domain}/api/melhor-envio/auth</span> })}</li>
                                                        </ul>
                                                    </li>
                                                    <li className="mt-2">{t.rich('melhorEnvio.steps.addDescription', { register: (chunks) => <span className="font-medium">{chunks}</span> })}</li>
                                                    <li>{t.rich('melhorEnvio.steps.copyClientId', { clientId: (chunks) => <span className="text-green-500 font-medium">{chunks}</span> })}</li>
                                                </ol>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {tCommon('clientSecret')} <span className="text-red-500">*</span>
                                            <button type="button" onClick={() => setShowInfoSecret(!showInfoSecret)} className="ml-2 text-blue-500 hover:text-blue-400">ℹ️</button>
                                        </label>
                                        <input type="password" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.client_secret || ''} onChange={(e) => setForm({ ...form, client_secret: e.target.value })} autoComplete="new-password" required />
                                        {showInfoSecret && (
                                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 p-3 border-l-4 border-green-500 bg-gray-50 dark:bg-gray-800 rounded">
                                                <p className="font-medium">{t('melhorEnvio.howToGetSecret')}</p>
                                                <ol className="font-light list-decimal ml-5 mt-2 space-y-1">
                                                    <li>{t.rich('melhorEnvio.steps.copySecret', { secret: (chunks) => <span className="text-green-500 font-medium">{chunks}</span> })}</li>
                                                </ol>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {tCommon('originZip')} <span className="text-red-500">*</span>
                                            <button type="button" onClick={() => setShowInfoCepOrigem(!showInfoCepOrigem)} className="ml-2 text-blue-500 hover:text-blue-400">ℹ️</button>
                                        </label>
                                        <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.origin_zip || ''} onChange={(e) => setForm({ ...form, origin_zip: e.target.value })} required placeholder="00000-000" />
                                        {showInfoCepOrigem && (
                                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 p-3 border-l-4 border-green-500 bg-gray-50 dark:bg-gray-800 rounded">
                                                <ol className="font-light list-decimal ml-5 mt-2 space-y-1">
                                                    <li>{t('melhorEnvio.steps.enterOriginZip')}</li>
                                                    <li>{t.rich('melhorEnvio.steps.clickConnect', { connect: (chunks) => <span className="text-red-500 font-medium">{chunks}</span> })}</li>
                                                    <li>{t('melhorEnvio.steps.continueOnPlatform')}</li>
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center">
                                <input type="checkbox" id="free_shipping" className="h-4 w-4 text-blue-600 rounded" checked={form.free_shipping} onChange={(e) => setForm({ ...form, free_shipping: e.target.checked })} />
                                <label htmlFor="free_shipping" className="ml-2 block text-sm font-medium">{tCommon('freeShipping')}</label>
                            </div>

                            {form.free_shipping && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">{tCommon('freeShippingFrom')}</label>
                                    <input type="number" step="0.01" min="0" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.free_shipping_from} placeholder="100.00" onChange={(e) => setForm({ ...form, free_shipping_from: parseFloat(e.target.value) || 0 })} />
                                </div>
                            )}

                            <div className="flex items-center">
                                <input type="checkbox" id="active" className="h-4 w-4 text-blue-600 rounded" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                                <label htmlFor="active" className="ml-2 block text-sm font-medium">{tCommon('activate')}</label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {tCommon('supportedCountries')}
                                </label>
                                <div className="border dark:border-gray-700 rounded max-h-60 overflow-y-auto p-2">
                                    {SUPPORTED_COUNTRIES.map((code) => (
                                        <label key={code} className="flex items-center gap-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.supported_countries.includes(code)}
                                                onChange={(e) => {
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        supported_countries: e.target.checked
                                                            ? [...prev.supported_countries, code]
                                                            : prev.supported_countries.filter((c) => c !== code),
                                                    }));
                                                }}
                                            />
                                            <span className="text-sm">{COUNTRY_LABELS[code]} ({code})</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                        </div>

                        {(form.carrier_type === 'personalized' || form.carrier_type === 'correios') ? (
                            <div className="flex justify-end gap-2 mt-6">
                                <Button variant={'outline'} size={'default'} onClick={() => { setShowModal(false); resetForm(); setShowInfoMelhorEnvio(false); setShowInfoClienteId(false); setShowInfoSecret(false); setShowInfoCepOrigem(false); setShowInfoNomeTransportadora(false); }}>{tCommon('cancel')}</Button>
                                <Button variant={'theme'} size={'default'} onClick={handleSaveCarrier} disabled={!hasSavableContent || saveLoading}>
                                    <FaSave className="h-4 w-4 mx-1" />
                                    {saveLoading ? (editMode ? tCommon('updating') : tCommon('saving')) : (editMode ? tCommon('update') : tCommon('save'))}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex justify-between gap-2 mt-6">
                                <Button type="button" onClick={connectMelhorEnvio} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50" disabled={!form.client_id || !form.client_secret || !form.origin_zip}>
                                    <FaPlug className="h-4 w-4 mx-1" />
                                    {editMode ? tCommon('revokeAndConnect') : tCommon('connect')}
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant={'outline'} size={'default'} onClick={() => { setShowModal(false); resetForm(); setShowInfoMelhorEnvio(false); setShowInfoClienteId(false); setShowInfoSecret(false); setShowInfoCepOrigem(false); }}>{tCommon('cancel')}</Button>
                                    <Button variant={'theme'} size={'default'} onClick={handleSaveCarrier} disabled={!hasSavableContent || saveLoading}>
                                        <FaSave className="h-4 w-4 mx-1" />
                                        {saveLoading ? (editMode ? tCommon('updating') : tCommon('saving')) : (editMode ? tCommon('update') : tCommon('save'))}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

export default CarrierComponent;
