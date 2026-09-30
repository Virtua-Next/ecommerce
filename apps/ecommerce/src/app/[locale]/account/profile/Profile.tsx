'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { limparNumero, apiFetch, resolveApiErrorKey, extractData } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { IUser } from '@/lib/schemas/user';
import { useRouter } from '@/i18n/navigation';
import { useToast } from '@/components/ToastSystem';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from '@/lib/constants';
import { SUPPORTED_COUNTRIES, COUNTRY_LABELS } from '@/lib/constants';
import { SupportedLanguage, CountryCode } from '@/lib/types/generic';
import { COUNTRY_CONFIGS } from '@/lib/schemas/country-configs';


function useAbortableRequest() {
    const controllerRef = useRef<AbortController | null>(null);

    const start = useCallback(() => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        return controller;
    }, []);

    const finish = useCallback((controller: AbortController) => {
        if (controllerRef.current === controller) {
            controllerRef.current = null;
        }
    }, []);

    const cancel = useCallback(() => {
        controllerRef.current?.abort();
        controllerRef.current = null;
    }, []);

    useEffect(() => {
        return () => controllerRef.current?.abort();
    }, []);

    return { start, finish, cancel };
}

interface UserProps {
    initialUser: IUser;
}

export default function Profile({ initialUser }: UserProps) {
    const { showAlert } = useToast();
    const router = useRouter();
    const t = useTranslations('AccountProfile');
    const tErrors = useTranslations('Errors');
    const [originalUser, setOriginalUser] = useState<IUser | null>(null);
    const [editedUser, setEditedUser] = useState<IUser | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordModal, setPasswordModal] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const updateRequest = useAbortableRequest();
    const passwordRequest = useAbortableRequest();

    useEffect(() => {
        if (initialUser) {
            setEditedUser({ ...initialUser });
            setOriginalUser({ ...initialUser });
        }
    }, [initialUser]);

    const config = editedUser ? COUNTRY_CONFIGS[editedUser.country as CountryCode] : null;

    const handleCancelEdit = () => {
        if (!originalUser) return;
        setEditedUser({ ...originalUser });
        setEditMode(false);
        updateRequest.cancel();
    };

    const handleSaveData = async () => {
        if (!editedUser || !config) return;

        const cleanTaxId = limparNumero(editedUser.tax_id as string);
        const cleanPhone = limparNumero(editedUser.phone as string);

        if (!editedUser.email?.trim() || !editedUser.user_name?.trim() || !cleanPhone) {
            showAlert('warning', t('alerts.requiredFields'));
            return;
        }

        if (cleanTaxId && !config.validateTaxId(cleanTaxId)) {
            showAlert('warning', t('alerts.invalidTaxId', { label: config.taxIdLabel }));
            return;
        }

        if (config.taxIdRequired && !cleanTaxId) {
            showAlert('warning', t('alerts.taxIdRequired', { label: config.taxIdLabel }));
            return;
        }

        if (cleanPhone && (cleanPhone.length < 5 || cleanPhone.length > 15)) {
            showAlert('warning', t('alerts.invalidPhone'));
            return;
        }

        const controller = updateRequest.start();

        try {
            setSubmitting(true);

            const dataToSend = {
                user_name: editedUser.user_name,
                email: editedUser.email,
                phone: cleanPhone,
                country: editedUser.country,
                tax_id: cleanTaxId ?? null,
                preferred_language: editedUser.preferred_language
            };

            const result = await apiFetch(`/api/user/profile/${editedUser.uuid}`, { method: 'PUT', body: JSON.stringify(dataToSend), signal: controller.signal });
            if (result.isAborted) return;

            const data = extractData(result, 'object');

            setEditedUser({ ...data });
            setOriginalUser({ ...data });
            setEditMode(false);
            showAlert('success', t('alerts.updateSuccess'));

        } catch (err: any) {
            if (err.name === 'AbortError') return;

            const status = err.status || 500;
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;
            if (status === 401 || status === 403) {
                showAlert('danger', message, () => {
                    router.push({ pathname: '/login?callback=/account/profile' });
                });
                return;
            }
            showAlert(status === 400 || status === 404 ? 'warning' : 'danger', message);

        } finally {
            setSubmitting(false);
            updateRequest.finish(controller);
        }
    };

    const handleChangePassword = async () => {
        if (!originalUser) return;

        const { currentPassword, newPassword, confirmPassword } = passwordModal;

        if (!currentPassword || !newPassword || !confirmPassword) {
            showAlert('warning', t('alerts.allFieldsRequired'));
            return;
        }

        if (newPassword !== confirmPassword) {
            showAlert('warning', t('alerts.passwordMismatch'));
            return;
        }

        if (newPassword.length < 8) {
            showAlert('warning', t('alerts.passwordTooShort'));
            return;
        }

        const controller = passwordRequest.start();

        try {
            setSubmitting(true);
            const result = await apiFetch(`/api/user/profile/${originalUser.uuid}/password`, {
                method: 'PUT',
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                }),
                signal: controller.signal
            });
            if (result.isAborted) return;

            setShowPasswordModal(false);
            setPasswordModal({ currentPassword: '', newPassword: '', confirmPassword: '' });
            showAlert('success', t('alerts.passwordChangeSuccess'));

        } catch (err: any) {
            if (err.name === 'AbortError') return;

            const status = err.status || 500;
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;
            if (status === 401 || status === 403) {
                showAlert('danger', message, () => {
                    router.push({ pathname: '/login?callback=/account/profile' });
                });
                return;
            }
            showAlert(status === 400 || status === 404 || status === 409 ? 'warning' : 'danger', message);

        } finally {
            setSubmitting(false);
            passwordRequest.finish(controller);
        }
    };

    if (!editedUser || !config) {
        return (
            <div className="text-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
                <p className="mt-4">{t('loading')}</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Personal data */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">{t('personalData')}</h2>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="user_name">{t('fields.fullName')}<span className='text-primary'>*</span></Label>
                            <Input id="user_name" className={`bg-card/10 border border-border ${editMode ? 'bg-card' : ''}`} readOnly={!editMode} value={editedUser.user_name || ''} onChange={(e) => setEditedUser(prev => prev && { ...prev, user_name: e.target.value })} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="preferred_language">{t('fields.preferredLanguage')}</Label>
                            <select id="preferred_language" className={`bg-card/10 border border-border rounded-md h-10 px-3 ${editMode ? 'bg-card' : ''}`} disabled={!editMode} value={editedUser.preferred_language || SUPPORTED_LANGUAGES[0]} onChange={(e) => setEditedUser(prev => prev && { ...prev, preferred_language: e.target.value as SupportedLanguage })}>
                                {SUPPORTED_LANGUAGES.map((lang) => (
                                    <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">{t('fields.email')}<span className='text-primary'>*</span></Label>
                            <Input id="email" className={`bg-card/10 border border-border ${editMode ? 'bg-card' : ''}`} type="email" readOnly={!editMode} value={editedUser.email || ''} onChange={(e) => setEditedUser(prev => prev && { ...prev, email: e.target.value })} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone">{t('fields.phone')}<span className='text-primary'>*</span></Label>
                            <Input min={8} max={15} id="phone" className={`bg-card/10 border border-border ${editMode ? 'bg-card' : ''}`} readOnly={!editMode} value={config.formatPhone(editedUser.phone as string || '')} onChange={(e) => setEditedUser(prev => prev && { ...prev, phone: config.formatPhone(e.target.value) })} />
                        </div>

                        {/* País — bloqueado em edição: trocar de país muda a validação/formato do documento fiscal e do endereço, então não é uma edição "leve" */}
                        <div className="grid gap-2">
                            <Label htmlFor="country">{t('fields.country')}</Label>
                            <select id="country" className="bg-card/10 border border-border rounded-md h-10 px-3" disabled value={editedUser.country}>
                                {SUPPORTED_COUNTRIES.map((c) => (
                                    <option key={c} value={c}>{COUNTRY_LABELS[c]}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="tax_id">{config.taxIdLabel}</Label>
                            <Input id="tax_id" className={`bg-card/10 border border-border ${editMode ? 'bg-card' : ''}`} readOnly={!editMode} value={editedUser.tax_id ? config.formatTaxId(editedUser.tax_id as string) : ''} onChange={(e) => setEditedUser(prev => prev && { ...prev, tax_id: config.formatTaxId(e.target.value) })} />
                        </div>

                        <div className="flex justify-between pt-4">
                            <span className={`cursor-pointer ${editMode ? 'text-primary' : 'text-secondary'}`} onClick={() => (editMode ? handleCancelEdit() : setEditMode(true))}>{editMode ? t('buttons.cancel') : t('buttons.edit')}</span>
                            <Button variant={"theme"} size={"default"} onClick={handleSaveData} disabled={!editMode || submitting}>{submitting ? t('buttons.saving') : t('buttons.saveData')}</Button>
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">{t('security')}</h2>
                    <Button variant={'outline'} size={'default'} onClick={() => setShowPasswordModal(true)}>{t('buttons.changePassword')}</Button>
                </div>
            </div>

            {/* Password modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-bg/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border p-6 rounded-lg w-full max-w-md">

                        <div className="grid gap-4">
                            <Input type="password" className='border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 bg-card' placeholder={t('fields.currentPassword')} value={passwordModal.currentPassword} onChange={(e) => setPasswordModal({ ...passwordModal, currentPassword: e.target.value })} />
                            <Input type="password" className='border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 bg-card' placeholder={t('fields.newPassword')} value={passwordModal.newPassword} onChange={(e) => setPasswordModal({ ...passwordModal, newPassword: e.target.value })} />
                            <Input type="password" className='border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 bg-card' placeholder={t('fields.confirmNewPassword')} value={passwordModal.confirmPassword} onChange={(e) => setPasswordModal({ ...passwordModal, confirmPassword: e.target.value })} />

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" size={'default'} onClick={() => { setShowPasswordModal(false); passwordRequest.cancel(); }}>{t('buttons.cancel')}</Button>
                                <Button variant={'theme'} size={'default'} onClick={handleChangePassword} disabled={submitting}>{submitting ? t('buttons.saving') : t('buttons.confirm')}</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
