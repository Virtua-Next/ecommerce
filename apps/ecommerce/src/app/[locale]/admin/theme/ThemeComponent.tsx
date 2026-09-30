'use client';
import { useState, useEffect, useTransition, useRef } from "react";
import { useTranslations } from 'next-intl';
import { useAdminConfig } from "@/context/AdminConfigContext";
import { IConfig } from '@/lib/schemas/config';
import { useToast } from '@/components/ToastSystem';
import { apiFetch } from "@/lib/utils";
import { useRouter } from '@/i18n/navigation'
import { THEMES, THEME_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { FaSave } from "react-icons/fa";


export default function ThemeComponent() {
    const t = useTranslations('ThemeAdmin');
    const tCommon = useTranslations('AdminCatalog');
    const { config, loading, setConfig } = useAdminConfig();
    const [novoConfig, setNovoConfig] = useState<IConfig | null>(null);
    const [isPending, startTransition] = useTransition();
    const isMountedRef = useRef(true);
    const { showAlert } = useToast();
    const router = useRouter();

    useEffect(() => {
        if (config) {
            setNovoConfig(config);
        }
    }, [config]);

    if (loading || !novoConfig) return <div className="p-6">{t('loading')}</div>;

    if (!config) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-6">{t('pageTitle')}</h1>
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    <p>{t('errorLoading')}</p>
                </div>
            </div>
        );
    }

    const handleSave = async () => {
        if (!novoConfig) return;

        startTransition(async () => {
            try {
                await apiFetch('/api/admin/config', { method: 'PATCH', body: JSON.stringify({ theme: novoConfig.theme }), credentials: 'include' })

                if (isMountedRef.current) {
                    setConfig?.(novoConfig);
                    showAlert('success', t('success'));
                }

            } catch (error: any) {
                if (!isMountedRef.current) return;
                if (error.status === 401 || error.status === 403) {
                    showAlert('danger', tCommon('sessionExpired'), () => {
                        router.push({ pathname: '/login?callback=/admin/theme' });
                    });
                } else if (error.status === 409) {
                    showAlert('warning', t('noDataChanged') ?? error.message);
                } else {
                    console.error('Error saving themes', error);
                    showAlert('danger', t('error') ?? error.message);
                    setNovoConfig(config);
                }
            }
        });
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">{t('pageTitle')}</h1>

            <div className="mb-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {THEMES.map((tema) => {
                        const ativo = novoConfig.theme === tema.valor;
                        const cores = THEME_COLORS[tema.valor];
                        const corPrimaria = `rgb(${cores[0]})`;
                        const nomeTraduzido = t(`themes.${tema.chave}`);
                        return (
                            <button
                                key={tema.valor}
                                onClick={() => !isPending && setNovoConfig({ ...novoConfig, theme: tema.valor })}
                                className={`group relative border-2 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${ativo ? "ring-2 ring-opacity-20 scale-105 z-10" : "border-gray-100 dark:border-gray-700"} ${isPending ? 'opacity-60 cursor-not-allowed' : ''}`}
                                style={{
                                    borderColor: ativo ? corPrimaria : '',
                                    boxShadow: ativo ? `0 10px 15px -3px rgba(${cores[0].split(' ').join(',')}, 0.2)` : ''
                                }}
                            >
                                <div className="flex h-12 w-full">
                                    {cores.map((cor, index) => (
                                        <div key={index} className="flex-1 h-full" style={{ backgroundColor: `rgb(${cor})` }} />
                                    ))}
                                </div>

                                <div className={`text-center text-[11px] font-bold py-2 uppercase tracking-tighter transition-colors ${ativo ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600"
                                    }`}>
                                    {nomeTraduzido}
                                </div>
                                {/* marcaçao to topo direito */}
                                {ativo && (
                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: corPrimaria }} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-end">
                <Button variant={'theme'} size={'default'} onClick={handleSave} disabled={isPending || config.theme === novoConfig.theme}>
                    <FaSave className="h-4 w-4 mx-1" />
                    {isPending ? t('saving') : t('saveButton')}
                </Button>
            </div>
        </div>
    );
}
