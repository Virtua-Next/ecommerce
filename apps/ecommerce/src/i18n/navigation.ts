import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Wrapped versions of Next.js navigation APIs that are locale-aware.
// Use these instead of importing directly from 'next/link' / 'next/navigation'
// anywhere in the app, so links and redirects keep the current locale.
export const { Link, redirect, usePathname, useRouter, getPathname } =
    createNavigation(routing);
