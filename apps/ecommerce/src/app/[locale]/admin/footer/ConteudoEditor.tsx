'use client';
import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { IconDropdown } from '@/components/IconDropdown/IconDropdown';
import { Button } from "@/components/ui/button";


interface Props {
    tipo: string;
    conteudo: string;
    onChange: (value: string) => void;
    onAddItem?: () => void;
    onRemoveItem?: (index: number) => void;
    onItemFieldChange?: (index: number, field: string, value: string) => void;
}

interface ItemBase {
    text?: string;
    url?: string;
    icon?: string;
    days?: string;
    hours?: string;
    name?: string;
}

export default function ConteudoEditor({ tipo, conteudo, onChange, onAddItem, onRemoveItem, onItemFieldChange }: Props) {
    const t = useTranslations('FooterAdmin');
    const [itens, setItens] = useState<ItemBase[]>([]);

    useEffect(() => {
        try {
            const parsed = JSON.parse(conteudo || "[]");
            setItens(Array.isArray(parsed) ? parsed : []);
        } catch (error) {
            console.error('Erro ao parsear conteúdo:', error);
            setItens([]);
        }
    }, [conteudo, tipo]);

    const handleItemChange = (index: number, field: string, value: string) => {
        if (onItemFieldChange) {
            onItemFieldChange(index, field, value);
            return;
        }

        const novosItens = [...itens];

        novosItens[index] = {
            ...getNovoItemPorTipo(tipo),
            ...novosItens[index],
            [field]: value
        };

        setItens(novosItens);
        onChange(JSON.stringify(novosItens));
    };

    const handleAddItem = () => {
        if (onAddItem) {
            onAddItem();
            return;
        }

        const novoItem = getNovoItemPorTipo(tipo);
        const novosItens = [...itens, novoItem];
        setItens(novosItens);
        onChange(JSON.stringify(novosItens));
    };

    const handleRemoveItem = (index: number) => {
        if (onRemoveItem) {
            onRemoveItem(index);
            return;
        }

        const novosItens = itens.filter((_, i) => i !== index);
        setItens(novosItens);
        onChange(JSON.stringify(novosItens));
    };

    if (itens.length === 0) {
        return (
            <div className="space-y-4">
                <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded text-center text-gray-500 dark:text-gray-400">
                    {t('noItems')}
                </div>
                <Button variant={'theme'} size={'default'} onClick={handleAddItem}>
                    {t('addItem')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {itens.map((item, index) => (
                <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded space-y-2 bg-gray-50 dark:bg-gray-800/50">
                    <CamposPorTipo tipo={tipo} item={item} index={index} handleChange={handleItemChange} t={t} />
                    <button onClick={() => handleRemoveItem(index)} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm mt-2 transition-colors">
                        {t('removeItem')}
                    </button>
                </div>
            ))}
            <Button variant={'theme'} size={'default'} onClick={handleAddItem}>
                {t('addItem')}
            </Button>
        </div>
    );
}

export function getNovoItemPorTipo(tipo: string): ItemBase {
    switch (tipo) {
        case "contact":
            return { text: "", url: "", icon: "" };
        case "links":
            return { text: "", url: "", icon: "" };
        case "schedule":
            return { days: "", hours: "", icon: "" };
        case "social_media":
            return { name: "", url: "", icon: "" };
        default:
            return {};
    }
}

function CamposPorTipo({ tipo, item, index, handleChange, t }: { tipo: string; item: ItemBase; index: number; handleChange: (index: number, field: string, value: string) => void; t: (key: string) => string }) {
    const input = (label: string, field: string, placeholder = "") => (
        <div>
            <label className="text-sm block mb-1 text-gray-700 dark:text-gray-300">
                {label}
            </label>
            <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={item[field as keyof ItemBase] || ""}
                placeholder={placeholder}
                onChange={(e) => handleChange(index, field, e.target.value)}
            />
        </div>
    );

    switch (tipo) {
        case "contact":
            return (
                <>
                    {input(t('contactText'), "text", t('contactTextPlaceholder'))}
                    {input(t('contactLink'), "url", t('contactLinkPlaceholder'))}
                    <IconDropdown
                        label={t('icon')}
                        ICON_MAP="footer"
                        value={item.icon as string}
                        index={index}
                        field="icon"
                        onChange={handleChange}
                    />
                </>
            );
        case "links":
            return (
                <>
                    {input(t('linkText'), "text", t('linkTextPlaceholder'))}
                    {input(t('linkUrl'), "url", t('linkUrlPlaceholder'))}
                    <IconDropdown
                        label={t('icon')}
                        ICON_MAP="footer"
                        value={item.icon as string}
                        index={index}
                        field="icon"
                        onChange={handleChange}
                    />
                </>
            );
        case "schedule":
            return (
                <>
                    {input(t('scheduleDays'), "days", t('scheduleDaysPlaceholder'))}
                    {input(t('scheduleHours'), "hours", t('scheduleHoursPlaceholder'))}
                    <IconDropdown
                        label={t('icon')}
                        ICON_MAP="footer"
                        value={item.icon as string}
                        index={index}
                        field="icon"
                        onChange={handleChange}
                    />
                </>
            );
        case "social_media":
            return (
                <>
                    {input(t('socialMediaUrl'), "url", t('socialMediaUrlPlaceholder'))}
                    <IconDropdown
                        label={t('icon')}
                        ICON_MAP="footer"
                        value={item.icon as string}
                        index={index}
                        field="icon"
                        onChange={handleChange}
                    />
                </>
            );
        default:
            return (
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                    {t('unknownType')}
                </div>
            );
    }
}
