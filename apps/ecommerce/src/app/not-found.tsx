import { redirect } from 'next/navigation';
import { DEFAULT_LANGUAGE } from '@/lib/constants';

export default function RootNotFound() { redirect(`/${DEFAULT_LANGUAGE}`); }