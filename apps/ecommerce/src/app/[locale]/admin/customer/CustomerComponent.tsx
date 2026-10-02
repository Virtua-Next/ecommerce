'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { FaPencilAlt, FaTrash, FaPlus, FaEyeSlash, FaEye, FaHome, FaEllipsisV, FaSave } from 'react-icons/fa';
import { useAdminConfig } from '@/context/AdminConfigContext';
import { apiFetch, extractData, limparNumero, resolveApiErrorKey, toBoolean, validateAddress } from '@/lib/utils';
import TableBuilder from '@/components/TableBuilder/TableBuilder';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import AdminSearch from '@/components/Features/admin-search';
import { useToast } from '@/components/ToastSystem';
import { useRouter } from '@/i18n/navigation';
import { IUser, ICreateUser, EMPTY_USER, IAddress, AddressFormState, EMPTY_ADDRESS } from '@/lib/schemas/user';
import { SUPPORTED_COUNTRIES, COUNTRY_LABELS, ADMIN_PAGINATION_DEFAULT, SUPPORTED_LANGUAGES, LANGUAGE_LABELS, DEFAULT_COUNTRY } from '@/lib/constants';
import { CountryCode, SupportedLanguage } from '@/lib/types/generic';
import { COUNTRY_CONFIGS } from '@/lib/schemas/country-configs';
import Pagination from '@/components/Pagination/Pagination';
import { AddressFields } from '@/components/AddressFields/AddressFields';
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { loginHref } from '@/i18n/routing';


type AddressFormMode = 'create' | 'edit';
type AddressDraft = AddressFormState & {
    id?: number;
    user_id: number;
    country_code: CountryCode;
};

