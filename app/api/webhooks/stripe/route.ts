import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import Stripe from 'stripe';

/**
 * POST /api/webhooks/stripe
 * Webhook para procesar eventos de Stripe
 * Actualiza las suscripciones con cancel_at cuando se completa el checkout
 */
export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET no está configurado');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Error verificando webhook:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Procesar el evento
  try {
    // Cuando se completa el checkout, actualizar la suscripción con cancel_at
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === 'subscription' && session.subscription) {
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;

        // Obtener la suscripción
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Verificar si tiene metadata con cancel_at_timestamp
        if (subscription.metadata?.cancel_at_timestamp) {
          const cancelAtTimestamp = parseInt(subscription.metadata.cancel_at_timestamp);

          // Actualizar la suscripción con cancel_at
          await stripe.subscriptions.update(subscriptionId, {
            cancel_at: cancelAtTimestamp,
          });

          console.log(`Suscripción ${subscriptionId} configurada para cancelarse en ${new Date(cancelAtTimestamp * 1000).toISOString()}`);
        }
      }
    }

    // Log de otros eventos importantes
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`Factura pagada: ${invoice.id} - Monto: ${invoice.amount_paid}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error procesando webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Error procesando webhook' },
      { status: 500 }
    );
  }
}
