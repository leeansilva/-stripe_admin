import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getMinimumAmount } from '@/lib/stripe-minimums';
import type Stripe from 'stripe';

/**
 * POST /api/create-checkout-session
 * Crea una sesión de Checkout de Stripe con suscripción
 * que se cancela automáticamente después de la cantidad de pagos especificada
 * 
 * NUEVA LÓGICA: Divide el precio total en cuotas
 * 
 * Body:
 * {
 *   "priceId": "price_xxx",
 *   "paymentsCount": 3
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { priceId, paymentsCount } = body;

    // Validaciones
    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json(
        { error: 'priceId es requerido' },
        { status: 400 }
      );
    }

    if (!paymentsCount || typeof paymentsCount !== 'number' || paymentsCount < 1) {
      return NextResponse.json(
        { error: 'paymentsCount debe ser un número mayor a 0' },
        { status: 400 }
      );
    }

    // Obtener información del precio original
    const originalPrice = await stripe.prices.retrieve(priceId);
    
    if (originalPrice.type !== 'recurring' || originalPrice.recurring?.interval !== 'month') {
      return NextResponse.json(
        { error: 'El precio debe ser una suscripción mensual' },
        { status: 400 }
      );
    }

    // Obtener el precio total (unit_amount está en centavos/unidad más pequeña)
    const totalAmount = originalPrice.unit_amount || 0;
    const currency = originalPrice.currency.toLowerCase();

    // Calcular el precio por cuota: precio total / cantidad de cuotas
    // Redondear hacia arriba para evitar números irracionales
    const amountPerPayment = Math.ceil(totalAmount / paymentsCount);

    // Validar monto mínimo de Stripe
    const minimumAmount = getMinimumAmount(currency);
    if (amountPerPayment < minimumAmount) {
      return NextResponse.json(
        { 
          error: `El monto por cuota (${(amountPerPayment / 100).toFixed(2)} ${currency.toUpperCase()}) es menor al mínimo permitido por Stripe (${(minimumAmount / 100).toFixed(2)} ${currency.toUpperCase()}). Intenta con menos cuotas.` 
        },
        { status: 400 }
      );
    }

    // Crear un precio temporal para la cuota calculada
    // Este precio será usado para la suscripción
    const productId = typeof originalPrice.product === 'string' 
      ? originalPrice.product 
      : originalPrice.product.id;

    const newPrice = await stripe.prices.create({
      product: productId,
      unit_amount: amountPerPayment,
      currency: currency,
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
    });

    // Calcular la fecha de cancelación
    // Fecha actual + cantidad de meses
    const now = new Date();
    const cancelAt = new Date(now);
    cancelAt.setMonth(cancelAt.getMonth() + paymentsCount);
    
    // Convertir a timestamp UNIX (Stripe requiere segundos, no milisegundos)
    const cancelAtTimestamp = Math.floor(cancelAt.getTime() / 1000);

    // Obtener la URL de la aplicación
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Crear la sesión de Checkout con el nuevo precio (precio por cuota)
    // Nota: cancel_at no se puede pasar directamente en subscription_data de checkout sessions
    // Usamos metadata para guardar la información y luego actualizamos la suscripción con webhooks
    const sessionParams = {
      mode: 'subscription' as const,
      line_items: [
        {
          price: newPrice.id,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          cancel_at_timestamp: cancelAtTimestamp.toString(),
          payments_count: paymentsCount.toString(),
          original_price_id: priceId,
        },
      },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancel`,
    };
    
    const session = await stripe.checkout.sessions.create(
      sessionParams as Stripe.Checkout.SessionCreateParams
    );

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      amountPerPayment, // Devolver el monto por cuota para referencia
      totalAmount, // Devolver el monto total para referencia
    });
  } catch (error: any) {
    console.error('Error al crear sesión de checkout:', error);
    
    // Manejar errores específicos de Stripe
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: `Error de Stripe: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Error al crear sesión de checkout' },
      { status: 500 }
    );
  }
}
