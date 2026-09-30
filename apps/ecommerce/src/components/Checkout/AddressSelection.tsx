'use client';
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from 'next-intl';
import { apiFetch, resolveApiErrorKey, validateAddress } from "@/lib/utils";
import { IAddress, ICreateAddress, AddressFormState } from "@/lib/schemas/user";
import { useToast } from '@/components/ToastSystem';
import { CountryCode } from "@/lib/types/generic";
import { AddressFields } from "../AddressFields/AddressFields";


const EMPTY_ADDRESS: AddressFormState = {
    zip: '',
    street: '',
    address_number: '',
    country_code: '',
    complement: '',
    neighborhood: '',
    city: '',
    address_state: '',
    address_primary: false,
};

interface AddressSelectionProps {
    addresses: IAddress[];
    selectedAddress: IAddress | null;
    setSelectedAddress: (address: IAddress) => void;
    setAddresses: React.Dispatch<React.SetStateAction<IAddress[]>>;
    user: { id: number; country: CountryCode;[key: number]: any };
}

export const AddressSelection = ({ addresses, selectedAddress, setSelectedAddress, setAddresses, user }: AddressSelectionProps) => {
    const t = useTranslations('AddressSelection');
    const [showForm, setShowForm] = useState(false);
    const [showFullList, setShowFullList] = useState(false);
    const [newAddress, setNewAddress] = useState<AddressFormState>(EMPTY_ADDRESS);
    const [saveLoading, setSaveLoading] = useState(false);
    const [zipValid, setZipValid] = useState(false);
    const { showAlert } = useToast();

    useEffect(() => {
        if (!selectedAddress && addresses.length > 0) {
            const primary = addresses.find((a) => a.address_primary) || addresses[0];
            setSelectedAddress(primary);
        }
    }, [selectedAddress, addresses, setSelectedAddress]);

    const addAddress = async () => {
        setSaveLoading(true);

        const { valid, errors } = validateAddress(user.country, newAddress, zipValid);
        if (!valid) {
            if (errors.zip === 'invalid') {
                showAlert('warning', t('invalidZipBeforeSave'));
            } else {
                showAlert('warning', t('missingRequiredFields'));
            }
            return;
        }

        const formattedZip = newAddress.zip && newAddress.zip.replace(/\D/g, '');
        const isFirstAddress = addresses.length === 0;
        const addressToSave: Partial<ICreateAddress> = {
            ...newAddress,
            zip: formattedZip as string,
            address_primary: isFirstAddress ? true : Boolean(newAddress.address_primary),
        };

        try {
            if (addressToSave.address_primary) {
                setAddresses((prev) =>
                    prev.map(address => ({ ...address, address_primary: false }))
                );
            }

            const result = await apiFetch('/api/user/address', { method: 'POST', body: JSON.stringify(addressToSave) });
            const { success, error, code, data } = result;
            if (!success) {
                const key = resolveApiErrorKey(code);
                showAlert('warning', key ? t(`errors.${key}`) : error);
                return;
            }

            setAddresses((prev) => [...prev, data]);
            setSelectedAddress(data);
            showAlert('success', t('addressRegistered'));
            setTimeout(() => {
                setShowForm(false);
            }, 2500);

        } catch (error: any) {
            showAlert('warning', error.message || t('errors.genericFailure'));
        }

        setNewAddress(EMPTY_ADDRESS);
        setZipValid(false);
        setSaveLoading(false)
    };

    return (
        <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white">{addresses.length > 0 && (t('deliveryAddress'))}</h3>

            {/* Currently selected address */}
            {addresses.length > 0 && selectedAddress && (
                <div className="border rounded-lg p-4 border-primary bg-primary/5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                                {selectedAddress.street}, {selectedAddress.address_number}
                                {selectedAddress.complement && `, ${selectedAddress.complement}`}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                {selectedAddress.neighborhood}, {selectedAddress.city} - {selectedAddress.address_state}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{t('zipCode')}: {selectedAddress.zip}</p>
                        </div>
                        {selectedAddress.address_primary ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-white">{t('primary')}</span>
                        ) : null}

                        <Check className="h-5 w-5 text-primary" />
                    </div>
                </div>
            )}

            {/* Toggle to show other addresses or add a new one */}
            <div className="space-y-2">
                <Button type="button" variant="outline" className="w-full border-border hover:bg-hover/50 flex items-center justify-center gap-2" onClick={() => setShowFullList(!showFullList)}>
                    <ChevronDown className="h-4 w-4" />
                    {showFullList ? t('hideOptions') : addresses.length > 0 ? (t('changeAddress')) : (t('updateData'))}
                </Button>

                {showFullList && (
                    <>
                        {/* Full address list */}
                        <div className="space-y-2">
                            {addresses
                                .filter((a) => a.id !== selectedAddress?.id)
                                .map((address) => (
                                    <div key={address.id} className="border rounded-lg p-4 cursor-pointer border-gray-200 dark:border-gray-700" onClick={() => { setSelectedAddress(address); setShowFullList(false); }}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {address.street}, {address.address_number}
                                                    {address.complement && `, ${address.complement}`}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                                    {address.neighborhood}, {address.city} - {address.address_state}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">{t('zipCode')}: {address.zip}</p>
                                            </div>
                                            {address.address_primary ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-white">{t('primary')}</span>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {/* Add new address */}
                        <Button type="button" variant="outline" className="w-full mt-2 border border-border hover:bg-hover/50" onClick={() => { setShowForm(true); setShowFullList(false); }}>+ {t('addNewAddress')}</Button>
                    </>
                )}
            </div>

            {/* New address form */}
            {showForm && (
                <div className="mt-4 p-4 border border-border rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">{t('addNewAddress')}</h4>

                    <div className="grid grid-cols-1 gap-4">

                        <AddressFields country={user.country} address={newAddress} setAddress={setNewAddress} validZip={zipValid} setValidZip={setZipValid} loading={false} />

                        <div className="flex items-center">
                            <input type="checkbox" id="address_primary" name="address_primary" checked={newAddress.address_primary} onChange={(e) => setNewAddress(prev => ({ ...prev, address_primary: e.target.checked }))} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
                            <label htmlFor="address_primary" className="ml-2 block text-sm">{t('setAsPrimary')}</label>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant={'outline'} size={'default'} onClick={() => { setShowForm(false); setShowFullList(true); }}>{t('cancel')}</Button>
                            <Button variant={'theme'} size={'default'} onClick={addAddress} disabled={!newAddress.zip || !newAddress.street || !newAddress.address_number || saveLoading}>{t('save')}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
