"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function VentasRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Redirigir a la página principal donde está el POS
        router.replace('/');
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px] animate-pulse">Redirigiendo a Ventas...</p>
            </div>
        </div>
    );
}
