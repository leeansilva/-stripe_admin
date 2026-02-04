import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware para proteger todas las rutas excepto las de API
 * Usa autenticación básica con variables de entorno
 */
export function middleware(request: NextRequest) {
  // Permitir acceso a rutas de API sin autenticación (necesarias para webhooks)
  if (request.nextUrl.pathname.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }

  // Si no hay credenciales configuradas, permitir acceso (modo desarrollo)
  const adminUser = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPassword) {
    // En desarrollo, permitir acceso sin autenticación
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next();
    }
    // En producción sin credenciales, denegar acceso
    return new NextResponse('Autenticación no configurada', { status: 500 });
  }

  // Verificar si el usuario ya está autenticado (cookie)
  const authCookie = request.cookies.get('stripe_admin_auth');
  if (authCookie?.value === 'authenticated') {
    return NextResponse.next();
  }

  // Verificar autenticación básica HTTP
  const authHeader = request.headers.get('authorization');

  if (authHeader) {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if (username === adminUser && password === adminPassword) {
      // Autenticación exitosa, crear cookie y permitir acceso
      const response = NextResponse.next();
      response.cookies.set('stripe_admin_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 días
      });
      return response;
    }
  }

  // Solicitar autenticación
  return new NextResponse('Autenticación requerida', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Stripe Admin"',
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/webhooks (necesario para Stripe)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/webhooks|_next/static|_next/image|favicon.ico).*)',
  ],
};
