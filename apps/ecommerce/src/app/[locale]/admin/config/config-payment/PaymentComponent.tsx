'use client';
import { useConfig } from '@/context/ConfigContext';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { FaPencilAlt, FaTrash, FaPlus, FaEye, FaEyeSlash, FaEllipsisV, FaSave } from 'react-icons/fa';
import TableBuilder from '@/components/TableBuilder/TableBuilder';
import { useToast } from '@/components/ToastSystem';
import { LanguageTabs } from '@/components/LanguageTabs/LanguageTabs';
import { SUPPORTED_LANGUAGES, PAYMENT_METHODS, PAYMENT_API_PROVIDERS } from '@/lib/constants';
import { SupportedLanguage } from '@/lib/types/generic';
import { IPaymentApiTranslated, IPaymentMethodTranslated, PaymentApiFormState, PaymentMethodFormState, EMPTY_PAYMENT_API_FORM, EMPTY_PAYMENT_METHOD_FORM, ILocalizedPaymentApiFields, ILocalizedPaymentMethodFields } from '@/lib/schemas/payment';
import { apiFetch, extractData, parseNumber } from '@/lib/utils';
import { useRouter } from '@/i18n/navigation';
import { IconDropdown } from '@/components/IconDropdown/IconDropdown';
import { Button } from '@/components/ui/button';
import { loginHref } from '@/i18n/routing';


const NOTHING_TOUCHED: Record<SupportedLanguage, boolean> = SUPPORTED_LANGUAGES.reduce(
    (acc, lang) => ({ ...acc, [lang]: false }),
    {} as Record<SupportedLanguage, boolean>
);

