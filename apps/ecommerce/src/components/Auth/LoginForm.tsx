'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { extractData, apiFetch, resolveApiErrorKey } from "@/lib/utils";
import { useRouter, Link } from '@/i18n/navigation'
import '@/styles/globals.css';
import { useConfig } from "@/context/ConfigContext";
import { useToast } from '@/components/ToastSystem';
import { useTranslations } from 'next-intl';


export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
    const t = useTranslations('Login');
    const tErrors = useTranslations('Errors');
    const { setUser } = useConfig();
    const [email, setEmail] = useState('');
    const [password, setPassowrd] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showAlert } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ user_email: email, user_password: password }), cache: 'no-store' });

            const data = extractData(result, 'object');

            showAlert('success', result.message);
            setUser?.(data);

            const callback = searchParams.get('callback');
            if (callback) {
                window.location.assign(decodeURIComponent(callback));
            } else if (data.profile_id === 1) {
                router.push({ pathname: '/admin' });
            } else {
                router.push({ pathname: '/' });
            }

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
        <div>
            <Card className="p-2 m-2">
                <CardHeader>
                    <CardTitle className="text-center">{t('title')}</CardTitle>
                    <CardDescription className="text-center">
                        {t('description')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">{t('emailLabel')}</Label>
                            <Input id="email" type="email" placeholder="mail@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">{t('passwordLabel')}</Label>
                                <Link prefetch={false} href={{pathname: '/reset'}} className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                                    {t('forgotPassword')}
                                </Link>
                            </div>
                            <Input id="password" type="password" required value={password} onChange={(e) => setPassowrd(e.target.value)} disabled={loading} />
                        </div>

                        <Button type="submit" size={"full"} variant={"theme"} disabled={loading} >
                            {loading ? t('submitting') : t('submit')}
                        </Button>

                        <div className="mt-4 text-center text-sm">
                            {t('noAccount')}{" "}
                            <Link prefetch={false} href={{pathname: '/register'}} className="underline underline-offset-4">
                                {t('signup')}
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