const CustomerComponent = React.memo(function CustomerComponent() {
    const t = useTranslations('CustomerAdmin');
    const tCommon = useTranslations('AdminCatalog');
    const tErrors = useTranslations('Errors');
    const locale = useLocale() as SupportedLanguage;
    const { loading: configLoading } = useAdminConfig();
    const { showAlert } = useToast();
    const router = useRouter();
    const { searchTerm } = useGlobalSearch();
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [customers, setCustomers] = useState<IUser[]>([]);
    const [addresses, setAddresses] = useState<IAddress[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [limit, setLimit] = useState<number>(ADMIN_PAGINATION_DEFAULT);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState<ICreateUser & { id?: number; uuid?: string }>(EMPTY_USER);
    const [newPassword, setNewPassword] = useState('');
    const [changePassword, setChangePassword] = useState(false);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [addressMode, setAddressMode] = useState<AddressFormMode>('create');
    const [addressForm, setAddressForm] = useState<AddressDraft | null>(null);
    const [addressValidZip, setAddressValidZip] = useState(false);
    const isMountedRef = useRef(true);
    const abortControllerRef = useRef<AbortController | null>(null);
    const formConfig = COUNTRY_CONFIGS[form.country as CountryCode];
    const addressCountry = addressForm?.country_code ?? null;

    const loadData = useCallback(async (pageNum: number, limitNum: number) => {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            setLoading(true);
            const data = await apiFetch(`/api/admin/customer?locale=${locale}&page=${pageNum}&limit=${limitNum}`, {
                method: 'GET',
                signal: abortController.signal
            });
            const result = extractData(data, 'object') as {
                customers: IUser[];
                addresses: IAddress[];
                total: number;
                page: number;
                limit: number;
                totalPages: number;
            };

            if (isMountedRef.current) {
                setCustomers(result.customers || []);
                setAddresses(result.addresses || []);
                setTotal(result.total || 0);
                setTotalPages(result.totalPages || 1);
                setPage(result.page || 1);
                setLimit(result.limit || ADMIN_PAGINATION_DEFAULT);
            }
        } catch (err: any) {
            if (err.name === 'AbortError' || !isMountedRef.current) return;

            if (err.status === 401 || err.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/customer'));
                });
            } else {
                console.error('Failed to fetch customers', err);
                setError(err.message || tCommon('loadError'));
                showAlert(err.status === 400 || err.status === 404 ? 'warning' : 'danger', tCommon('loadError') ?? err.message);
            }
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [locale, showAlert, tCommon, router]);

    useEffect(() => {
        isMountedRef.current = true;

        if (!configLoading) {
            loadData(page, limit);
        }

        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [locale, configLoading, page, limit, loadData]);

    const goToPage = useCallback((newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
            setPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [page, totalPages]);

    const handleLimitChange = useCallback((newLimit: number) => {
        setLimit(newLimit);
        setPage(1);
    }, []);

    const resetUserForm = useCallback(() => {
        setForm(EMPTY_USER);
        setNewPassword('');
        setChangePassword(false);
        setEditMode(false);
    }, []);

    const openEditModal = useCallback((row: IUser) => {
        setForm({ ...row });
        setNewPassword('');
        setEditMode(true);
        setShowModal(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleCountryChange = useCallback((country: CountryCode) => {
        setForm(prev => ({ ...prev, country, tax_id: '' }));
    }, []);

    const handleSaveCustomer = useCallback(async () => {
        setSaveLoading(true);
        try {
            const cleanTaxId = form.tax_id ? limparNumero(form.tax_id) : null;
            const cleanPhone = form.phone ? limparNumero(form.phone) : null;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(form.email)) {
                showAlert('warning', t('alerts.invalidEmail'));
                return;
            }
            if (!form.user_name?.trim() || !form.email?.trim()) {
                showAlert('warning', t('alerts.requiredFields'));
                return;
            }

            if (cleanTaxId && !formConfig.validateTaxId(cleanTaxId)) {
                showAlert('warning', t('alerts.invalidTaxId', { label: formConfig.taxIdLabel }));
                return;
            }

            if (!editMode && !newPassword) {
                showAlert('warning', t('alerts.passwordRequired'));
                return;
            }

            if (!editMode && newPassword.length < 8) {
                showAlert('warning', t('alerts.passwordTooShort'));
                return;
            }

            const payload: Partial<ICreateUser> & { user_password?: string } = {
                user_name: form.user_name,
                email: form.email,
                country: form.country,
                tax_id: cleanTaxId ?? null,
                phone: cleanPhone ?? null,
                profile_id: form.profile_id,
                active: toBoolean(form.active),
                preferred_language: form.preferred_language,
            };
            if (!editMode) {
                if (!newPassword) {
                    showAlert('warning', t('alerts.passwordRequired'));
                    return;
                }
                payload.user_password = newPassword;
            } else if (changePassword && newPassword) {
                payload.user_password = newPassword;
            }

            const url = editMode ? `/api/admin/customer/${form.uuid}` : '/api/admin/customer';
            const method = editMode ? 'PUT' : 'POST';

            const result = await apiFetch(url, { method, body: JSON.stringify(payload) });
            const savedUser = extractData(result, 'object') as IUser;

            if (isMountedRef.current) {
                if (editMode) {
                    setCustomers(prev => prev.map(c => c.uuid === savedUser.uuid ? savedUser : c));
                } else {
                    setCustomers((prev) => [savedUser, ...prev]);
                }
                setShowModal(false);
                resetUserForm();
                showAlert('success', t('alerts.saveSuccess'));
            }
        } catch (err: any) {
            if (!isMountedRef.current) return;

            const status = err.status ?? 500;
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;
            if (status === 401 || status === 403) {
                showAlert('danger', message, () => {
                    router.push(loginHref('/admin/customer'));
                });
                return;
            }
            showAlert(status === 400 || status === 404 ? 'warning' : 'danger', message);

        } finally {
            if (isMountedRef.current) setSaveLoading(false);
        }
    }, [form, newPassword, editMode, formConfig, resetUserForm, showAlert, t, tCommon, router, loadData, page, limit]);

    const handleDelete = useCallback(async (uuid: string) => {
        if (!confirm(tCommon('confirmDelete'))) return;

        try {
            await apiFetch(`/api/admin/customer/${uuid}`, { method: 'DELETE' });
            if (isMountedRef.current) {
                setCustomers(prev => prev.filter(cli => cli.uuid !== uuid));
                showAlert('success', t('alerts.deleteSuccess'));
            }
        } catch (err: any) {
            if (!isMountedRef.current) return;

            const status = err.status || 500;
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;
            if (status === 401 || status === 403) {
                showAlert('danger', message, () => {
                    router.push(loginHref('/admin/customer'));
                });
                return;
            }
            showAlert(status === 400 || status === 404 ? 'warning' : 'danger', message);
        }
    }, [tCommon, t, showAlert, router, loadData, page, limit]);

    const toggleActive = useCallback(async (row: IUser) => {
        setSaveLoading(true);
        try {
            const newStatus = !row.active;
            const result = await apiFetch(`/api/admin/customer/${row.uuid}`, {
                method: 'PUT',
                body: JSON.stringify({ active: newStatus }),
            });
            const updated = extractData(result, 'object') as IUser;

            if (isMountedRef.current) {
                setCustomers(prev => prev.map(c => c.uuid === row.uuid ? updated : c));
                showAlert('success', t('alerts.saveSuccess'));
            }
        } catch (err: any) {
            if (!isMountedRef.current) return;

            const status = err.status ?? 500;
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;
            if (status === 401 || status === 403) {
                showAlert('danger', message, () => {
                    router.push(loginHref('/admin/customer'));
                });
                return;
            }
            showAlert(status === 400 || status === 404 ? 'warning' : 'danger', message);

        } finally {
            if (isMountedRef.current) setSaveLoading(false);
        }
    }, [showAlert, t, tCommon, router]);


    // ---- Addresses ----


    const openAddressModal = useCallback((user: IUser, mode: AddressFormMode, existing?: IAddress) => {
        const userCountry = user.country;

        if (mode === 'create') {
            setAddressForm({ ...EMPTY_ADDRESS, user_id: user.id, address_primary: false, country_code: userCountry });
        } else if (existing) {
            setAddressForm({
                ...existing,
                user_id: user.id,
                country_code: (existing.country_code || userCountry) as CountryCode,
            });
        } else {
            const primary = addresses.find(a => a.user_id === user.id && a.address_primary);
            setAddressForm(
                primary
                    ? { ...primary, user_id: user.id, country_code: (primary.country_code || userCountry) as CountryCode }
                    : { ...EMPTY_ADDRESS, user_id: user.id, address_primary: false, country_code: userCountry }
            );
        }

        setAddressValidZip(true);
        setAddressMode(mode);
        setShowAddressModal(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [addresses]);

    const handleSaveAddress = useCallback(async () => {
        if (!addressForm) return;
        setSaveLoading(true);

        const { valid, errors } = validateAddress(form.country, addressForm, addressValidZip);
        if (!valid) {
            if (errors.zip === 'invalid') {
                showAlert('warning', t('alerts.invalidZipBeforeSave'));
            } else {
                showAlert('warning', t('missingRequiredFields'));
            }
            return;
        }

        try {
            addressForm.address_primary = toBoolean(addressForm.address_primary);
            const payload = { ...addressForm };

            const url = addressForm.id ? `/api/admin/customer/address/${addressForm.id}` : '/api/admin/customer/address';
            const method = addressForm.id ? 'PUT' : 'POST';

            const result = await apiFetch(url, { method, body: JSON.stringify(payload) });
            const saved = extractData(result, 'object') as IAddress;

            if (isMountedRef.current) {
                setAddresses(prev => {
                    const withoutOld = prev.filter(a => a.id !== saved.id);
                    const adjusted = saved.address_primary
                        ? withoutOld.map(a => a.user_id === saved.user_id ? { ...a, address_primary: false } : a)
                        : withoutOld;
                    return [...adjusted, saved];
                });
                setShowAddressModal(false);
                showAlert('success', t('alerts.addressSaveSuccess'));
            }
        } catch (err: any) {
            if (!isMountedRef.current) return;

            const status = err.status || 500;
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;
            if (status === 401 || status === 403) {
                showAlert('danger', message, () => {
                    router.push(loginHref('/admin/customer'));
                });
                return;
            }
            showAlert(status === 400 || status === 404 ? 'warning' : 'danger', message);

        } finally {
            if (isMountedRef.current) setSaveLoading(false);
        }
    }, [addressForm, showAlert, t, tCommon, router]);

    const handleDeleteAddress = useCallback(async (addressId: number) => {
        if (!confirm(tCommon('confirmDelete'))) return;

        try {
            await apiFetch(`/api/admin/customer/address/${addressId}`, { method: 'DELETE' });
            if (isMountedRef.current) {
                setAddresses(prev => prev.filter(a => a.id !== addressId));
                showAlert('success', t('alerts.addressDeleteSuccess'));
            }
        } catch (err: any) {
            if (!isMountedRef.current) return;

            const status = err.status || 500;
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;
            if (status === 401 || status === 403) {
                showAlert('danger', message, () => {
                    router.push(loginHref('/admin/customer'));
                });
                return;
            }
            showAlert(status === 400 || status === 404 ? 'warning' : 'danger', message);

        }
    }, [tCommon, t, showAlert, router]);

    const filteredCustomers = useMemo(() => {
        const search = searchTerm.toLowerCase();
        return customers.filter(c =>
            searchTerm === '' ||
            c.id?.toString().includes(search) ||
            c.user_name?.toLowerCase().includes(search) ||
            c.email?.toLowerCase().includes(search) ||
            c.phone?.toLowerCase().includes(search)
        );
    }, [customers, searchTerm]);

    const columns = useMemo(() => [
        { key: 'id', header: 'ID', className: 'w-[80px]' },
        { key: 'user_name', header: t('fields.fullName'), render: (name: string) => <span className="font-medium">{name}</span> },
        { key: 'email', header: t('fields.email'), render: (email: string) => <span className="font-medium">{email}</span> },
        { key: 'country', header: t('fields.country'), render: (country: CountryCode) => <span>{COUNTRY_LABELS[country]}</span> },
        {
            key: 'phone',
            header: t('fields.phone'),
            render: (phone: string, row: IUser) => {
                const cfg = COUNTRY_CONFIGS[row.country as CountryCode];
                return <span className="font-medium">{phone ? cfg.formatPhone(phone) : ''}</span>;
            }
        },
        {
            key: 'actions',
            header: tCommon('actions'),
            render: (_: any, row: IUser) => {
                const userAddresses = addresses.filter(a => a.user_id === row.id);
                return (
                    <div className="flex gap-2 justify-end items-center">
                        <div className="relative">
                            <div className='inline-flex'>
                                <button className="text-gray-600 hover:text-gray-800" title={tCommon('options')}>
                                    <FaEllipsisV className="h-5 w-5" onClick={() => setOpenMenuId(prev => (prev === row.id ? null : row.id))} />
                                </button>
                            </div>
                            {openMenuId === row.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md border border-gray-200 z-50">
                                    <div className="py-1">
                                        <button onClick={() => { openEditModal(row); setOpenMenuId(null); }} className="text-blue-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100" title={t('editCustomer')}>
                                            <FaPencilAlt className="inline h-4 w-4 mr-2" />
                                            {t('editCustomer')}
                                        </button>

                                        <div className="relative group">
                                            <button className="flex items-center text-blue-400 hover:text-blue-600 px-4 py-2 w-full" title={userAddresses.length > 0 ? `${t('addresses')} (${userAddresses.length})` : t('addAddress')} onClick={() => openAddressModal(row, 'create')}>
                                                <FaHome className="h-4 w-4 mr-2" />
                                                {t('addresses')}
                                                {userAddresses.length > 0 && (
                                                    <span className="ml-auto bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{userAddresses.length}</span>
                                                )}
                                            </button>
                                            {userAddresses.length > 0 && (
                                                <div className="hidden absolute group-hover:block right-0 top-0 w-80 bg-white rounded-md shadow-lg z-50">
                                                    <div className="py-1">
                                                        {userAddresses.map((addr) => (
                                                            <div key={addr.id} className='flex justify-between items-center'>
                                                                <button onClick={() => { openAddressModal(row, 'edit', addr); setOpenMenuId(null); }} className="block text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex-1">
                                                                    {addr.address_primary ? '⭐ ' : ''}
                                                                    {addr.street}, {addr.address_number}
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteAddress(addr.id); }}>
                                                                    <FaTrash className='text-red-500 mr-2' />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => openAddressModal(row, 'create')} className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100">
                                                            <FaPlus className="inline mr-1" />
                                                            {tCommon('add')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <button onClick={() => { handleDelete(row.uuid); setOpenMenuId(null); }} className="text-red-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100" title={t('deleteCustomer')}>
                                            <FaTrash className="inline h-4 w-4 mr-2" />
                                            {t('deleteCustomer')}
                                        </button>
                                        <button onClick={() => toggleActive(row)} className={`px-4 py-2 ${row.active ? 'text-green-500 hover:dark:text-gray-500' : 'text-gray-500 hover:text-green-500'} block mr-2 text-sm w-full text-left`} title={row.active ? tCommon('deactivate') : tCommon('activate')}>
                                            {row.active ? <FaEye className="inline h-4 w-4 mr-2" /> : <FaEyeSlash className="inline h-4 w-4 mr-2" />}
                                            {row.active ? tCommon('deactivate') : tCommon('activate')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            },
            className: 'text-right'
        }
    ], [t, tCommon, addresses, openEditModal, handleDelete, openAddressModal, handleDeleteAddress, toggleActive, openMenuId]);

    if (loading) return <div>{tCommon('loading')}</div>;

    if (error) return (
        <div>
            <h1 className="text-2xl font-bold mb-6">{t('pageTitle')}</h1>
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <p>{tCommon('loadError')}</p>
                <p className="text-sm mt-1">{error}</p>
            </div>
        </div>
    );

    return (
        <div>
            <div className="block lg:hidden max-w-fit p-3">
                <AdminSearch />
            </div>

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold ml-3">{t('pageTitle')}</h1>
                <Button variant={'theme'} size={'default'} onClick={() => { resetUserForm(); setShowModal(true); }} className="mr-3">
                    <FaPlus className="h-4 w-4" />
                    {tCommon('add')}
                </Button>
            </div>

            <TableBuilder data={filteredCustomers} columns={columns} emptyMessage={t('noEntities')} />

            <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={limit} onPageChange={goToPage} onItemsPerPageChange={handleLimitChange} itemsPerPageOptions={[20, 50, 100]} showItemsPerPage={true} showTotalItems={true} />

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-xl">
                        <h2 className="text-xl font-bold mb-4">{editMode ? t('editCustomer') : tCommon('add')}</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('fields.fullName')}<span className='text-red-500'>*</span></label>
                                <input type="text" className="w-full p-2 border rounded dark:bg-gray-700" value={form.user_name} onChange={(e) => setForm({ ...form, user_name: e.target.value })} required />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('fields.email')}<span className='text-red-500'>*</span></label>
                                <input type="email" className="w-full p-2 border rounded dark:bg-gray-700" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('fields.country')}<span className='text-red-500'>*</span></label>
                                <select className="w-full p-2 border rounded dark:bg-gray-700" value={form.country} onChange={(e) => handleCountryChange(e.target.value as CountryCode)}>
                                    {SUPPORTED_COUNTRIES.map((c) => (
                                        <option key={c} value={c}>{COUNTRY_LABELS[c]}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{formConfig.taxIdLabel}</label>
                                <input type="text" className="w-full p-2 border rounded dark:bg-gray-700" value={form.tax_id ?? ''} onChange={(e) => setForm({ ...form, tax_id: formConfig.formatTaxId(e.target.value) })} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('fields.phone')}</label>
                                <input type="tel" className="w-full p-2 border rounded dark:bg-gray-700" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: formConfig.formatPhone(e.target.value) })} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('fields.preferredLanguage')}</label>
                                <select className="w-full p-2 border rounded dark:bg-gray-700" value={form.preferred_language} onChange={(e) => setForm({ ...form, preferred_language: e.target.value as SupportedLanguage })}>
                                    {SUPPORTED_LANGUAGES.map((lang) => (
                                        <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                {editMode && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <input type="checkbox" id="changePassword" checked={changePassword} className="h-4 w-4 text-blue-600 rounded"
                                            onChange={(e) => {
                                                setChangePassword(e.target.checked);
                                                if (!e.target.checked) setNewPassword('');
                                            }}
                                        />
                                        <label htmlFor="changePassword" className="block text-sm font-medium">
                                            {t('fields.changePassword')}
                                        </label>
                                    </div>
                                )}


                                {(changePassword || !editMode) && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {editMode ? t('fields.newPassword') : t('fields.password')}
                                            <span className='text-red-500'>*</span>
                                        </label>
                                        <input type="password" className="w-full p-2 border rounded dark:bg-gray-700" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder={t('fields.enterNewPassword')} />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('fields.profile')}</label>
                                <select className="w-full p-2 border rounded dark:bg-gray-700" value={form.profile_id} onChange={(e) => setForm({ ...form, profile_id: Number(e.target.value) })}>
                                    <option value={2}>{t('profileCustomer')}</option>
                                    <option value={1}>{t('profileAdmin')}</option>
                                </select>
                            </div>

                            <div className="flex items-center">
                                <input type="checkbox" id="active" className="h-4 w-4 text-blue-600 rounded" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                                <label htmlFor="active" className="ml-2 block text-sm font-medium">{tCommon('active')}</label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant={'outline'} size={'default'} onClick={() => { setShowModal(false); resetUserForm(); }}>{tCommon('cancel')}</Button>
                            <Button variant={'theme'} size={'default'} onClick={handleSaveCustomer} disabled={!form.user_name || !form.email || (!editMode && !newPassword) || saveLoading}>
                                <FaSave className="h-4 w-4 mx-1" />
                                {saveLoading ? (editMode ? tCommon('updating') : tCommon('saving')) : (editMode ? tCommon('update') : tCommon('save'))}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showAddressModal && addressForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
                        <h2 className="text-xl font-bold mb-4">
                            {addressMode === 'create' ? t('addAddressTitle') : t('editAddressTitle')}
                        </h2>

                        <div className="grid gap-2">
                            <Label htmlFor="country">{t('fields.country')}<span className='text-primary'>*</span></Label>
                            <select id="country" required disabled={loading} className="bg-card border border-border rounded-md h-9 px-3" value={addressForm.country_code} onChange={(e) => setAddressForm(prev => prev ? { ...prev, country_code: e.target.value as CountryCode } : prev)}>
                                {SUPPORTED_COUNTRIES.map((c) => (
                                    <option key={c} value={c}>{COUNTRY_LABELS[c]}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AddressFields country={addressCountry ?? DEFAULT_COUNTRY} address={addressForm} setAddress={(addr) => setAddressForm(prev => prev ? { ...prev, ...addr, country_code: addr.country_code as CountryCode } : prev)} validZip={addressValidZip} setValidZip={setAddressValidZip} loading={saveLoading} />

                            <div className="md:col-span-1 flex items-center">
                                <input type="checkbox" id="address_primary" className="h-4 w-4 text-blue-600 rounded" checked={addressForm.address_primary} onChange={(e) => setAddressForm({ ...addressForm, address_primary: e.target.checked })} />
                                <label htmlFor="address_primary" className="ml-2 block text-sm font-medium">{t('fields.primaryAddress')}</label>
                            </div>
                        </div>

                        <div className="flex justify-end mt-6 gap-2">
                            <Button variant={'outline'} size={'default'} onClick={() => setShowAddressModal(false)}>{tCommon('cancel')}</Button>
                            <Button variant={'theme'} size={'default'} onClick={handleSaveAddress} disabled={!addressForm.zip || !addressForm.street || !addressForm.address_number || saveLoading}>
                                <FaSave className="h-4 w-4 mx-1" />
                                {saveLoading ? (addressForm.id ? tCommon('updating') : tCommon('saving')) : (addressForm.id ? tCommon('update') : tCommon('save'))}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default CustomerComponent;
