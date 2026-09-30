'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, extractData, resolveApiErrorKey, validateAddress } from "@/lib/utils";
import { ICreateUser, EMPTY_ADDRESS, EMPTY_USER, AddressFormState } from '@/lib/schemas/user';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { SUPPORTED_COUNTRIES, COUNTRY_LABELS } from '@/lib/constants';
import { CountryCode } from '@/lib/types/generic';
import { COUNTRY_CONFIGS } from '@/lib/schemas/country-configs';
import { useToast } from '@/components/ToastSystem';
import { AddressFields } from '@/components/AddressFields/AddressFields';
import { useRouter, Link } from '@/i18n/navigation'
import { useTranslations, useLocale } from 'next-intl';


export function SignupForm() {
    const { showAlert } = useToast();
    const t = useTranslations('Register');
    const tErrors = useTranslations('Errors');
    const [newUser, setNewUser] = useState<ICreateUser>(EMPTY_USER);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [address, setAddress] = useState<AddressFormState>(EMPTY_ADDRESS);
    const [validZip, setValidZip] = useState(false);
    const locale = useLocale();
    const router = useRouter();
    const config = COUNTRY_CONFIGS[newUser.country as CountryCode];
    const handleCountryChange = (country: CountryCode) => {
        setNewUser({ ...newUser, country, tax_id: '' });
        setAddress(EMPTY_ADDRESS);
        setValidZip(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        address.country_code = newUser.country;
        const { valid, errors } = validateAddress(newUser.country, address, validZip);

        if (!valid) {
            if (errors.zip === 'invalid') {
                showAlert('warning', t('validation.invalidZip'));
            } else {
                showAlert('warning', t('validation.missingRequiredFields'));
            }
            return;
        }

        if (newUser.user_password !== confirmPassword) {
            showAlert('warning', t('validation.passwordMismatch'));
            return;
        }

        const taxIdLimpo = newUser.tax_id ? newUser.tax_id.replace(/\D/g, '') : null;
        if (taxIdLimpo && !config.validateTaxId(taxIdLimpo)) {
            showAlert('warning', t('validation.invalidTaxId'));
            return;
        }
        if (config.taxIdRequired && !taxIdLimpo) {
            showAlert('warning', t('validation.requiredTaxId'));
            return;
        }

        const payloadUser: ICreateUser = {
            ...newUser,
            tax_id: taxIdLimpo || undefined,
            phone: newUser.phone ? newUser.phone.replace(/\D/g, '') : undefined,
        };

        try {
            const result = await apiFetch(`/api/auth/register?locale=${locale}`, {
                method: 'POST',
                body: JSON.stringify({ newUser: payloadUser, address })
            });
            extractData(result, 'object');

            showAlert('success', t('registerEmailSent'));
            setTimeout(() => router.push('/'), 3000);
        } catch (err: any) {
            const status = err.status || 500;
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;
            showAlert(status === 400 || status === 401 || status === 403 || status === 404 ? 'warning' : 'danger', message);

        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <h1 className='text-center text-lg'>{t('title')}</h1>
            <form onSubmit={handleSubmit} className="space-y-4 border border-border lg:p-8 rounded p-2 m-2">

                <div className="grid gap-2">
                    <Label htmlFor="country">{t('fields.country')}<span className='text-primary'>*</span></Label>
                    <select id="country" required disabled={loading} className="bg-card border border-border rounded-md h-9 px-3" value={newUser.country} onChange={(e) => handleCountryChange(e.target.value as CountryCode)}>
                        {SUPPORTED_COUNTRIES.map((c) => (
                            <option key={c} value={c}>{COUNTRY_LABELS[c]}</option>
                        ))}
                    </select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="nome">{t('fields.fullName')}<span className='text-primary'>*</span></Label>
                    <Input className='bg-card border border-border' id="nome" type="text" required value={newUser.user_name} onChange={(e) => setNewUser({ ...newUser, user_name: e.target.value })} disabled={loading} placeholder={t('fields.fullNamePlaceholder')} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="email">{t('fields.email')}<span className='text-primary'>*</span></Label>
                    <Input className='bg-card border border-border' id="email" type="email" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} disabled={loading} placeholder={t('fields.emailPlaceholder')} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="tax_id">{config.taxIdLabel}{config.taxIdRequired && <span className='text-primary'>*</span>}</Label>
                    <Input id="tax_id" type="text" disabled={loading} required={config.taxIdRequired} className='bg-card border border-border' value={newUser.tax_id ?? ''} onChange={(e) => setNewUser({ ...newUser, tax_id: config.formatTaxId(e.target.value) })} placeholder={t('fields.taxIdPlaceholder')} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="telefone">{t('fields.phone')}</Label>
                    <Input id="telefone" type="tel" className='bg-card border border-border' value={newUser.phone ?? ''} disabled={loading} onChange={(e) => setNewUser({ ...newUser, phone: config.formatPhone(e.target.value) })} placeholder={t('fields.phonePlaceholder')} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="preferred_language">{t('fields.preferredLanguage')}<span className='text-primary'>*</span></Label>
                    <select id="preferred_language" required disabled={loading} className="bg-card border border-border rounded-md h-9 px-3" value={newUser.preferred_language} onChange={(e) => setNewUser({ ...newUser, preferred_language: e.target.value as typeof newUser.preferred_language })}>
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="senha">{t('fields.password')}<span className='text-primary'>*</span></Label>
                    <Input className='bg-card border border-border' id="senha" type="password" required value={newUser.user_password} onChange={(e) => setNewUser({ ...newUser, user_password: e.target.value })} disabled={loading} minLength={8} placeholder={t('fields.passwordPlaceholder')} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="confirmarSenha">{t('fields.confirmPassword')}<span className='text-primary'>*</span></Label>
                    <Input className='bg-card border border-border' id="confirmarSenha" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} minLength={8} placeholder={t('fields.confirmPasswordPlaceholder')} />
                </div>

                <AddressFields country={newUser.country as CountryCode} address={address} setAddress={setAddress} validZip={validZip} setValidZip={setValidZip} loading={loading} />

                <Button variant={'theme'} size={'full'} type="submit" disabled={!address.zip || !address.street || !address.address_number || loading} >{loading ? t('buttons.submitting') : t('buttons.submit')}</Button>
                <div className="mt-4 text-center text-sm">
                    {t('links.alreadyHaveAccount')}{" "}<Link prefetch={false} href={{ pathname: '/login' }} className="underline underline-offset-4">{t('links.login')}</Link>
                </div>
            </form>
        </>
    );
}
