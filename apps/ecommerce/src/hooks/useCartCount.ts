'use client'
import { useEffect, useState, useMemo } from 'react';
import { useConfig } from '../context/ConfigContext';


export function useCartCount() {
    const { user } = useConfig();
    const [count, setCount] = useState(0);

    const cartKey = useMemo(
        () => (user?.uuid ? `cart_${user.uuid}` : 'cart_anonymous'),
        [user?.uuid]
    );

    useEffect(() => {
        const updateCount = () => {
            try {
                const cart = localStorage.getItem(cartKey);
                if (!cart) {
                    setCount(0);
                    return;
                }
                const items = JSON.parse(cart);
                const total = Array.isArray(items) ? items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
                setCount(total);
            } catch {
                setCount(0);
            }
        };

        updateCount();

        const handleCustomEvent = () => updateCount();

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === cartKey) updateCount();
        };

        window.addEventListener('cart-updated', handleCustomEvent);
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('cart-updated', handleCustomEvent);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [cartKey]);

    return count;
}
