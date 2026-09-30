'use client'
import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { IProductTranslated } from '@/lib/schemas/product';
import { IUser } from '@/lib/schemas/user';
import { ICategoryTranslated } from '@/lib/schemas/category';
import { IBrandTranslated } from '@/lib/schemas/brand';
import { IFooter } from '@/lib/schemas/footer'
import { IConfig } from '@/lib/schemas/config';
import { ISlideTranslated } from '@/lib/schemas/slide';


export type ContextType = {
    config: IConfig | null
    products: IProductTranslated[] | null
    categories: ICategoryTranslated[] | null
    brands: IBrandTranslated[] | null
    slides: ISlideTranslated[] | null
    footers: IFooter[] | null
    user: IUser | null
    loading: boolean
    setUser?: (u: IUser | null) => void
    setConfig?: (c: IConfig | null) => void
}

type ConfigProviderProps = {
    children: ReactNode
    initialData: Omit<ContextType, 'setUser' | 'loading'>
}

const ConfigContext = createContext<ContextType | undefined>(undefined)

export const ConfigProvider = ({ children, initialData }: ConfigProviderProps) => {
    const [user, setUser] = useState<IUser | null>(initialData.user)
    const [config, setConfig] = useState<IConfig | null>(initialData.config)
    const [loading, setLoading] = useState(true) // true até o fetch client-side resolver

    useEffect(() => {
        let cancelled = false;

        fetch('/api/auth/me')
            .then(res => res.json())
            .then((data: unknown) => {
                const user = (data as { user?: IUser | null } | null)?.user;
                if (!cancelled) setUser(user ?? null);
            })
            .catch(() => {
                if (!cancelled) setUser(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true };
    }, []);

    const contextValue: ContextType = {
        ...initialData,
        user,
        setUser,
        config,
        setConfig,
        loading,
    }

    return (
        <ConfigContext.Provider value={contextValue}>
            {children}
        </ConfigContext.Provider>
    )
}

export const useConfig = (): ContextType => {
    const context = useContext(ConfigContext)
    if (!context) {
        throw new Error("useConfig must be used within a ConfigProvider")
    }
    return context
}
