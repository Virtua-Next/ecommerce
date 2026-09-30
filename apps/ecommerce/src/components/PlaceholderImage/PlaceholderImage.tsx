'use client';


export function PlaceholderImage({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
    const sizeClasses = {
        sm: 'w-20 h-20',
        md: 'w-40 h-40',
        lg: 'w-64 h-64',
        xl: 'w-full h-full',
    };

    return (
        <div className={`${sizeClasses[size]} ${className}`}>
            <svg width="100%" height="100%" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="400" className="fill-gray-100 dark:fill-gray-500"/>
                <circle cx="200" cy="200" r="120" fill="none" className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="2"/>
                <circle cx="200" cy="200" r="80" fill="none" className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="2" strokeDasharray="6 6"/>
                <circle cx="200" cy="200" r="40" fill="none" className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="2"/>
                <path d="M200 60 L200 340 M60 200 L340 200" className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="1" opacity="0.4"/>
                <path d="M140 140 L260 260 M260 140 L140 260" className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="1" opacity="0.3"/>
            </svg>
        </div>
    );
}
