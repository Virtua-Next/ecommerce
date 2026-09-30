'use client';
import { useCallback, useEffect, useRef, useState, memo } from 'react';
import { useTranslations } from 'next-intl';
import { Store, Eye, EyeOff } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useRouter } from '@/i18n/navigation';
import "../../../styles/globals.css";
import { useToast } from '@/components/ToastSystem';
import { apiFetch, resolveApiErrorKey } from '@/lib/utils';
import { SUPPORTED_CURRENCIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';


interface FormData {
    site_name: string;
    site_description: string;
    domain: string;
    currency: string;
    user_name: string;
    email: string;
    user_password: string;
}

const EMPTY_FORM: FormData = {
    site_name: '',
    site_description: '',
    domain: '',
    currency: SUPPORTED_CURRENCIES[0],
    user_name: '',
    email: '',
    user_password: '',
};

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <div>
                <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
                {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
            </div>
            {children}
        </div>
    );
}

const Field = memo(function Field({
    name, label, type, readOnly, value, onChange, hint, required }: {
        name: string;
        label: string;
        type: string;
        readOnly?: boolean;
        className?: string;
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        hint?: string;
        required?: boolean
    }) {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
                <input
                    type={isPassword && showPassword ? 'text' : type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    readOnly={readOnly}
                    required={required ?? !readOnly}
                    className={`block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${readOnly
                        ? 'bg-gray-50 border-gray-200 text-gray-500'
                        : 'bg-white border-gray-300 text-gray-900'
                        } ${isPassword ? 'pr-10' : ''}`}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                )}
            </div>
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
    );
});

const CurrencySelect = memo(function CurrencySelect({ value, onChange, label, hint }: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; label: string; hint?: string; }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}<span className="text-red-500">*</span></label>
            <select name="currency" value={value} onChange={onChange} required className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
                {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>{currency}</option>
                ))}
            </select>
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
    );
});

function Setup() {
    const t = useTranslations('Setup');
    const tErrors = useTranslations('Errors');
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
    const router = useRouter();
    const redirectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(true);
    const { showAlert } = useToast();


    useEffect(() => {
        setFormData(prev => ({ ...prev, domain: window.location.hostname }));
        return () => {
            if (redirectTimeout.current) clearTimeout(redirectTimeout.current);
        };
    }, []);

    const handleFieldChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => (prev[name as keyof FormData] === value ? prev : { ...prev, [name]: value }));
    }, []);

    const validateForm = useCallback((): string | null => {
        if (!formData.site_name.trim()) {
            return t('alerts.siteNameRequired');
        }

        if (formData.domain !== window.location.hostname) {
            return t('alerts.domainChanged');
        }

        if (!SUPPORTED_CURRENCIES.includes(formData.currency as any)) {
            return t('alerts.currencyRequired');
        }

        if (!formData.user_name.trim()) {
            return t('alerts.adminNameRequired');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
            return t('alerts.emailInvalid');
        }

        if (formData.user_password.length < 8) {
            return t('alerts.passwordTooShort');
        }

        return null;
    }, [formData, router, t]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            showAlert('warning', validationError);
            return;
        }

        setIsLoading(true);
        try {
            await apiFetch('/api/setup', { method: 'POST', body: JSON.stringify(formData) })
            if (!isMountedRef.current) return;

            showAlert('success', t('alerts.setupSuccess'));
            redirectTimeout.current = setTimeout(() => router.push('/login'), 3000);

        } catch (err: any) {
            if (!isMountedRef.current) return;
            const status = err.status ?? 500;
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;

            showAlert(status === 400 || status === 404 ? 'warning' : 'danger', message);

        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setIsLoading(false);
            }, 100);
        }
    }, [formData, router, t, validateForm]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-2xl">
                <div className="flex justify-end mb-3">
                    <LanguageSwitcher />
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100 overflow-hidden">
                    <div className="px-10 pt-8 pb-6 text-center border-b border-gray-100">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                            <Store className="h-6 w-6" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
                        <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
                    </div>

                    <div className="px-10 py-6 space-y-8">

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                            <p>
                                <span className="font-medium">ℹ️</span>{' '}
                                {t('defaultLanguageInfo') ?? 'Store name and description will be saved in English (default language). You can add translations for other languages later in the admin panel.'}
                            </p>
                        </div>

                        <Section title={t('sections.storeIdentity')}>
                            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50/50">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('fields.siteName')}<span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="site_name"
                                            value={formData.site_name}
                                            onChange={handleFieldChange}
                                            required
                                            placeholder="My Store"
                                            className="text-gray-700 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">
                                            {t('fields.defaultLanguageHint') ?? 'This will be the default name in English'}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('fields.siteDescription')}
                                        </label>
                                        <input
                                            type="text"
                                            name="site_description"
                                            value={formData.site_description}
                                            onChange={handleFieldChange}
                                            placeholder="Brief description of your store"
                                            className="text-gray-700 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field
                                    name="domain"
                                    label={t('fields.domain')}
                                    type="text"
                                    readOnly
                                    value={formData.domain}
                                    onChange={handleFieldChange}
                                    hint={t('fields.domainHint')}
                                />
                                <CurrencySelect
                                    value={formData.currency}
                                    onChange={handleFieldChange}
                                    label={t('fields.currency')}
                                    hint={t('fields.currencyHint') ?? 'This can be changed later'}
                                />
                            </div>
                        </Section>

                        <Section title={t('sections.adminAccount')}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field
                                    required
                                    name="user_name"
                                    label={t('fields.adminName')}
                                    type="text"
                                    value={formData.user_name}
                                    onChange={handleFieldChange}
                                />
                                <Field
                                    required
                                    name="email"
                                    label={t('fields.adminEmail')}
                                    type="email"
                                    value={formData.email}
                                    onChange={handleFieldChange}
                                />
                            </div>
                            <Field
                                required
                                name="user_password"
                                label={t('fields.adminPassword')}
                                type="password"
                                value={formData.user_password}
                                onChange={handleFieldChange}
                            />
                        </Section>
                    </div>

                    <div className="px-10 pb-8">
                        <Button variant={'theme'} size={'full'} type="submit" disabled={isLoading}>{isLoading ? t('buttons.saving') : t('buttons.save')}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Setup;
