'use client';
import { LANGUAGE_LABELS } from "@/lib/constants";
import { IConfig } from "@/lib/schemas/config";
import { SupportedLanguage } from "@/lib/types/generic";


interface LanguageTabsProps {
    active: SupportedLanguage;
    config: IConfig;
    onChange: (lang: SupportedLanguage) => void;
    // Which languages still need attention (e.g. missing a title) — shown
    // as a small dot on the tab so the admin doesn't have to click through
    // both tabs just to check if something's missing.
    incomplete?: SupportedLanguage[];
}

export function LanguageTabs({ active, onChange, incomplete = [], config }: LanguageTabsProps) {
    return (
        <div className="flex gap-1 border-b dark:border-gray-700 mb-4">
            {config?.enabled_languages.map((lang) => (
                <button key={lang} type="button" onClick={() => onChange(lang)} className={`relative px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${active === lang ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                    {LANGUAGE_LABELS[lang]}
                    {incomplete.includes(lang) && (
                        <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-500" title="Missing content" />
                    )}
                </button>
            ))}
        </div>
    );
}
