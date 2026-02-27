import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

/**
 * POST /api/finalize-session
 * Finaliza una sesión de Checkout de Stripe configurando la fecha de cancelación
 * de la suscripción de forma nativa.
 * 
 * Body: { sessionId: string }
 */
export async function POST(request: Request) {
    try {
        const { sessionId } = await request.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId es requerido' }, { status: 400 });
        }

        // 1. Recuperar la sesión de checkout
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription'],
        });

        if (!session) {
            return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
        }

        if (session.payment_status !== 'paid') {
            return NextResponse.json({
                message: 'El pago aún no se ha completado',
                status: session.payment_status
            }, { status: 200 });
        }

        // Solo procesamos suscripciones
        if (session.mode !== 'subscription' || !session.subscription) {
            return NextResponse.json({
                message: 'La sesión no es una suscripción o ya fue procesada',
                mode: session.mode
            }, { status: 200 });
        }

        const subscription = typeof session.subscription === 'string'
            ? await stripe.subscriptions.retrieve(session.subscription)
            : session.subscription;

        // 2. Extraer el timestamp de cancelación de la metadata
        // Intentar obtenerlo de la suscripción primero, luego de la sesión
        const cancelAtStr = subscription.metadata?.cancel_at_timestamp || session.metadata?.cancel_at_timestamp;

        if (!cancelAtStr) {
            console.warn(`No se encontró cancel_at_timestamp en la sesión ${sessionId}`);
            return NextResponse.json({
                message: 'No se requiere límite de pagos para esta sesión'
            }, { status: 200 });
        }

        const cancelAt = parseInt(cancelAtStr, 10);

        // 3. Si la suscripción ya tiene cancel_at y es el correcto, no hacer nada
        if (subscription.cancel_at === cancelAt) {
            return NextResponse.json({
                message: 'La suscripción ya está limitada correctamente',
                subscriptionId: subscription.id
            }, { status: 200 });
        }

        // 4. Actualizar la suscripción con la fecha de cancelación
        console.log(`Limitando suscripción ${subscription.id} para que termine en ${new Date(cancelAt * 1000).toISOString()}`);

        await stripe.subscriptions.update(subscription.id, {
            cancel_at: cancelAt,
        });

        return NextResponse.json({
            success: true,
            message: 'Suscripción limitada correctamente',
            subscriptionId: subscription.id,
            cancelAt: new Date(cancelAt * 1000).toISOString()
        });

    } catch (error: any) {
        console.error('Error al finalizar sesión:', error);
        return NextResponse.json(
            { error: error.message || 'Error interno al finalizar la sesión' },
            { status: 500 }
        );
    }
}
