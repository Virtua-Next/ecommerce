'use client';
import React from 'react';
import { useTranslations } from 'next-intl';


interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (itemsPerPage: number) => void;
    itemsPerPageOptions?: number[];
    showItemsPerPage?: boolean;
    showTotalItems?: boolean;
    className?: string;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange, itemsPerPageOptions = [10, 20, 50, 100], showItemsPerPage = true, showTotalItems = true, className = '' }) => {
    const t = useTranslations('Pagination');

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            onPageChange(page);
        }
    };

    const nextPage = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const getPageNumbers = () => {
        const delta = 2; // Número de páginas ao redor da página atual
        const range = [];
        const rangeWithDots: (string | number)[] = [];

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                range.push(i);
            }
        }

        range.forEach((page, index, arr) => {
            if (index > 0 && page - arr[index - 1] > 1) {
                rangeWithDots.push('...');
            }
            rangeWithDots.push(page);
        });

        return rangeWithDots;
    };

    if (totalPages <= 1 && !showItemsPerPage) {
        return null;
    }

    return (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4 py-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
            {showTotalItems && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>{t('showing')}</span>
                    <span className="font-medium">{totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span>
                    <span>{t('to')}</span>
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span>
                    <span>{t('of')}</span>
                    <span className="font-medium">{totalItems}</span>
                    <span>{t('results')}</span>
                </div>
            )}

            <div className="flex items-center gap-4">
                {showItemsPerPage && onItemsPerPageChange && (
                    <div className="flex items-center gap-2">
                        <label htmlFor="items-per-page" className="text-sm text-gray-600 dark:text-gray-300">
                            {t('perPage')}
                        </label>
                        <select
                            id="items-per-page"
                            value={itemsPerPage}
                            onChange={(e) => {
                                onItemsPerPageChange(Number(e.target.value));
                                onPageChange(1); // Resetar para primeira página
                            }}
                            className="px-2 py-1 border rounded dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {itemsPerPageOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex items-center gap-1">
                    {/* Primeira página */}
                    <button
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center gap-1 transition-colors"
                        aria-label={t('first')}
                    >
                        <span>«</span>
                        <span className="hidden sm:inline">{t('first')}</span>
                    </button>

                    {/* Anterior */}
                    <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors"
                        aria-label={t('previous')}
                    >
                        ‹
                    </button>

                    {/* Números das páginas */}
                    <div className="flex items-center gap-1 px-2">
                        {getPageNumbers().map((page, index) => (
                            <React.Fragment key={index}>
                                {page === '...' ? (
                                    <span className="px-1 text-sm text-gray-400">…</span>
                                ) : (
                                    <button
                                        onClick={() => goToPage(page as number)}
                                        className={`px-3 py-1 text-sm rounded transition-colors ${currentPage === page
                                                ? 'bg-blue-600 text-white font-medium'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Próxima */}
                    <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors"
                        aria-label={t('next')}
                    >
                        ›
                    </button>

                    {/* Última página */}
                    <button
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center gap-1 transition-colors"
                        aria-label={t('last')}
                    >
                        <span className="hidden sm:inline">{t('last')}</span>
                        <span>»</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
