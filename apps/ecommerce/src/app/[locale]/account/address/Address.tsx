'use client'
import { FaMapMarkerAlt, FaEdit, FaPlus, FaTrash, FaCheck } from 'react-icons/fa'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl';
import { IAddress, AddressFormState, EMPTY_ADDRESS } from '@/lib/schemas/user'
import { apiFetch, extractData, resolveApiErrorKey, toBoolean, validateAddress } from '@/lib/utils'
import { useConfig } from '@/context/ConfigContext'
import { useRouter } from '@/i18n/navigation';
import { useToast } from '@/components/ToastSystem';
import { AddressFields } from '@/components/AddressFields/AddressFields'
import { CountryCode } from '@/lib/types/generic'


interface AddressListProps {
    initialAddresses: IAddress[];
}

export default function AddressList({ initialAddresses }: AddressListProps) {
    const t = useTranslations('AccountAddress');
    const tErrors = useTranslations('Errors');
    const router = useRouter();
    const { user, loading } = useConfig();
    const [addresses, setAddresses] = useState(initialAddresses);
    const isMountedRef = useRef(true);
    const formRef = useRef<HTMLDivElement>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [zipValid, setZipValid] = useState<boolean>(false);
    const [showForm, setShowForm] = useState<boolean>(false);
    const [editMode, setEditMode] = useState<boolean>(false)
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formAddress, setFormAddress] = useState<AddressFormState>(EMPTY_ADDRESS);
    const defaultAddressAbortControllerRef = useRef<AbortController | null>(null);
    const deleteAddressAbortControllerRef = useRef<AbortController | null>(null);
    const { showAlert } = useToast();

    const handleSetPrimary = async (addressId: number) => {
        if (!user) return;

        defaultAddressAbortControllerRef.current?.abort();
        const abortController = new AbortController();
        defaultAddressAbortControllerRef.current = abortController;

        try {
            await apiFetch(`/api/user/address/${addressId}`, { method: 'PUT', body: JSON.stringify({ address_primary: true }), signal: abortController.signal });

            if (isMountedRef.current) {
                setAddresses(prev => prev.map(addr => ({
                    ...addr,
                    address_primary: addr.id === addressId
                })));
                showAlert('success', t('alerts.setPrimarySuccess'));
            }
        } catch (err: any) {
            if (err.name === 'AbortError' || !isMountedRef.current) return;

            const status = err.status ?? 500;
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;
            if (status === 401 || status === 403) {
                showAlert('danger', message, () => {
                    router.push({ pathname: '/login?callback=/account/address' });
                });
                return;
            }
            showAlert(status === 400 || status === 404 ? 'warning' : 'danger', message);

        } finally {
            if (defaultAddressAbortControllerRef.current === abortController) {
                defaultAddressAbortControllerRef.current = null;
            }
        }
    };

    const handleDeleteAddress = async (addressId: number) => {
        if (!user) return;
        if (!confirm(t('confirmDelete'))) return;

        deleteAddressAbortControllerRef.current?.abort();
        const abortController = new AbortController();
        deleteAddressAbortControllerRef.current = abortController;

        try {
            await apiFetch(`/api/user/address/${addressId}`, { method: 'DELETE', signal: abortController.signal });
            if (isMountedRef.current) {
                setAddresses(prev => prev.filter(addr => addr.id !== addressId));
                showAlert('success', t('alerts.deleteSuccess'));
            }
        } catch (err: any) {
            if (err.name === 'AbortError' || !isMountedRef.current) return;

            const status = err.status ?? 500;
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;
            if (status === 401 || status === 403) {
                showAlert('danger', message, () => {
                    router.push({ pathname: '/login?callback=/account/address' });
                });
                return;
            }
            showAlert(status === 400 || status === 404 ? 'warning' : 'danger', message);

        } finally {
            if (deleteAddressAbortControllerRef.current === abortController) {
                deleteAddressAbortControllerRef.current = null;
            }
        }
    };

    const handleSaveAddress = useCallback(async (addressId: number | null) => {
        if (!user) return;
        setSaveLoading(true);

        const { valid, errors } = validateAddress(user.country, formAddress, zipValid);

        if (!valid) {
            if (errors.zip === 'invalid') {
                showAlert('warning', t('alerts.zipNotFound'));
            } else {
                showAlert('warning', t('alerts.missingRequiredFields'));
            }
            return;
        }

        try {
            const payload: AddressFormState = {
                ...formAddress,
                address_primary: toBoolean(formAddress.address_primary),
                zip: formAddress.zip.replace(/\D/g, ''),
            };

            const url = editMode ? `/api/user/address/${addressId}` : '/api/user/address';
            const method = editMode ? 'PUT' : 'POST';

            const result = await apiFetch(url, { method: method, body: JSON.stringify(payload) })

            const data = extractData(result, 'array') as IAddress[];
            const savedAddress = data[0] ?? { ...payload, id: addressId, user_id: user?.id ?? 0 } as IAddress;

            if (isMountedRef.current) {
                if (editMode) {
                    setAddresses(prev => {
                        const next = payload.address_primary
                            ? prev.map(addr => ({ ...addr, address_primary: false }))
                            : prev;
                        return next.map(addr => addr.id === addressId ? { ...addr, ...savedAddress } : addr);
                    });
                } else {
                    setAddresses(prev => {
                        const next = payload.address_primary
                            ? prev.map(addr => ({ ...addr, address_primary: false }))
                            : prev;
                        return [...next, savedAddress];
                    });
                }

                showAlert('success', t('alerts.saveSuccess'));
                setFormAddress(EMPTY_ADDRESS);
                setShowForm(false);
            }

        } catch (err: any) {
            if (!isMountedRef.current) return;
            const status = err.status ?? 500;
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;
            if (status === 409) {
                showAlert('warning', message, () => setShowForm(false));
                return;
            }
            if (status === 401 || status === 403) {
                showAlert('danger', message, () => {
                    router.push({ pathname: '/login?callback=/account/address' });
                });
                return;
            }
            showAlert(status === 400 || status === 404 ? 'warning' : 'danger', message);

        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [editMode, formAddress, setShowForm, showAlert, t]);

    const openForm = () => {
        setShowForm(true);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    const startEdit = (address: IAddress) => {
        setEditMode(true);
        setEditingId(address.id);
        setFormAddress({
            zip: address.zip,
            street: address.street,
            address_number: address.address_number,
            country_code: address.country_code,
            complement: address.complement ?? '',
            neighborhood: address.neighborhood,
            city: address.city,
            address_state: address.address_state,
            address_primary: address.address_primary,
        });
        setZipValid(true);
        openForm();
    };

    if (loading) {
        return (
            <div className="text-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">{t('loading')}</p>
            </div>
        )
    }

    if (!user) return null;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <Button variant={'theme'} size={'default'} onClick={() => { setEditMode(false); setFormAddress(EMPTY_ADDRESS); setZipValid(false); openForm(); }}>
                    <FaPlus />
                    {t('addAddress')}
                </Button>
            </div>

            {addresses.length === 0 ? (
                <Card className="border border-border bg-card">
                    <CardContent className="p-6 text-center">
                        <div className="flex flex-col items-center justify-center gap-4">
                            <FaMapMarkerAlt className="h-12 w-12 text-primary" />
                            <p className="text-lg">{t('empty')}</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {addresses.map((address) => (
                        <Card key={address.id} className={`border bg-card ${address.address_primary ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40 hover:bg-hover'}`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="flex items-center gap-2">
                                        {address.address_primary ? (
                                            <span className="bg-primary/50 text-white px-2 py-1 rounded-md text-xs">{t('primary')}</span>
                                        ) : null}
                                        {address.street}, {address.address_number}
                                    </CardTitle>

                                    <div className="flex gap-2">
                                        <Button variant='theme' size="sm" onClick={() => startEdit(address)}>
                                            <FaEdit />
                                        </Button>

                                        {!address.address_primary && (
                                            <Button variant={'outline'} size={'sm'} onClick={() => handleDeleteAddress(address.id)}>
                                                <FaTrash className="h-4 w-4 text-red-500/70" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <div className="space-y-2">
                                    <p>{address.complement && `${address.complement}, `}{address.neighborhood}</p>
                                    <p>{address.city} - {address.address_state}</p>
                                    <p>{t('zipCode')}: {address.zip}</p>
                                </div>

                                {!address.address_primary && (
                                    <Button variant="outline" className="mt-4 w-full gap-2 border-border hover:bg-hover hover:border-primary/40" onClick={() => handleSetPrimary(address.id)}>
                                        <FaCheck /> {t('setAsPrimary')}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {showForm && (
                <div ref={formRef} className="mt-4 p-4 border border-border rounded-lg bg-card">
                    <h4 className="font-medium mb-3">{editMode ? t('editAddress') : t('addAddress')}</h4>
                    <div className="grid grid-cols-1 gap-4">
                        <AddressFields country={user?.country as CountryCode} address={formAddress} setAddress={setFormAddress} validZip={zipValid} setValidZip={setZipValid} loading={saveLoading} />

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="address_primary"
                                checked={formAddress.address_primary}
                                onChange={(e) => setFormAddress(prev => ({
                                    ...prev,
                                    address_primary: e.target.checked
                                }))}
                                className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                            />
                            <label htmlFor="address_primary" className="ml-2 text-sm">{t('setAsPrimary')}</label>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size={'default'} onClick={() => setShowForm(false)}>{t('buttons.cancel')}</Button>
                            <Button variant={'theme'} size={'default'} onClick={() => handleSaveAddress(editingId ?? null)} disabled={!formAddress.zip || !formAddress.street || !formAddress.address_number || saveLoading}>{saveLoading ? (editMode ? t('buttons.updating') : t('buttons.saving')) : (editMode ? t('buttons.update') : t('buttons.save'))}</Button>

                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
