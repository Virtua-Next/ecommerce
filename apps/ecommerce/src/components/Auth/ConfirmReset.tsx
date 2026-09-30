'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from '@/components/ToastSystem';
import { apiFetch, resolveApiErrorKey } from '@/lib/utils';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';


interface Props {
    token?: string;
}

export default function ConfirmResetForm({ token }: Props) {
    const t = useTranslations('ConfirmPassword');
    const tErrors = useTranslations('Errors');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { showAlert } = useToast();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            showAlert('warning', t('validation.invalidToken'));
            return;
        }
        if (password.length < 8) {
            showAlert('warning', t('validation.passwordTooShort'));
            return;
        }
        if (password !== confirmPassword) {
            showAlert('warning', t('validation.passwordMismatch'));
            return;
        }

        setLoading(true);
        try {
            await apiFetch('/api/auth/reset/confirm', { method: 'POST', body: JSON.stringify({ token, newPassword: password }) });

            showAlert('success', t('passwordUpdated'));
            setTimeout(() => {
                router.push({ pathname: '/login' });
            }, 2500);

        } catch (err: any) {
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;
            showAlert('danger', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-4 border border-border">
            <h1 className="text-2xl font-bold mb-4">{t('newPassword')}</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input className='bg-card border-border' type="password" placeholder={`${t('fields.newPassword')}`} value={password} onChange={(e) => setPassword(e.target.value)} required />
                <Input className='bg-card border-border' type="password" placeholder={`${t('fields.confirmNewPassword')}`} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                <Button type="submit" className="border border-border w-full bg-button hover:bg-buttonHover text-white" disabled={loading || !token}>{loading ? t('buttons.updating') : t('buttons.update')}</Button>
            </form>
        </div>
    );
}
