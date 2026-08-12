'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Root route — smart redirect:
 *   Authenticated  → /dashboard
 *   Unauthenticated → /login
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('voting_admin_token');
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </main>
  );
}
