'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
    // Ícones para Footer
    FaInstagram,
    FaFacebook,
    FaWhatsapp,
    FaMapPin,
    FaEnvelope,
    FaPhone,
    FaClock,
    FaStar,
    FaArrowRight,
    FaArrowLeft,
    FaBell,
    FaBolt,
    FaFire,
    FaGear,
    FaCommentDots,
    FaGlobe,
    FaDollarSign,
    FaEuroSign,
    FaHeart,
    FaHouse,
    FaFlag,
    FaXTwitter,
    // Ícones para Pagamento
    FaCreditCard,
    FaHandHoldingDollar,
    FaMoneyBill,
    FaMoneyCheck,
    FaPager,
    FaQrcode,
    FaBuildingColumns,
    FaCcStripe,
    FaCcVisa,
    FaCcMastercard,
    FaCcDinersClub,
    FaCcAmex
} from "react-icons/fa6";


export const ICON_MAP_FOOTER: Record<string, React.ComponentType<any>> = {
    "Flag": FaFlag,
    "House": FaHouse,
    "Fire": FaFire,
    "Heart": FaHeart,
    "Dollar": FaDollarSign,
    "Gear": FaGear,
    "Envelope": FaEnvelope,
    "Star": FaStar,
    "Euro": FaEuroSign,
    "Facebook": FaFacebook,
    "ArrowLeft": FaArrowLeft,
    "ArrowRight": FaArrowRight,
    "Globe": FaGlobe,
    "Instagram": FaInstagram,
    "MapPin": FaMapPin,
    "Comment": FaCommentDots,
    "Bolt": FaBolt,
    "Clock": FaClock,
    "Bell": FaBell,
    "Phone": FaPhone,
    "WhatsApp": FaWhatsapp,
    "XTwitter": FaXTwitter,
};

export const ICON_MAP_PAYMENT: Record<string, React.ComponentType<any>> = {
    "BuildingColumns": FaBuildingColumns,
    "Amex": FaCcAmex,
    "Flag": FaFlag,
    "CreditCard": FaCreditCard,
    "Globe": FaGlobe,
    "Pager": FaPager,
    "Qrcode": FaQrcode,
    "MoneyBill": FaMoneyBill,
    "HandHoldingDollar": FaHandHoldingDollar,
    "DinersClub": FaCcDinersClub,
    "Mastercard": FaCcMastercard,
    "Stripe": FaCcStripe,
    "MoneyCheck": FaMoneyCheck,
    "Visa": FaCcVisa
};

const ICON_MAPS = {
    payment: ICON_MAP_PAYMENT,
    footer: ICON_MAP_FOOTER,
} as const;

export const IconDropdown = ({ label, ICON_MAP: mapKey, value, index, field, onChange }: { label: string; ICON_MAP: 'payment' | 'footer'; value: string; index: number; field: string; onChange: (index: number, field: string, value: string) => void; }) => {
    const t = useTranslations('FooterAdmin');
    const tIcons = useTranslations('IconLabels');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value || '');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const currentMap = ICON_MAPS[mapKey];

    useEffect(() => {
        setSelectedValue(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (iconName: string) => {
        setSelectedValue(iconName);
        onChange(index, field, iconName);
        setIsOpen(false);
    };

    const SelectedIcon = selectedValue && currentMap[selectedValue];
    const getIconLabel = (name: string) => (tIcons.has(name) ? tIcons(name) : name);
    const selectedLabel = selectedValue ? getIconLabel(selectedValue) : null;

    return (
        <div className="mb-4" ref={dropdownRef}>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                {label}
            </label>

            <button type="button" className="w-full flex items-center justify-between p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center gap-2">
                    {SelectedIcon ? (
                        <>
                            <SelectedIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {selectedLabel}
                            </span>
                        </>
                    ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">
                            {t('selectIcon')}
                        </span>
                    )}
                </div>
                <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="z-50 mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto bg-white dark:bg-gray-800">
                    <div className="p-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-1">
                            {t('selectIcon')}
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                            {Object.entries(currentMap).map(([iconName, IconComponent]) => {
                                const isSelected = selectedValue === iconName;
                                const displayName = getIconLabel(iconName);

                                return (
                                    <button key={iconName} type="button"
                                        className={`flex flex-col items-center p-2 rounded-lg transition-all ${isSelected
                                            ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-500'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                        onClick={() => handleSelect(iconName)}
                                        title={displayName}
                                    >
                                        <IconComponent className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate max-w-full">
                                            {displayName}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ChevronDownIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);
