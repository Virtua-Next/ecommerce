'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { IConfig } from '@/lib/schemas/config';


interface AdminConfigContextValue {
    config: IConfig | null;
    loading: boolean;
    setConfig: (config: IConfig) => void;
}

const AdminConfigContext = createContext<AdminConfigContextValue | undefined>(undefined);

export function AdminConfigProvider({ initialConfig, children }: { initialConfig: IConfig | null; children: ReactNode }) {
    const [config, setConfig] = useState<IConfig | null>(initialConfig);

    return (
        <AdminConfigContext.Provider value={{ config, loading: false, setConfig }}>
            {children}
        </AdminConfigContext.Provider>
    );
}

export function useAdminConfig() {
    const ctx = useContext(AdminConfigContext);
    if (!ctx) throw new Error('useAdminConfig must be used within AdminConfigProvider');
    return ctx;
}
