'use client';
import { useConfig } from '@/context/ConfigContext';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { FaPencilAlt, FaTrash, FaPlus, FaEye, FaEyeSlash, FaEllipsisV, FaSave } from 'react-icons/fa';
import TableBuilder from '@/components/TableBuilder/TableBuilder';
import { useToast } from '@/components/ToastSystem';
import { EMAIL_PROVIDERS, EMAIL_TRIGGER_TYPES } from '@/lib/constants';
import { SupportedLanguage } from '@/lib/types/generic';
import { IEmailApiTranslated, ITriggerEmail, EmailApiFormState, TriggerEmailFormState, EMPTY_EMAIL_API_FORM, EMPTY_TRIGGER_EMAIL_FORM } from '@/lib/schemas/email';
import { apiFetch, extractData } from '@/lib/utils';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { loginHref } from '@/i18n/routing';


const EmailComponent = React.memo(function EmailComponent() {
    const t = useTranslations('EmailAdmin');
    const tCommon = useTranslations('AdminCatalog');
    const locale = useLocale() as SupportedLanguage;
    const { config, loading } = useConfig();
    const isMountedRef = useRef(true);
    const { showAlert } = useToast();
    const router = useRouter();
    const [saveLoading, setSaveLoading] = useState(false);
    const [openApiMenuId, setOpenApiMenuId] = useState<number | null>(null);
    const [openTriggerMenuId, setOpenTriggerMenuId] = useState<number | null>(null);
    const [emailApis, setEmailApis] = useState<IEmailApiTranslated[]>([]);
    const [triggerEmails, setTriggerEmails] = useState<ITriggerEmail[]>([]);
    const [showApiModal, setShowApiModal] = useState(false);
    const [editApiMode, setEditApiMode] = useState(false);
    const [apiForm, setApiForm] = useState<EmailApiFormState>(EMPTY_EMAIL_API_FORM);
    const [showTriggerModal, setShowTriggerModal] = useState(false);
    const [editTriggerMode, setEditTriggerMode] = useState(false);
    const [triggerForm, setTriggerForm] = useState<TriggerEmailFormState>(EMPTY_TRIGGER_EMAIL_FORM);
    const [showInfoApi, setShowInfoApi] = useState(false);
    const [showInfoTrigger, setShowInfoTrigger] = useState(false);
    const EMAIL_PROVIDERS_OPTIONS = useMemo(
        () => EMAIL_PROVIDERS.map((type) => ({ value: type, label: tCommon(`emailProvider.${type}`) })),
        [tCommon]
    );
    const EMAIL_TRIGGER_TYPES_OPTIONS = useMemo(
        () => EMAIL_TRIGGER_TYPES.map((type) => ({ value: type, label: tCommon(`emailTriggerType.${type}`) })),
        [tCommon]
    );

    useEffect(() => {
        isMountedRef.current = true;

        const abortController = new AbortController();
        const fetchData = async () => {
            try {
                const [apisRes, triggersRes] = await Promise.all([
                    apiFetch(`/api/admin/email?locale=${locale}`, { method: 'GET', signal: abortController.signal }),
                    apiFetch(`/api/admin/email/trigger?locale=${locale}`, { method: 'GET', signal: abortController.signal }),
                ]);

                if (isMountedRef.current) {
                    setEmailApis(extractData(apisRes, 'array') || []);
                    setTriggerEmails(extractData(triggersRes, 'array') || []);
                }
            } catch (error: any) {
                if (error.name === 'AbortError' || !isMountedRef.current) return;

                if (error.status === 401 || error.status === 403) {
                    showAlert('danger', tCommon('sessionExpired'), () => {
                        router.push(loginHref('/admin/config/config-email'));
                    });
                } else {
                    console.error('Erro ao carregar configurações de email', error);
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

    // ---- API ----

    const flattenApiRow = useCallback((translated: IEmailApiTranslated): IEmailApiTranslated => {
        return {
            ...translated,
            title: translated.api_server,
            translation_language: locale,
        };
    }, [locale]);

    const resetApiForm = useCallback(() => {
        setApiForm(EMPTY_EMAIL_API_FORM);
        setEditApiMode(false);
    }, []);

    const openApiModal = useCallback((row: IEmailApiTranslated | null) => {
        if (!row) {
            resetApiForm();
            setShowApiModal(true);
            return;
        }

        setApiForm({
            id: row.id,
            api_server: row.api_server,
            api_key: row.api_key || '',
            active: row.active,
        });
        setEditApiMode(true);
        setShowApiModal(true);

    }, [t, showAlert, locale]);

    const handleSaveApi = async () => {
        setSaveLoading(true);
        try {
            const payload = {
                api_server: apiForm.api_server,
                api_key: apiForm.api_key,
                active: apiForm.active,
            };

            const url = editApiMode ? `/api/admin/email/${apiForm.id}` : '/api/admin/email';
            const method = editApiMode ? 'PUT' : 'POST';

            const data = await apiFetch(url, { method, body: JSON.stringify(payload) });
            const translated = extractData(data, 'object') as IEmailApiTranslated;
            const savedRow = flattenApiRow(translated);

            if (isMountedRef.current) {
                if (editApiMode && apiForm.id) {
                    setEmailApis(prev => prev.map(api => (api.id === apiForm.id ? savedRow : api)));
                } else {
                    setEmailApis(prev => [savedRow, ...prev]);
                }

                setShowApiModal(false);
                resetApiForm();
                showAlert('success', t('alerts.saveSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-email'));
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
            await apiFetch(`/api/admin/email/${id}`, { method: 'DELETE' });

            if (isMountedRef.current) {
                setEmailApis(prev => prev.filter(api => api.id !== id));
                showAlert('success', t('alerts.deleteSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-email'));
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
            const api = emailApis.find(a => a.id === id);
            if (!api) return;

            const newStatus = !api.active;
            const data = await apiFetch(`/api/admin/email/${id}`, { method: 'PUT', body: JSON.stringify({ active: newStatus }) });

            const translated = extractData(data, 'object') as IEmailApiTranslated;
            const updatedRow = flattenApiRow(translated);

            if (isMountedRef.current) {
                setEmailApis(prev => prev.map(a => (a.id === id ? updatedRow : a)));

                if (!newStatus) {
                    const triggersToDeactivate = triggerEmails.filter(m => m.api_id === id && m.active).map(m => m.id);

                    await Promise.all(
                        triggersToDeactivate.map(triggerId =>
                            apiFetch(`/api/admin/email/trigger/${triggerId}`, {
                                method: 'PUT',
                                body: JSON.stringify({ active: false }),
                            })
                        )
                    );

                    setTriggerEmails(prev => prev.map(m => (m.api_id === id ? { ...m, active: false } : m)));
                }

                showAlert('success', t('alerts.saveSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-email'));
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
    }, [emailApis, triggerEmails, flattenApiRow, showAlert, t, tCommon, router]);

    // ---- Trigger ----

    const flattenTriggerRow = useCallback((translated: ITriggerEmail): ITriggerEmail => {
        return {
            ...translated,
        };
    }, [locale]);

    const resetTriggerForm = useCallback(() => {
        setTriggerForm({
            ...EMPTY_TRIGGER_EMAIL_FORM,
            api_id: emailApis[0]?.id || 0,
        });
        setEditTriggerMode(false);
    }, [emailApis]);

    const openTriggerModal = useCallback((row: ITriggerEmail | null) => {
        if (!row) {
            resetTriggerForm();
            setShowTriggerModal(true);
            return;
        }

        setTriggerForm({
            id: row.id,
            trigger_type: row.trigger_type,
            email: row.email,
            api_id: row.api_id,
            active: row.active,
        });
        setEditTriggerMode(true);
        setShowTriggerModal(true);

    }, [t, showAlert, locale]);

    const handleSaveTrigger = async () => {
        setSaveLoading(true);
        try {
            if (editTriggerMode && triggerForm.id) {
                const original = triggerEmails.find(m => m.id === triggerForm.id);
                if (original && original.trigger_type !== triggerForm.trigger_type) {
                    showAlert('warning', t('alerts.typeChangeError'));
                    return;
                }
            }

            const payload = {
                trigger_type: triggerForm.trigger_type,
                email: triggerForm.email,
                api_id: triggerForm.api_id,
                active: triggerForm.active,
            };

            const url = editTriggerMode ? `/api/admin/email/trigger/${triggerForm.id}` : '/api/admin/email/trigger';
            const method = editTriggerMode ? 'PUT' : 'POST';

            const data = await apiFetch(url, { method, body: JSON.stringify(payload) });
            const translated = extractData(data, 'object') as ITriggerEmail;
            const savedRow = flattenTriggerRow(translated);

            if (isMountedRef.current) {
                if (editTriggerMode && triggerForm.id) {
                    setTriggerEmails(prev => prev.map(m => (m.id === triggerForm.id ? savedRow : m)));
                } else {
                    setTriggerEmails(prev => [savedRow, ...prev]);
                }

                setShowTriggerModal(false);
                resetTriggerForm();
                showAlert('success', t('alerts.saveSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-email'));
                });
            } else {
                console.error('Erro ao salvar trigger', error);
                showAlert('danger', t('alerts.saveError') ?? error.message);
            }
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    };

    const handleDeleteTrigger = useCallback(async (id: number) => {
        if (!confirm(tCommon('confirmDelete'))) return;

        try {
            await apiFetch(`/api/admin/email/trigger/${id}`, { method: 'DELETE' });

            if (isMountedRef.current) {
                setTriggerEmails(prev => prev.filter(m => m.id !== id));
                showAlert('success', t('alerts.deleteSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-email'));
                });
            } else {
                console.error('Erro ao excluir trigger', error);
                showAlert('danger', t('alerts.deleteError') ?? error.message);
            }
        }
    }, [showAlert, t, tCommon, router]);

    const toggleTriggerActive = useCallback(async (id: number) => {
        setSaveLoading(true);
        try {
            const trigger = triggerEmails.find(m => m.id === id);
            if (!trigger) return;

            const newStatus = !trigger.active;

            if (newStatus) {
                const api = emailApis.find(a => a.id === trigger.api_id);
                if (api && !api.active) {
                    await apiFetch(`/api/admin/email/${api.id}`, { method: 'PUT', body: JSON.stringify({ active: true }) });
                    setEmailApis(prev => prev.map(a => (a.id === api.id ? { ...a, active: true } : a)));
                }
            }

            const data = await apiFetch(`/api/admin/email/trigger/${id}`, { method: 'PUT', body: JSON.stringify({ active: newStatus }) });
            const translated = extractData(data, 'object') as ITriggerEmail;
            const updatedRow = flattenTriggerRow(translated);

            if (isMountedRef.current) {
                setTriggerEmails(prev => prev.map(m => (m.id === id ? updatedRow : m)));
                showAlert('success', t('alerts.saveSuccess'));
            }
        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/config/config-email'));
                });
            } else {
                console.error('Erro ao alterar status do trigger', error);
                showAlert('danger', t('alerts.saveError') ?? error.message);
            }
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [triggerEmails, emailApis, flattenTriggerRow, showAlert, t, tCommon, router]);

    const apiColumns = useMemo(() => [
        {
            key: 'api_server',
            header: t('apiProvider'),
            render: (provider: string) => <span className="capitalize">{provider}</span>,
        },
        {
            key: 'api_key',
            header: t('apiKey'),
            render: () => <span className="text-gray-500">••••••••••••</span>,
        },
        {
            key: 'actions',
            header: tCommon('actions'),
            render: (_: any, row: IEmailApiTranslated) => (
                <div className="relative">
                    <div className='inline-flex'>
                        <button className="text-gray-600 hover:text-gray-800" title={tCommon('options')}>
                            <FaEllipsisV
                                className="h-5 w-5"
                                onClick={() => {
                                    setOpenTriggerMenuId(null);
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
                                <button
                                    onClick={() => { handleDeleteApi(row.id); setOpenApiMenuId(null); }}
                                    className="text-red-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                >
                                    <FaTrash className="inline h-4 w-4 mr-2" />
                                    {tCommon('delete')}
                                </button>
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

    const triggerColumns = useMemo(() => [
        {
            key: 'trigger_type',
            header: t('triggerType'),
            render: (type: string) => <span className="capitalize">{type}</span>,
        },
        {
            key: 'email',
            header: t('email'),
        },
        {
            key: 'api_id',
            header: t('apiProvider'),
            render: (_: any, row: ITriggerEmail) => {
                const api = emailApis.find(a => a.id === row.api_id);
                return <span className="capitalize">{api?.api_server || t('noApi')}</span>;
            },
        },
        {
            key: 'actions',
            header: tCommon('actions'),
            render: (_: any, row: ITriggerEmail) => (
                <div className="relative">
                    <div className='inline-flex'>
                        <button className="text-gray-600 hover:text-gray-800" title={tCommon('options')}>
                            <FaEllipsisV
                                className="h-5 w-5"
                                onClick={() => {
                                    setOpenApiMenuId(null);
                                    setOpenTriggerMenuId(prev => (prev === row.id ? null : (row.id as number)));
                                }}
                            />
                        </button>
                    </div>
                    {openTriggerMenuId === row.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md border border-gray-200 z-50">
                            <div className="py-1">
                                <button
                                    onClick={() => { openTriggerModal(row); setOpenTriggerMenuId(null); }}
                                    className="text-blue-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                >
                                    <FaPencilAlt className="inline h-4 w-4 mr-2" />
                                    {tCommon('edit')}
                                </button>
                                <button
                                    onClick={() => { handleDeleteTrigger(row.id); setOpenTriggerMenuId(null); }}
                                    className="text-red-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                >
                                    <FaTrash className="inline h-4 w-4 mr-2" />
                                    {tCommon('delete')}
                                </button>
                                <button onClick={() => { toggleTriggerActive(row.id); setOpenTriggerMenuId(null) }} className={`px-4 py-2 ${row.active ? 'text-green-500 hover:dark:text-gray-500' : 'text-gray-500 hover:text-green-500'} block mr-2 text-sm w-full text-left`} title={row.active ? tCommon('deactivate') : tCommon('activate')}>
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
    ], [toggleTriggerActive, openTriggerModal, handleDeleteTrigger, openTriggerMenuId, emailApis, t, tCommon]);

    if (loading) return <div>{tCommon('loading')}</div>;

    if (!config) return (
        <div>
            <h1 className="text-2xl font-bold mb-6">{t('pageTitle')}</h1>
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <p>{tCommon('loadError')}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold ml-3">{t('pageTitle')}</h1>
            </div>

            {/* APIs */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold ml-3">{t('apiSection')}</h2>
                    <Button variant={'theme'} size={'default'} onClick={() => openApiModal(null)} className="mr-3">
                        <FaPlus className="h-4 w-4" />
                        {tCommon('add')}
                    </Button>
                </div>
                <TableBuilder data={emailApis} columns={apiColumns} emptyMessage={t('noApis')} />
            </div>

            {/* Triggers */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold ml-3">{t('triggerSection')}</h2>
                    <Button variant={'theme'} size={'default'} onClick={() => openTriggerModal(null)} className="mr-3">
                        <FaPlus className="h-4 w-4" />
                        {tCommon('add')}
                    </Button>
                </div>
                <TableBuilder data={triggerEmails} columns={triggerColumns} emptyMessage={t('noTriggers')} />
            </div>

            {/* API modal */}
            {showApiModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{editApiMode ? tCommon('edit') : tCommon('add')}</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('apiProvider')}<span className='text-red-500'>*</span>
                                </label>
                                <select required className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={apiForm.api_server} onChange={(e) => setApiForm({ ...apiForm, api_server: e.target.value as any })}>
                                    <option value="">{t('selectItem')}</option>
                                    {EMAIL_PROVIDERS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('apiKey')}<span className='text-red-500'>*</span>
                                    <button type="button" onClick={() => setShowInfoApi(!showInfoApi)} className="ml-2 text-blue-500 hover:text-blue-400">
                                        ℹ️
                                    </button>
                                </label>
                                <input type="password" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={apiForm.api_key} onChange={(e) => setApiForm({ ...apiForm, api_key: e.target.value })} required autoComplete="new-password" />
                                {showInfoApi && (
                                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 p-3 border-l-4 border-blue-500 bg-gray-50 dark:bg-gray-700 rounded">
                                        <ul className="list-disc ml-5 space-y-1">
                                            <li>{t('apiKeyInfo.step1')} <a className="text-blue-500 underline" href="https://resend.com/signup" target="_blank">{t('apiKeyInfo.signup')}</a>.</li>
                                            <li>{t('apiKeyInfo.step2')} <a className="text-blue-500 underline" href="https://resend.com/domains" target="_blank">https://resend.com/domains</a>.</li>
                                            <li>{t('apiKeyInfo.step3')}</li>
                                            <li>{t('apiKeyInfo.step4')} <a className="text-blue-500 underline" href="https://resend.com/api-keys" target="_blank">https://resend.com/api-keys</a>.
                                                <ul className="list-disc ml-5 mt-1">
                                                    <li>{t('apiKeyInfo.step4a')}</li>
                                                    <li>{t('apiKeyInfo.step4b')}</li>
                                                    <li>{t('apiKeyInfo.step4c')}</li>
                                                    <li>{t('apiKeyInfo.step4d')}</li>
                                                </ul>
                                            </li>
                                            <li>{t('apiKeyInfo.step5')}</li>
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <input type="checkbox" className='dark:border-gray-600' id="apiAtivo" checked={apiForm.active} onChange={(e) => setApiForm({ ...apiForm, active: e.target.checked })} />
                                <label htmlFor="apiAtivo" className="text-sm font-medium">{tCommon('activate')}</label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant={'outline'} size={'default'} onClick={() => { setShowApiModal(false); resetApiForm(); setShowInfoApi(false); }}>
                                {tCommon('cancel')}
                            </Button>
                            <Button variant={'theme'} size={'default'} onClick={handleSaveApi} disabled={!apiForm.api_server || !apiForm.api_key || saveLoading}>
                                <FaSave className="h-4 w-4 mx-1" />
                                {saveLoading ? (editApiMode ? tCommon('updating') : tCommon('saving')) : (editApiMode ? tCommon('update') : tCommon('save'))}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Trigger modal */}
            {showTriggerModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{editTriggerMode ? tCommon('edit') : tCommon('add')}</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('triggerType')}<span className='text-red-500'>*</span>
                                    <button type="button" onClick={() => setShowInfoTrigger(!showInfoTrigger)} className="ml-2 text-blue-500 hover:text-blue-400">
                                        ℹ️
                                    </button>
                                </label>
                                <select required disabled={editTriggerMode} className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={triggerForm.trigger_type} onChange={(e) => setTriggerForm({ ...triggerForm, trigger_type: e.target.value as any })}>
                                    <option value="">{t('selectItem')}</option>
                                    {EMAIL_TRIGGER_TYPES_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                {showInfoTrigger && (
                                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 p-3 border-l-4 border-blue-500 bg-gray-50 dark:bg-gray-700 rounded">
                                        <p>{t('triggerInfo.intro')}</p>
                                        <ul className="list-disc ml-5 mt-2 space-y-1">
                                            <li>
                                                {t('triggerInfo.chooseType')}
                                                <ul className="list-disc ml-5 mt-1 space-y-1">
                                                    <li><span className="text-blue-500">{t('triggerInfo.account')}</span>: {t('triggerInfo.accountDesc')}</li>
                                                    <li><span className="text-green-500">{t('triggerInfo.sales')}</span>: {t('triggerInfo.salesDesc')}</li>
                                                    <li><span className="text-purple-500">{t('triggerInfo.support')}</span>: {t('triggerInfo.supportDesc')}</li>
                                                </ul>
                                            </li>
                                            <li>
                                                {t('triggerInfo.emailField')}
                                                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-red-500 dark:text-red-400">contato@seudominio.com</code>
                                            </li>
                                            <li>
                                                {t('triggerInfo.selectApi')}
                                            </li>
                                            <li>
                                                {t('triggerInfo.save')}
                                            </li>
                                            <li>
                                                {t('triggerInfo.dnsNote')}
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('email')}<span className='text-red-500'>*</span>
                                </label>
                                <input type="email" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={triggerForm.email} onChange={(e) => setTriggerForm({ ...triggerForm, email: e.target.value })} required placeholder={t('emailPlaceholder')} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('apiProvider')}</label>
                                <select className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={triggerForm.api_id} onChange={(e) => setTriggerForm({ ...triggerForm, api_id: parseInt(e.target.value) })}>
                                    <option value="">{t('selectItem')}</option>
                                    {emailApis.map(api => (
                                        <option key={api.id} value={api.id}>
                                            {api.api_server}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="triggerAtivo" checked={triggerForm.active} onChange={(e) => setTriggerForm({ ...triggerForm, active: e.target.checked })} />
                                <label htmlFor="triggerAtivo" className="text-sm font-medium">{tCommon('activate')}</label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant={'outline'} size={'default'} onClick={() => { setShowTriggerModal(false); resetTriggerForm(); setShowInfoTrigger(false); }}>
                                {tCommon('cancel')}
                            </Button>
                            <Button variant={'theme'} size={'default'} onClick={handleSaveTrigger} disabled={!triggerForm.trigger_type || !triggerForm.email || saveLoading}>
                                <FaSave className="h-4 w-4 mx-1" />
                                {saveLoading ? (editTriggerMode ? tCommon('updating') : tCommon('saving')) : (editTriggerMode ? tCommon('update') : tCommon('save'))}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default EmailComponent;
