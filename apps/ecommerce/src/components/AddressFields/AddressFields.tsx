'use client';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAddressByCep } from "@/lib/utils";
import { useToast } from '@/components/ToastSystem';
import { AddressFormState } from '@/lib/schemas/user';
import { COUNTRY_CONFIGS } from '@/lib/schemas/country-configs';
import { CountryCode } from '@/lib/types/generic';


interface AddressFieldsProps {
    country: CountryCode;
    address: AddressFormState;
    setAddress: (address: AddressFormState) => void;
    validZip: boolean;
    setValidZip: (valid: boolean) => void;
    loading: boolean;
}

export function AddressFields({ country, address, setAddress, validZip, setValidZip, loading }: AddressFieldsProps) {
    const { showAlert } = useToast();
    const config = COUNTRY_CONFIGS[country];

    const handleZipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const zip = e.target.value.replace(/\D/g, '').slice(0, 8);
        setAddress({ ...address, zip });

        if (!config.hasZipLookup) {
            setValidZip(zip.length >= 4);
            return;
        }

        if (config.countryCode === 'BR' && zip.length === 8) {
            try {
                const controller = new AbortController();
                const found = await fetchAddressByCep(zip, controller.signal);
                if (found) {
                    setAddress({
                        ...address,
                        zip,
                        street: found.street,
                        neighborhood: found.neighborhood,
                        city: found.city,
                        address_state: found.address_state,
                    });
                    setValidZip(true);
                    showAlert('success', 'CEP válido! Endereço preenchido automaticamente.');
                } else {
                    setValidZip(false);
                    showAlert('warning', 'CEP não encontrado. Por favor, verifique o número.');
                }
            } catch (error) {
                console.error('Erro ao buscar CEP:', error);
                setValidZip(false);
                showAlert('danger', 'Erro ao consultar CEP. Tente novamente.');
            }
        } else {
            setValidZip(false);
        }
    };

    const zipFilled = address.zip.length > 0;
    const lockedByLookup = config.hasZipLookup && validZip;

    return (
        <>
            {config.hasZipLookup && (
                <div className="text-sm text-secondary">
                    <p>preencher apenas o {config.addressLabels.zip}, número e complemento (se houver)</p>
                </div>
            )}

            {config.addressFields.includes('zip') && (
                <div className="grid gap-2">
                    <Label htmlFor="end_cep">{config.addressLabels.zip}<span className='text-primary'>*</span></Label>
                    <Input required disabled={loading} type="text" id="end_cep" placeholder={`Digite seu ${config.addressLabels.zip}`}
                        value={address.zip} maxLength={9}
                        className={`bg-card border ${!zipFilled ? 'border-border' :
                            validZip ? 'border-green-500 focus-visible:ring-green-500 focus-visible:border-green-500' :
                                'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500'
                            }`}
                        onChange={handleZipChange}
                    />
                </div>
            )}

            {config.addressFields.includes('street') && (
                <div className="grid gap-2">
                    <Label htmlFor="end_logradouro">{config.addressLabels.street}<span className='text-primary'>*</span></Label>
                    <Input className='bg-card border border-border' id="end_logradouro" type="text" required
                        value={address.street}
                        onChange={(e) => setAddress({ ...address, street: e.target.value })}
                        disabled={loading || lockedByLookup} />
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                {config.addressFields.includes('address_number') && (
                    <div className="grid gap-2">
                        <Label htmlFor="end_numero">{config.addressLabels.address_number}<span className='text-primary'>*</span></Label>
                        <Input className='bg-card border border-border' id="end_numero" type="text" required
                            value={address.address_number}
                            onChange={(e) => setAddress({ ...address, address_number: e.target.value })}
                            disabled={loading} />
                    </div>
                )}
                {config.addressFields.includes('complement') && (
                    <div className="grid gap-2">
                        <Label htmlFor="end_complemento">{config.addressLabels.complement}</Label>
                        <Input className='bg-card border border-border' id="end_complemento" type="text"
                            value={address.complement ?? ''}
                            onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                            disabled={loading} />
                    </div>
                )}
            </div>

            {config.addressFields.includes('neighborhood') && (
                <div className="grid gap-2">
                    <Label htmlFor="end_bairro">{config.addressLabels.neighborhood}
                        {['BR'].includes(country) && (
                            <span className='text-primary'>*</span>
                        )}
                    </Label>
                    <Input className='bg-card border border-border' id="end_bairro" type="text" required={['BR'].includes(country)}
                        value={address.neighborhood ?? ''}
                        onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                        disabled={loading || lockedByLookup} />
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                {config.addressFields.includes('city') && (
                    <div className="grid gap-2">
                        <Label htmlFor="end_cidade">{config.addressLabels.city}<span className='text-primary'>*</span></Label>
                        <Input className='bg-card border border-border' id="end_cidade" type="text" required
                            value={address.city}
                            onChange={(e) => setAddress({ ...address, city: e.target.value })}
                            disabled={loading || lockedByLookup} />
                    </div>
                )}
                {config.addressFields.includes('address_state') && (
                    <div className="grid gap-2">
                        <Label htmlFor="end_estado">{config.addressLabels.address_state}<span className='text-primary'>*</span></Label>
                        <Input className='bg-card border border-border' id="end_estado" type="text" required
                            value={address.address_state}
                            onChange={(e) => setAddress({ ...address, address_state: e.target.value.toUpperCase() })}
                            disabled={loading || lockedByLookup}
                            maxLength={country === 'BR' ? 2 : undefined} />
                    </div>
                )}
            </div>
        </>
    );
}
