'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/components/ToastSystem';
import { apiFetch, resolveApiErrorKey } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation'


export function ResetForm() {
    const t = useTranslations('ResetPassword');
    const tErrors = useTranslations('Errors');
    const locale = useLocale();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const { showAlert } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await apiFetch(`/api/auth/reset?locale=${locale}`, { method: 'POST', body: JSON.stringify(email) })
            showAlert('success', t('recoveryMailSent'));
        } catch (err: any) {
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;
            showAlert('danger', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='border border-border max-w-md mx-auto p-4 border border-border'>
            <h1 className='text-2xl font-bold mb-4'>{t('passwordReset')}</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">{t('label.email')}</Label>
                    <Input className='bg-card border-border' id="email" type="email" placeholder="mail@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                </div>
                <Button type="submit" className="border border-border w-full bg-button hover:bg-buttonHover text-white" disabled={loading}>{loading ? t('button.sending') : t('button.send')}</Button>
                <div className="mt-4 text-center text-sm">
                    {t('rememberPassword')}{" "}

                    <Link prefetch={false} href={{ pathname: '/login' }} className="underline underline-offset-4">{t('back')}</Link>
                </div>
            </form>
        </div>
    );
}
