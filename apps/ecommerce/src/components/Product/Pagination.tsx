'use client'
import { useMemo } from 'react'
import { useTranslations } from 'next-intl'


interface PaginationProps {
    totalItems: number
    itemsPerPage: number
    currentPage: number
    onPageChange: (page: number) => void
    className?: string
}

function generatePageNumbers(currentPage: number, totalPages: number) {
    const pageNumbers: number[] = []
    const maxPagesToShow = 5
    pageNumbers.push(1)

    if (currentPage <= 4) {
        for (let i = 2; i <= Math.min(5, totalPages); i++) {
            if (!pageNumbers.includes(i)) pageNumbers.push(i)
        }
    } else if (currentPage >= totalPages - 3) {
        for (let i = totalPages - 4; i <= totalPages; i++) {
            if (!pageNumbers.includes(i)) pageNumbers.push(i)
        }
    } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
            if (i > 0 && i <= totalPages && !pageNumbers.includes(i)) {
                pageNumbers.push(i)
            }
        }
    }

    if (pageNumbers.length > maxPagesToShow) {
        const startIdx = Math.max(0, pageNumbers.indexOf(currentPage) - 2)
        const endIdx = Math.min(pageNumbers.length, startIdx + maxPagesToShow)
        return pageNumbers.slice(startIdx, endIdx)
    }

    if (!pageNumbers.includes(totalPages)) {
        pageNumbers.push(totalPages)
    }

    return pageNumbers
}

export default function Pagination({ totalItems, itemsPerPage, currentPage, onPageChange, className = '' }: PaginationProps) {
    const t = useTranslations('Catalog')

    // Pure derived value — no reason for useState+useEffect here, which
    // previously forced an extra render every time totalItems/itemsPerPage
    // changed before the "real" totalPages was available.
    const totalPages = useMemo(() => Math.ceil(totalItems / itemsPerPage), [totalItems, itemsPerPage])

    // Computed once per render instead of once per page-button (the
    // original called generatePageNumbers() again inside the .map for
    // every single button just to look up the previous number).
    const pageNumbers = useMemo(() => generatePageNumbers(currentPage, totalPages), [currentPage, totalPages])

    const nextPage = () => {
        if (currentPage < totalPages) onPageChange(currentPage + 1)
    }

    const prevPage = () => {
        if (currentPage > 1) onPageChange(currentPage - 1)
    }

    if (totalPages <= 1) return null

    return (
        <div className={`flex items-center justify-center gap-2 ${className}`}>
            <button onClick={prevPage} disabled={currentPage === 1} className={`px-3 py-1 rounded-md border border-primary/50 ${currentPage === 1 ? 'text-primary/50 cursor-not-allowed' : 'text-primary hover:bg-button/40'}`}>
                {t('previous')}
            </button>

            {pageNumbers.map((number, index) => {
                const previousNumber = pageNumbers[index - 1]
                const shouldAddEllipsis = previousNumber && number - previousNumber > 1
                return (
                    <div key={number} className="flex items-center gap-1">
                        {shouldAddEllipsis && (<span className="px-2">...</span>)}
                        <button onClick={() => onPageChange(number)} className={`px-3 py-1 rounded-md border ${currentPage === number ? 'bg-button/40 border-primary/60' : 'border-primary/50 text-primary hover:bg-button/40'}`}>
                            {number}
                        </button>
                    </div>
                )
            })}

            <button onClick={nextPage} disabled={currentPage === totalPages} className={`px-3 py-1 rounded-md border border-primary/50 ${currentPage === totalPages ? 'text-primary/50 cursor-not-allowed' : 'text-primary hover:bg-button/40'}`}>
                {t('next')}
            </button>
        </div>
    )
}