const PaymentComponent = React.memo(function PaymentComponent() {
    const t = useTranslations('PaymentAdmin');
    const tCommon = useTranslations('AdminCatalog');
    const locale = useLocale() as SupportedLanguage;
    const { config, loading } = useConfig();
    const isMountedRef = useRef(true);
    const { showAlert } = useToast();
    const router = useRouter();
    const [saveLoading, setSaveLoading] = useState(false);
    const [openApiMenuId, setOpenApiMenuId] = useState<number | null>(null);
    const [openMethodMenuId, setOpenMethodMenuId] = useState<number | null>(null);
    const [paymentApis, setPaymentApis] = useState<IPaymentApiTranslated[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<IPaymentMethodTranslated[]>([]);
    const [showApiModal, setShowApiModal] = useState(false);
    const [editApiMode, setEditApiMode] = useState(false);
    const [activeApiLanguage, setActiveApiLanguage] = useState<SupportedLanguage>(locale);
    const [apiForm, setApiForm] = useState<PaymentApiFormState>(EMPTY_PAYMENT_API_FORM);
    const [apiTouchedLanguages, setApiTouchedLanguages] = useState<Record<SupportedLanguage, boolean>>(NOTHING_TOUCHED);
    const [showMethodModal, setShowMethodModal] = useState(false);
    const [editMethodMode, setEditMethodMode] = useState(false);
    const [activeMethodLanguage, setActiveMethodLanguage] = useState<SupportedLanguage>(locale);
    const [methodForm, setMethodForm] = useState<PaymentMethodFormState>(EMPTY_PAYMENT_METHOD_FORM);
    const [methodTouchedLanguages, setMethodTouchedLanguages] = useState<Record<SupportedLanguage, boolean>>(NOTHING_TOUCHED);
    const [showInfoProvedor, setShowInfoProvedor] = useState(false);
    const [showInfoPix, setShowInfoPix] = useState(false);
    const [showInfoChavePublica, setShowInfoChavePublica] = useState(false);
    const [showInfoChavePrivada, setShowInfoChavePrivada] = useState(false);
    const [showInfoWebhook, setShowInfoWebhook] = useState(false);
    const [showInfoWebhookSignature, setShowInfoWebhookSignature] = useState(false);
    const isProduction = process.env.NODE_ENV === 'production';
    const PAYMENT_METHODS_OPTIONS = useMemo(
        () => PAYMENT_METHODS.map((type) => ({ value: type, label: tCommon(`paymentMethod.${type}`) })),
        [tCommon]
    );
    const PAYMENT_API_PRIVIDERS_OPTIONS = useMemo(
        () => PAYMENT_API_PROVIDERS.map((type) => ({ value: type, label: tCommon(`paymentApiProvider.${type}`) })),
        [tCommon]
    );

    useEffect(() => {
        isMountedRef.current = true;
        const abortController = new AbortController();
        const fetchData = async () => {
            try {
                const [apisRes, methodsRes] = await Promise.all([
                    apiFetch(`/api/admin/payment?locale=${locale}`, { method: 'GET', signal: abortController.signal }),
                    apiFetch(`/api/admin/payment/method?locale=${locale}`, { method: 'GET', signal: abortController.signal }),
                ]);

                if (isMountedRef.current) {
                    setPaymentApis(extractData(apisRes, 'array') || []);
                    setPaymentMethods(extractData(methodsRes, 'array') || []);
                }
            } catch (error: any) {
                if (error.name === 'AbortError' || !isMountedRef.current) return;

                if (error.status === 401 || error.status === 403) {
                    showAlert('danger', tCommon('sessionExpired'), () => {
                        router.push(loginHref('/admin/config/config-payment'));
                    });
                } else {
                    console.error('Erro ao carregar configurações de pagamento', error);
                    showAlert(error.status === 400 || error.status === 404 ? 'warning' : 'danger', tCommon('loadError') ?? error.message);
                }
            }
        };

        if (!loading) fetchData();

        return () => {
            isMountedRef.current = false;
            abortController.abort();
        };
    }, [locale, loading, showAlert, tCommon, router]);

    useEffect(() => {
        if (!showApiModal || !apiForm.api_provider || apiForm.api_provider === 'offline') return;
        const webhookURL = isProduction ? `https://${config?.domain}/api/webhook/${apiForm.api_provider}-webhook` : `https://${process.env.NEXT_PUBLIC_TEST_DOMAIN}/api/webhook/${apiForm.api_provider}-webhook`;
        setApiForm(prev => ({ ...prev, webhook: webhookURL }));
    }, [showApiModal, apiForm.api_provider]);

    // ---- API ----

    const flattenApiRow = useCallback((translated: IPaymentApiTranslated): IPaymentApiTranslated => {
        const fields = translated.translations?.[locale] ?? Object.values(translated.translations ?? {})[0];
        return {
            ...translated,
            title: fields?.title ?? '',
            translation_language: locale,
        };
    }, [locale]);


    const resetApiForm = useCallback(() => {
        setApiForm(EMPTY_PAYMENT_API_FORM);
        setApiTouchedLanguages(NOTHING_TOUCHED);
        setActiveApiLanguage(locale);
        setEditApiMode(false);
    }, [locale]);

    const updateApiLocalizedField = useCallback((lang: SupportedLanguage, field: keyof ILocalizedPaymentApiFields, value: string) => {
        setApiTouchedLanguages(prev => ({ ...prev, [lang]: true }));
        setApiForm(prev => {
            const translations = { ...prev.translations, [lang]: { ...prev.translations[lang], [field]: value } };
            for (const other of SUPPORTED_LANGUAGES) {
                if (other !== lang && !apiTouchedLanguages[other]) {
                    translations[other] = { ...translations[other], [field]: value };
                }
            }
            return { ...prev, translations };
        });
    }, [apiTouchedLanguages]);

    const openApiModal = useCallback((row: IPaymentApiTranslated | null) => {
        if (!row) {
            resetApiForm();
            setShowApiModal(true);
            return;
        }

        const translations = { ...EMPTY_PAYMENT_API_FORM.translations };
        const touched: Record<SupportedLanguage, boolean> = { ...NOTHING_TOUCHED };

        for (const lang of SUPPORTED_LANGUAGES) {
            const fields = row.translations?.[lang];
            if (fields) {
                translations[lang] = { title: fields.title ?? '' };
                touched[lang] = Boolean(fields.title);
            }
        }

        setApiForm({
            id: row.id,
            api_provider: row.api_provider,
            public_key: row.public_key,
            private_key: row.private_key,
            webhook: row.webhook ?? '',
            webhook_secret: row.webhook_secret ?? '',
            webhook_id: row.webhook_id ?? '',
            account_id: row.account_id ?? '',
            supports_installments: row.supports_installments,
            active: row.active,
            translations,
        });
        setApiTouchedLanguages(touched);
        setEditApiMode(true);
        setActiveApiLanguage(locale);
        setShowApiModal(true);

    }, [t, showAlert, locale]);

    const handleSaveApi = async () => {
        setSaveLoading(true);
        try {
            const payload = {
                api_provider: apiForm.api_provider,
                public_key: apiForm.public_key,
                private_key: apiForm.private_key,
                webhook: apiForm.webhook,
                webhook_secret: apiForm.webhook_secret,
                webhook_id: apiForm.webhook_id,
                account_id: apiForm.account_id,
                supports_installments: apiForm.supports_installments,
                active: apiForm.active,
                translations: apiForm.translations,
            };

            const url = editApiMode ? `/api/admin/payment/${apiForm.id}` : '/api/admin/payment';
            const method = editApiMode ? 'PUT' : 'POST';

            const data = await apiFetch(url, { method, body: JSON.stringify(payload) });
            const translated = extractData(data, 'object') as IPaymentApiTranslated;
            const savedRow = flattenApiRow(translated);

            if (isMountedRef.current) {
                if (editApiMode && apiForm.id) {
                    setPaymentApis(prev => prev.map(api => (api.id === apiForm.id ? savedRow : api)));
                } else {
                    setPaymentApis(prev => [savedRow, ...prev]);
                }

                setShowApiModal(false);
                resetApiForm();
                showAlert('success', t('alerts.saveSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-payment'));
                });
            } else {
                console.error('Erro ao salvar API', error);
                showAlert('danger', t('alerts.saveError') ?? error.message);
            }
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    };

    const handleDeleteApi = useCallback(async (id: number) => {
        if (!confirm(tCommon('confirmDelete'))) return;

        try {
            await apiFetch(`/api/admin/payment/${id}`, { method: 'DELETE' });

            if (isMountedRef.current) {
                setPaymentApis(prev => prev.filter(api => api.id !== id));
                showAlert('success', t('alerts.deleteSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-payment'));
                });
            } else {
                console.error('Erro ao excluir API', error);
                showAlert('danger', t('alerts.deleteError') ?? error.message);
            }
        }
    }, [showAlert, t, tCommon, router]);

    const toggleApiActive = useCallback(async (id: number) => {
        setSaveLoading(true);
        try {
            const api = paymentApis.find(a => a.id === id);
            if (!api) return;

            const newStatus = !api.active;
            const data = await apiFetch(`/api/admin/payment/${id}`, { method: 'PUT', body: JSON.stringify({ active: newStatus }) });

            const translated = extractData(data, 'object') as IPaymentApiTranslated;
            const updatedRow = flattenApiRow(translated);

            if (isMountedRef.current) {
                setPaymentApis(prev => prev.map(a => (a.id === id ? updatedRow : a)));

                if (!newStatus) {
                    const methodsToDeactivate = paymentMethods.filter(m => m.api_id === id && m.active).map(m => m.id);

                    await Promise.all(
                        methodsToDeactivate.map(methodId =>
                            apiFetch(`/api/admin/payment/method/${methodId}`, {
                                method: 'PUT',
                                body: JSON.stringify({ active: false }),
                            })
                        )
                    );

                    setPaymentMethods(prev => prev.map(m => (m.api_id === id ? { ...m, active: false } : m)));
                }

                showAlert('success', t('alerts.saveSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-payment'));
                });
            } else {
                console.error('Erro ao alterar status da API', error);
                showAlert('danger', t('alerts.saveError') ?? error.message);
            }
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [paymentApis, paymentMethods, flattenApiRow, showAlert, t, tCommon, router]);


    // ---- Method ----


    const flattenMethodRow = useCallback((translated: IPaymentMethodTranslated): IPaymentMethodTranslated => {
        const fields = translated.translations?.[locale] ?? Object.values(translated.translations ?? {})[0];
        return {
            ...translated,
            title: fields?.title ?? '',
            method_description: fields?.method_description ?? '',
            translation_language: locale,
        };
    }, [locale]);

    const resetMethodForm = useCallback(() => {
        setMethodForm({
            ...EMPTY_PAYMENT_METHOD_FORM,
            api_id: paymentApis.find(a => a.api_provider !== 'offline')?.id || 0,
        });
        setMethodTouchedLanguages(NOTHING_TOUCHED);
        setActiveMethodLanguage(locale);
        setEditMethodMode(false);
    }, [locale, paymentApis]);

    const updateMethodLocalizedField = useCallback((lang: SupportedLanguage, field: keyof ILocalizedPaymentMethodFields, value: string) => {
        setMethodTouchedLanguages(prev => ({ ...prev, [lang]: true }));
        setMethodForm(prev => {
            const translations = { ...prev.translations, [lang]: { ...prev.translations[lang], [field]: value } };
            for (const other of SUPPORTED_LANGUAGES) {
                if (other !== lang && !methodTouchedLanguages[other]) {
                    translations[other] = { ...translations[other], [field]: value };
                }
            }
            return { ...prev, translations };
        });
    }, [methodTouchedLanguages]);

    const openMethodModal = useCallback((row: IPaymentMethodTranslated | null) => {
        if (!row) {
            resetMethodForm();
            setShowMethodModal(true);
            return;
        }

        const translations = { ...EMPTY_PAYMENT_METHOD_FORM.translations };
        const touched: Record<SupportedLanguage, boolean> = { ...NOTHING_TOUCHED };

        for (const lang of SUPPORTED_LANGUAGES) {
            const fields = row.translations?.[lang];
            if (fields) {
                translations[lang] = { title: fields.title ?? '', method_description: fields.method_description ?? '' };
                touched[lang] = Boolean(fields.title);
            }
        }

        setMethodForm({
            id: row.id,
            method_type: row.method_type,
            account_data: row.account_data ?? null,
            api_id: row.api_id,
            installment_sale: row.installment_sale,
            max_installments: row.max_installments,
            active: row.active,
            discount_percent: row.discount_percent ?? 0,
            icon: row.icon ?? null,
            translations,
        });
        setMethodTouchedLanguages(touched);
        setEditMethodMode(true);
        setActiveMethodLanguage(locale);
        setShowMethodModal(true);

    }, [t, showAlert, locale]);

    const handleSaveMethod = async () => {
        setSaveLoading(true);
        try {
            if (editMethodMode && methodForm.id) {
                const original = paymentMethods.find(m => m.id === methodForm.id);
                if (original && original.method_type !== methodForm.method_type) {
                    showAlert('warning', t('alerts.typeChangeError'));
                    return;
                }
            }

            const selectedApi = paymentApis.find(p => p.id === methodForm.api_id);

            if (
                (methodForm.method_type === 'transfer' ||
                    ((methodForm.method_type === 'pix' || methodForm.method_type === 'boleto') && selectedApi?.api_provider === 'offline'))
                && !methodForm.account_data
            ) {
                showAlert('warning', t('alerts.accountDataRequired'));
                return;
            }

            if (methodForm.method_type !== 'card' || !selectedApi?.supports_installments) {
                methodForm.installment_sale = false;
                methodForm.max_installments = 1;
            }

            if (['cash', 'transfer'].includes(methodForm.method_type)) {
                methodForm.api_id = 1
            }

            const payload = {
                method_type: methodForm.method_type,
                account_data: methodForm.account_data,
                api_id: methodForm.api_id,
                installment_sale: methodForm.installment_sale,
                max_installments: methodForm.max_installments,
                active: methodForm.active,
                discount_percent: methodForm.discount_percent,
                icon: methodForm.icon,
                translations: methodForm.translations,
            };

            const url = editMethodMode ? `/api/admin/payment/method/${methodForm.id}` : '/api/admin/payment/method';
            const method = editMethodMode ? 'PUT' : 'POST';

            const data = await apiFetch(url, { method, body: JSON.stringify(payload) });
            const translated = extractData(data, 'object') as IPaymentMethodTranslated;
            const savedRow = flattenMethodRow(translated);

            if (isMountedRef.current) {
                if (editMethodMode && methodForm.id) {
                    setPaymentMethods(prev => prev.map(m => (m.id === methodForm.id ? savedRow : m)));
                } else {
                    setPaymentMethods(prev => [savedRow, ...prev]);
                }

                setShowMethodModal(false);
                resetMethodForm();
                showAlert('success', t('alerts.saveSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-payment'));
                });
            } else {
                console.error('Erro ao salvar método', error);
                showAlert('danger', t('alerts.saveError') ?? error.message);
            }
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    };

    const handleDeleteMethod = useCallback(async (id: number) => {
        if (!confirm(tCommon('confirmDelete'))) return;

        try {
            await apiFetch(`/api/admin/payment/method/${id}`, { method: 'DELETE' });

            if (isMountedRef.current) {
                setPaymentMethods(prev => prev.filter(m => m.id !== id));
                showAlert('success', t('alerts.deleteSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-payment'));
                });
            } else {
                console.error('Erro ao excluir método', error);
                showAlert('danger', t('alerts.deleteError') ?? error.message);
            }
        }
    }, [showAlert, t, tCommon, router]);

    const toggleMethodActive = useCallback(async (id: number) => {
        setSaveLoading(true);
        try {
            const method = paymentMethods.find(m => m.id === id);
            if (!method) return;

            const newStatus = !method.active;

            if (newStatus) {
                const api = paymentApis.find(a => a.id === method.api_id);
                if (api && !api.active) {
                    await apiFetch(`/api/admin/payment/${api.id}`, { method: 'PUT', body: JSON.stringify({ active: true }) });
                    setPaymentApis(prev => prev.map(a => (a.id === api.id ? { ...a, active: true } : a)));
                }
            }

            const data = await apiFetch(`/api/admin/payment/method/${id}`, { method: 'PUT', body: JSON.stringify({ active: newStatus }) });
            const translated = extractData(data, 'object') as IPaymentMethodTranslated;
            const updatedRow = flattenMethodRow(translated);

            if (isMountedRef.current) {
                setPaymentMethods(prev => prev.map(m => (m.id === id ? updatedRow : m)));
                showAlert('success', t('alerts.saveSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-payment'));
                });
            } else {
                console.error('Erro ao alterar status do método', error);
                showAlert('danger', t('alerts.saveError') ?? error.message);
            }
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [paymentMethods, paymentApis, flattenMethodRow, showAlert, t, tCommon, router]);

    const apiColumns = useMemo(() => [
        {
            key: 'api_provider',
            header: t('apiProvider'),
            render: (provider: string) => <span className="capitalize">{provider}</span>,
        },
        { key: 'title', header: t('apiTitle') },
        {
            key: 'webhook',
            header: 'Webhook',
            render: (webhook: string) => <span>{webhook || 'offline'}</span>,
        },
        {
            key: 'actions',
            header: tCommon('actions'),
            render: (_: any, row: IPaymentApiTranslated) => (
                <div className="relative">
                    <div className='inline-flex'>
                        <button className="text-gray-600 hover:text-gray-800" title={tCommon('options')}>
                            <FaEllipsisV
                                className="h-5 w-5"
                                onClick={() => {
                                    setOpenMethodMenuId(null);
                                    setOpenApiMenuId(prev => (prev === row.id ? null : (row.id as number)));
                                }}
                            />
                        </button>
                    </div>
                    {openApiMenuId === row.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md border border-gray-200 z-50">
                            <div className="py-1">
                                <button
                                    onClick={() => { openApiModal(row); setOpenApiMenuId(null); }}
                                    className="text-blue-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                >
                                    <FaPencilAlt className="inline h-4 w-4 mr-2" />
                                    {tCommon('edit')}
                                </button>
                                {row.id !== 1 && (
                                    <button
                                        onClick={() => { handleDeleteApi(row.id); setOpenApiMenuId(null); }}
                                        className="text-red-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                    >
                                        <FaTrash className="inline h-4 w-4 mr-2" />
                                        {tCommon('delete')}
                                    </button>
                                )}
                                <button onClick={() => { toggleApiActive(row.id); setOpenApiMenuId(null) }} className={`px-4 py-2 ${row.active ? 'text-green-500 hover:dark:text-gray-500' : 'text-gray-500 hover:text-green-500'} block mr-2 text-sm w-full text-left`} title={row.active ? tCommon('deactivate') : tCommon('activate')}>
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
    ], [toggleApiActive, openApiModal, handleDeleteApi, openApiMenuId, t, tCommon]);

    const methodColumns = useMemo(() => [
        {
            key: 'title',
            header: t('methodTitle'),
            render: (_: any, row: IPaymentMethodTranslated) => {
                return <span>{row?.title}</span>;
            },
        },
        {
            key: 'method_type',
            header: t('methodType'),
            render: (type: string) => <span className="capitalize">{type}</span>,
        },
        {
            key: 'account_data',
            header: t('accountData'),
            render: (_: any, row: IPaymentMethodTranslated) => {
                const display = row.api_id === 1 ? 'Offline' : 'API';
                return <span>{row.account_data || display}</span>;
            },
        },
        {
            key: 'api_id',
            header: t('apiProvider'),
            render: (_: any, row: IPaymentMethodTranslated) => {
                const api = paymentApis.find(a => a.id === row.api_id);
                return <span className="capitalize">{api?.api_provider}</span>;
            },
        },
        {
            key: 'actions',
            header: tCommon('actions'),
            render: (_: any, row: IPaymentMethodTranslated) => (
                <div className="relative">
                    <div className='inline-flex'>
                        <button className="text-gray-600 hover:text-gray-800" title={tCommon('options')}>
                            <FaEllipsisV
                                className="h-5 w-5"
                                onClick={() => {
                                    setOpenApiMenuId(null);
                                    setOpenMethodMenuId(prev => (prev === row.id ? null : (row.id as number)));
                                }}
                            />
                        </button>
                    </div>
                    {openMethodMenuId === row.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md border border-gray-200 z-50">
                            <div className="py-1">
                                <button
                                    onClick={() => { openMethodModal(row); setOpenMethodMenuId(null); }}
                                    className="text-blue-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                >
                                    <FaPencilAlt className="inline h-4 w-4 mr-2" />
                                    {tCommon('edit')}
                                </button>
                                <button
                                    onClick={() => { handleDeleteMethod(row.id); setOpenMethodMenuId(null); }}
                                    className="text-red-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                >
                                    <FaTrash className="inline h-4 w-4 mr-2" />
                                    {tCommon('delete')}
                                </button>
                                <button onClick={() => { toggleMethodActive(row.id); setOpenMethodMenuId(null) }} className={`px-4 py-2 ${row.active ? 'text-green-500 hover:dark:text-gray-500' : 'text-gray-500 hover:text-green-500'} block mr-2 text-sm w-full text-left`} title={row.active ? tCommon('deactivate') : tCommon('activate')}>
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
    ], [toggleMethodActive, openMethodModal, handleDeleteMethod, openMethodMenuId, paymentApis, locale, t, tCommon]);

    if (loading) return <div>{tCommon('loading')}</div>;

    if (!config) return (
        <div>
            <h1 className="text-2xl font-bold mb-6">{t('pageTitle')}</h1>
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <p>{tCommon('loadError')}</p>
            </div>
        </div>
    );

    const currentApiTranslations = apiForm.translations[activeApiLanguage];
    const currentMethodTranslations = methodForm.translations[activeMethodLanguage];
    const apiMissingLanguages = SUPPORTED_LANGUAGES.filter(lang => !apiForm.translations[lang].title);
    const methodMissingLanguages = SUPPORTED_LANGUAGES.filter(lang => !methodForm.translations[lang].title);
    const hasApiSavableContent = SUPPORTED_LANGUAGES.some(lang => apiForm.translations[lang].title);
    const hasMethodSavableContent = SUPPORTED_LANGUAGES.some(lang => methodForm.translations[lang].title);
    const selectedApiInModal = paymentApis.find(a => a.id === methodForm.api_id);
    const isOfflineSelected = selectedApiInModal?.api_provider === 'offline';
    const showAccountData = methodForm.method_type === 'transfer' || ((methodForm.method_type === 'pix') && isOfflineSelected);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold ml-3">{t('pageTitle')}</h1>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold ml-3">{t('apiSection')}</h2>
                    <Button variant={'theme'} size={'default'} onClick={() => openApiModal(null)} className="mr-3">
                        <FaPlus className="h-4 w-4" />
                        {tCommon('add')}
                    </Button>
                </div>
                <TableBuilder data={paymentApis} columns={apiColumns} emptyMessage={t('noApis')} />
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold ml-3">{t('methodSection')}</h2>
                    <Button variant={'theme'} size={'default'} onClick={() => openMethodModal(null)} className="mr-3">
                        <FaPlus className="h-4 w-4" />
                        {tCommon('add')}
                    </Button>
                </div>
                <TableBuilder data={paymentMethods} columns={methodColumns} emptyMessage={t('noMethods')} />
            </div>

            {showApiModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{editApiMode ? tCommon('edit') : tCommon('add')}</h2>

                        <LanguageTabs active={activeApiLanguage} onChange={setActiveApiLanguage} incomplete={apiMissingLanguages} />

                        <div className="space-y-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('apiProvider')}<span className='text-red-500'>*</span>
                                    <button type="button" onClick={() => setShowInfoProvedor(!showInfoProvedor)} className="ml-2 text-blue-500 hover:text-blue-400">ℹ️</button>
                                </label>
                                <select required disabled={apiForm.api_provider === 'offline' && editApiMode} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={apiForm.api_provider} onChange={(e) => setApiForm({ ...apiForm, api_provider: e.target.value as any })}>
                                    <option value="">{t('selectItem')}</option>
                                    {PAYMENT_API_PRIVIDERS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                {showInfoProvedor && (
                                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 p-3 border-l-4 border-green-500 bg-gray-50 dark:bg-gray-700 rounded">
                                        <p className="font-medium text-gray-700 dark:text-gray-200">{t('providerInfo')}</p>
                                        <ul className="list-disc ml-5 mt-2 space-y-1">
                                            <li><span className="text-blue-500 font-medium">{t('mercadopago')}</span>: {t('mercadopagoDesc')}</li>
                                            <li><span className="text-purple-500 font-medium">{t('stripe')}</span>: {t('stripeDesc')}</li>
                                            <li>{t('providerNote')}</li>
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('apiTitle')}<span className='text-red-500'>*</span>
                                </label>
                                <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={currentApiTranslations?.title || ''} onChange={(e) => updateApiLocalizedField(activeApiLanguage, 'title', e.target.value)} required />
                            </div>

                            {apiForm.api_provider !== 'offline' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {t('publicKey')}<span className='text-red-500'>*</span>
                                            <button type="button" onClick={() => setShowInfoChavePublica(!showInfoChavePublica)} className="ml-2 text-blue-500 hover:text-blue-400">ℹ️</button>
                                        </label>
                                        <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={apiForm.public_key} required autoComplete="new-password" onChange={(e) => setApiForm({ ...apiForm, public_key: e.target.value })} />
                                        {apiForm.api_provider === 'stripe' && showInfoChavePublica && (
                                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 p-3 border-l-4 border-purple-400 bg-gray-50 dark:bg-gray-700 rounded">
                                                <p>{t('stripePublicKeyInfo')}</p>
                                                <ul className="list-disc ml-5 mt-2 space-y-1">
                                                    <li><a href="https://dashboard.stripe.com/register" target="_blank" className="text-blue-500 underline">{t('stripeRegister')}</a></li>
                                                    <li>{t('stripePublicKeyStep')}</li>
                                                </ul>
                                            </div>
                                        )}
                                        {apiForm.api_provider === 'mercadopago' && showInfoChavePublica && (
                                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 p-3 border-l-4 border-purple-400 bg-gray-50 dark:bg-gray-700 rounded">
                                                <p className="font-medium">{t('mercadopagoPublicKeyInfo')}</p>
                                                <ol className="font-light list-decimal ml-5 mt-2 space-y-1">
                                                    <li>{t('mercadopagoStep1')}</li>
                                                    <li>{t('mercadopagoStep2')}</li>
                                                    <li>{t('mercadopagoStep3')}</li>
                                                    <li>{t('mercadopagoStep4')}</li>
                                                    <li>{t('mercadopagoStep5')}</li>
                                                    <li>{t('mercadopagoStep6')}</li>
                                                    <li>{t('mercadopagoStep7')}</li>
                                                </ol>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {apiForm.api_provider === 'stripe' ? t('privateKey') : t('accessToken')}<span className='text-red-500'>*</span>
                                            <button type="button" onClick={() => setShowInfoChavePrivada(!showInfoChavePrivada)} className="ml-2 text-blue-500 hover:text-blue-400">ℹ️</button>
                                        </label>
                                        <input type="password" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={apiForm.private_key} required autoComplete="new-password" onChange={(e) => setApiForm({ ...apiForm, private_key: e.target.value })} />
                                        {apiForm.api_provider === 'stripe' && showInfoChavePrivada && (
                                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 p-3 border-l-4 border-blue-400 bg-gray-50 dark:bg-gray-700 rounded">
                                                <p>{t('stripePrivateKeyInfo')}</p>
                                            </div>
                                        )}
                                        {apiForm.api_provider === 'mercadopago' && showInfoChavePrivada && (
                                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 p-3 border-l-4 border-blue-400 bg-gray-50 dark:bg-gray-700 rounded">
                                                <p>{t('mercadopagoAccessTokenInfo')}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {t('webhookUrl')}<span className='text-red-500'>*</span>
                                            {apiForm.api_provider === 'mercadopago' && (
                                                <button type="button" onClick={() => setShowInfoWebhook(!showInfoWebhook)} className="ml-2 text-amber-600 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-500">⚠️ {t('clickHere')}</button>
                                            )}
                                        </label>
                                        <input type="text" className="w-full p-2 border dark:border-gray-700 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300" value={apiForm.webhook || ''} readOnly />
                                        {apiForm.api_provider === 'mercadopago' && showInfoWebhook && (
                                            <div className="text-sm text-gray-700 dark:text-gray-300 mt-1 p-4 border-l-4 border-amber-500 bg-yellow-50 dark:bg-gray-700 rounded space-y-3">
                                                <p className="font-medium">{t('webhookWarning')}</p>
                                                <p className="text-sm">{t('webhookInstructions')}</p>
                                                <ol className="list-decimal ml-5 space-y-1">
                                                    <li>{t('webhookStep1')}</li>
                                                    <li>{t('webhookStep2')}</li>
                                                    <li>{t('webhookStep3')}</li>
                                                    <li>{t('webhookStep4')}</li>
                                                    <li>{t('webhookStep5')}</li>
                                                </ol>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('webhookNote')}</p>
                                            </div>
                                        )}
                                    </div>

                                    {apiForm.api_provider === 'mercadopago' && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                {t('webhookSignature')}<span className='text-red-500'>*</span>
                                                <button type="button" onClick={() => setShowInfoWebhookSignature(!showInfoWebhookSignature)} className="ml-2 text-blue-500 hover:text-blue-400">ℹ️</button>
                                            </label>
                                            <input required type="text" className="w-full p-2 border dark:border-gray-700 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300" value={apiForm.webhook_secret || ''} onChange={(e) => setApiForm({ ...apiForm, webhook_secret: e.target.value })} />
                                            {apiForm.api_provider === 'mercadopago' && showInfoWebhookSignature && (
                                                <div className="text-sm text-gray-700 dark:text-gray-300 mt-1 p-4 border-l-4 border-amber-500 bg-yellow-50 dark:bg-gray-700 rounded space-y-3">
                                                    <p>{t('mercadopagoWebhookSignatureInfo')}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" className='dark:border-gray-600' id="apiSupportsInstallments" checked={apiForm.supports_installments} onChange={(e) => setApiForm({ ...apiForm, supports_installments: e.target.checked })} />
                                        <label htmlFor="apiSupportsInstallments" className="text-sm font-medium">
                                            {t('supportsInstallments')}
                                        </label>
                                    </div>
                                </>
                            )}

                            <div className="flex items-center gap-2">
                                <input type="checkbox" className='dark:border-gray-600' id="apiAtivo" checked={apiForm.active} onChange={(e) => setApiForm({ ...apiForm, active: e.target.checked })} />
                                <label htmlFor="apiAtivo" className="text-sm font-medium">{tCommon('activate')}</label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant={'outline'} size={'default'} onClick={() => { setShowApiModal(false); resetApiForm(); setShowInfoProvedor(false); setShowInfoChavePublica(false); setShowInfoChavePrivada(false); setShowInfoWebhook(false); }}>{tCommon('cancel')}</Button>
                            <Button variant={'theme'} size={'default'} onClick={handleSaveApi} disabled={!apiForm.api_provider || !hasApiSavableContent || (apiForm.api_provider !== 'offline' && !apiForm.private_key) || saveLoading}>
                                <FaSave className="h-4 w-4 mx-1" />
                                {saveLoading ? (editApiMode ? tCommon('updating') : tCommon('saving')) : (editApiMode ? tCommon('update') : tCommon('save'))}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showMethodModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{editMethodMode ? tCommon('edit') : tCommon('add')}</h2>

                        <LanguageTabs active={activeMethodLanguage} onChange={setActiveMethodLanguage} incomplete={methodMissingLanguages} />

                        <div className="space-y-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('methodType')}<span className='text-red-500'>*</span>
                                </label>
                                <select required disabled={editMethodMode} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={methodForm.method_type}
                                    onChange={(e) => {
                                        const newType = e.target.value as any;
                                        setMethodForm(prev => ({
                                            ...prev,
                                            method_type: newType,
                                            account_data: null,
                                            installment_sale: false,
                                            max_installments: 1,
                                            discount_percent: newType === 'card' ? 0 : prev.discount_percent,
                                            api_id: newType === 'transfer' || newType === 'cash'
                                                ? (paymentApis.find(a => a.api_provider === 'offline')?.id ?? prev.api_id)
                                                : (newType === 'card' && paymentApis.find(a => a.id === prev.api_id)?.api_provider === 'offline'
                                                    ? (paymentApis.find(a => a.api_provider !== 'offline')?.id ?? 0)
                                                    : prev.api_id),
                                        }));
                                    }}
                                >
                                    <option value="">{t('selectItem')}</option>
                                    {PAYMENT_METHODS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('methodTitle')}<span className='text-red-500'>*</span>
                                </label>
                                <input required type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={currentMethodTranslations?.title || ''} onChange={(e) => updateMethodLocalizedField(activeMethodLanguage, 'title', e.target.value)}
                                    placeholder={`${t('example')}: ${methodForm.method_type === 'cash' ? t('cashExample') :
                                        methodForm.method_type === 'pix' ? t('pixExample') :
                                            methodForm.method_type === 'boleto' ? t('boletoExample') :
                                                methodForm.method_type === 'transfer' ? t('transferExample') :
                                                    t('cardExample')
                                        }`}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('methodDescription')}</label>
                                <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={currentMethodTranslations?.method_description || ''} onChange={(e) => updateMethodLocalizedField(activeMethodLanguage, 'method_description', e.target.value)} />
                            </div>

                            {showAccountData && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {methodForm.method_type === 'transfer' ? t('accountData') : t('pixData')}<span className='text-red-500'>*</span>
                                            {methodForm.method_type === 'pix' && (<button type="button" onClick={() => setShowInfoPix(!showInfoPix)} className="ml-2 text-blue-500 hover:text-blue-400">ℹ️</button>)}
                                        </label>
                                        <textarea required rows={5} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700 font-mono text-sm" value={methodForm.account_data || ''}
                                            placeholder={
                                                methodForm.method_type === 'pix' ? t('pixAccountDataPlaceholder') :
                                                    methodForm.method_type === 'boleto' ? t('boletoAccountDataPlaceholder') :
                                                        t('accountDataPlaceholder')
                                            }
                                            onChange={(e) => setMethodForm({ ...methodForm, account_data: e.target.value })}
                                        />
                                        <small className="text-xs text-gray-500 dark:text-gray-400 block mt-1">{methodForm.method_type === 'transfer' ? t('accountDataHelp') : t('pixDataHelp')}</small>
                                        {showInfoPix && (
                                            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 p-3 border-l-4 border-green-500 bg-gray-50 dark:bg-gray-700 rounded">
                                                <p className="text-sm text-gray-700 dark:text-gray-200">{t('pixDataInfo')}</p>
                                                <p><small className="text-sm text-gray-700 dark:text-gray-200">{t('pixDataInfoTip')}</small></p>
                                                <p className="text-sm text-primary dark:text-secondary">{t('pixDataWarning')}</p>
                                            </div>
                                        )}
                                    </div>

                                    {methodForm.account_data && (
                                        <div className="border border-blue-200 dark:border-blue-800 rounded bg-blue-50 dark:bg-blue-950 p-3">
                                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">{methodForm.method_type === 'transfer' ? (`👁️ ${t('accountDataPreview')}`) : (`👁️ ${t('pixDataPreview')}`)}</p>
                                            <div className="text-sm text-gray-800 dark:text-gray-200 font-mono" style={{ whiteSpace: 'pre-wrap' }}>
                                                {methodForm.account_data}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!['transfer', 'cash'].includes(methodForm.method_type) && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('apiProvider')}<span className='text-red-500'>*</span></label>
                                        <select required className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={methodForm.api_id} onChange={(e) => setMethodForm({ ...methodForm, api_id: parseNumber(e.target.value) })}>
                                            <option value="">{t('selectItem')}</option>
                                            {paymentApis.filter(api => {
                                                const tipo = methodForm.method_type.toLowerCase();
                                                if (tipo === 'card' || tipo === 'boleto') return api.api_provider !== 'offline';
                                                if (tipo === 'pix') return api.api_provider !== 'stripe';
                                                return true;
                                            })
                                                .map(api => (
                                                    <option key={api.id} value={api.id}>
                                                        {api.translations?.[locale as SupportedLanguage]?.title} ({api.api_provider})
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    {methodForm.method_type === 'card' && paymentApis.find(api => api.id === methodForm.api_id)?.supports_installments && (
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" id="installmentSale" checked={methodForm.installment_sale} onChange={(e) => setMethodForm({ ...methodForm, installment_sale: e.target.checked })} />
                                            <label htmlFor="installmentSale" className="text-sm font-medium">{t('installmentSale')}</label>
                                        </div>
                                    )}

                                    {methodForm.installment_sale && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t('maxInstallments')}</label>
                                            <input type="number" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={methodForm.max_installments || 1} onChange={(e) => setMethodForm({ ...methodForm, max_installments: Number(e.target.value) })} min={1} max={12} />
                                        </div>
                                    )}
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('discountPercent')}</label>
                                <input type="number" step="1" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={methodForm.discount_percent || 0} onChange={(e) => setMethodForm({ ...methodForm, discount_percent: Number(e.target.value) })} min={0} />
                            </div>

                            <IconDropdown label={t('icon')} ICON_MAP='payment' value={methodForm.icon as string} index={0} field="icon" onChange={(index, field, value) => { setMethodForm({ ...methodForm, [field]: value }); }} />

                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="methodAtivo" checked={methodForm.active} onChange={(e) => setMethodForm({ ...methodForm, active: e.target.checked })} />
                                <label htmlFor="methodAtivo" className="text-sm font-medium">{tCommon('activate')}</label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant={'outline'} size={'default'} onClick={() => { setShowMethodModal(false); resetMethodForm(); }}>{tCommon('cancel')}</Button>
                            <Button variant={'theme'} size={'default'} onClick={handleSaveMethod} disabled={!methodForm.method_type || !hasMethodSavableContent || saveLoading}>
                                <FaSave className="h-4 w-4 mx-1" />
                                {saveLoading ? (editMethodMode ? tCommon('updating') : tCommon('saving')) : (editMethodMode ? tCommon('update') : tCommon('save'))}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default PaymentComponent;
