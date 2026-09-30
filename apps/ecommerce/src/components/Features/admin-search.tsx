"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { FaSearch, FaTimes } from "react-icons/fa";
import { useState, useEffect } from "react";


export default function AdminSearch() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [inputValue, setInputValue] = useState('');


    useEffect(() => {
        setInputValue(searchParams.get('search') || '');
    }, [searchParams]);

    const handleSearch = () => {
        const params = new URLSearchParams(searchParams.toString());

        if (inputValue.trim()) {
            params.set('search', inputValue);
        } else {
            params.delete('search');
        }

        router.push(`${pathname}?${params.toString()}`);
    };

    const handleClear = () => {
        setInputValue('');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('search');
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex gap-2 w-full">
            <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-gray-400" />
                </div>
                <Input type="text" placeholder={'Buscar...'} className="pl-10 pr-10 border dark:border-gray-700" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                {inputValue && (
                    <button type="button" onClick={handleClear} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <FaTimes className="text-red-400 hover:text-gray-600" />
                    </button>
                )}
            </div>
            <Button variant={'theme'} size={'default'} onClick={handleSearch}>
                <FaSearch className="h-4 w-4 mx-1" />
                Buscar
            </Button>
        </div>
    );
}
