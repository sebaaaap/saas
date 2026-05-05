import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Permitir todo excepto rutas que sabemos que son privadas y sensibles
    // Pero solo si no hay rastro de token
    const token = request.cookies.get('auth_token')?.value;

    // No redireccionamos si ya está logueado para permitir que el login sea accesible siempre
    // Si el usuario quiere cambiar de cuenta o si el .bat lo manda al login, debe poder verlo.

    // No expulsar de la raíz (/) desde el middleware para evitar falsos positivos
    // El ProtectedRoute en el cliente hará la validación final.

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
