'use client'
import { useCart } from '@/hooks/useCart'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef } from 'react'
import { FaCartArrowDown } from 'react-icons/fa';
import { useTranslations } from 'next-intl'


export function AddToCart({ productId, isGrid, fromButtonRef }: { productId: number; isGrid: boolean, fromButtonRef?: any }) {
    const t = useTranslations('Cart');
    const { addToCart } = useCart()
    const [isAnimating, setIsAnimating] = useState(false)
    const buttonRef = useRef<HTMLDivElement>(null)
    const fromRef = fromButtonRef || buttonRef

    const handleClick = () => {
        setIsAnimating(true)
        if (!isGrid) addToCart(productId)
    }

    return (
        <div className="relative inline-block">
            {isGrid ? (
                <span ref={buttonRef} onClick={handleClick} className="cursor-pointer relative inline-flex items-center justify-center">
                    <FaCartArrowDown className="block" style={{ width: '1em', height: '1em' }} />
                </span>
            ) : (
                <div ref={buttonRef} onClick={handleClick} className={`relative font-medium items-center flex gap-2 cursor-pointer px-4 py-2 rounded-lg bg-button hover:bg-buttonHover transition-colors border border-border`}>
                    <FaCartArrowDown />{t('addToCart')}
                </div>
            )}

            <AnimatePresence>
                {isAnimating && (
                    <motion.div
                        initial={{
                            opacity: 1,
                            position: 'fixed',
                            left: fromRef.current?.getBoundingClientRect().right || 0,
                            top: fromRef.current?.getBoundingClientRect().top || 0,
                            transform: 'translate(-50%, -50%)',
                            zIndex: 9999
                        }}
                        animate={{
                            left: fromButtonRef ? '2000%' : '85%',
                            top: fromButtonRef ? '-500px' : '20px',
                            opacity: 0,
                            scale: 1.5
                        }}
                        transition={{
                            duration: fromButtonRef ? 1.2 : 0.8,
                            ease: "easeOut"
                        }}
                        onAnimationComplete={() => setIsAnimating(false)}
                        className="text-[var(--success)] text-xl pointer-events-none absolute"
                    >
                        📦
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
