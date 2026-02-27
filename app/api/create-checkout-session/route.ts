import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getMinimumAmount } from '@/lib/stripe-minimums';
import type Stripe from 'stripe';

/**
 * POST /api/create-checkout-session
 * Crea una sesión de Checkout de Stripe con suscripción
 * que se cancela automáticamente después de la cantidad de pagos especificada
 * 
 * NUEVA LÓGICA: El precio manual es el precio POR CUOTA (no se divide)
 * 
 * Body:
 * {
 *   "priceId": "price_xxx" (opcional),
 *   "productId": "prod_xxx" (opcional, requerido si se usa manualPrice sin priceId),
 *   "paymentsCount": 3,
 *   "manualPrice": 10000 (opcional, en centavos, precio por cuota)
 * }
 * Nota: La moneda siempre es USD
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { priceId, productId: requestProductId, paymentsCount, manualPrice } = body;

    // Validaciones
    if (!paymentsCount || typeof paymentsCount !== 'number' || paymentsCount < 1) {
      return NextResponse.json(
        { error: 'paymentsCount debe ser un número mayor a 0' },
        { status: 400 }
      );
    }

    let amountPerPayment: number;
    let currency: string;
    let finalProductId: string;

    // Si se proporciona precio manual, usarlo directamente como precio por cuota
    if (manualPrice !== undefined && manualPrice !== null) {
      if (typeof manualPrice !== 'number' || manualPrice < 0) {
        return NextResponse.json(
          { error: 'manualPrice debe ser un número mayor o igual a 0' },
          { status: 400 }
        );
      }

      amountPerPayment = Math.round(manualPrice); // Precio por cuota en centavos
      currency = 'usd'; // Siempre USD

      // Obtener el productId: primero de priceId, luego del parámetro productId
      if (priceId) {
        const originalPrice = await stripe.prices.retrieve(priceId);
        finalProductId = typeof originalPrice.product === 'string'
          ? originalPrice.product
          : originalPrice.product.id;
      } else if (requestProductId) {
        // Usar el productId proporcionado
        // Validar que el producto existe
        await stripe.products.retrieve(requestProductId);
        finalProductId = requestProductId;
      } else {
        // Si no hay priceId ni productId, requerir que se proporcione un producto
        return NextResponse.json(
          { error: 'productId es requerido cuando se usa precio manual sin priceId. Por favor selecciona un producto.' },
          { status: 400 }
        );
      }
    } else if (priceId) {
      // Si no hay precio manual pero hay priceId, usar el precio de Stripe
      // El precio elegido es el valor de CADA cuota (no se divide)
      const originalPrice = await stripe.prices.retrieve(priceId);

      if (originalPrice.type !== 'recurring' || originalPrice.recurring?.interval !== 'month') {
        return NextResponse.json(
          { error: 'El precio debe ser una suscripción mensual' },
          { status: 400 }
        );
      }

      // El unit_amount del precio es directamente el valor por cuota
      amountPerPayment = originalPrice.unit_amount || 0;
      currency = originalPrice.currency.toLowerCase();

      finalProductId = typeof originalPrice.product === 'string'
        ? originalPrice.product
        : originalPrice.product.id;
    } else {
      return NextResponse.json(
        { error: 'Debe proporcionar priceId o manualPrice con currency' },
        { status: 400 }
      );
    }

    // Validar monto mínimo de Stripe
    const minimumAmount = getMinimumAmount(currency);
    if (amountPerPayment < minimumAmount) {
      return NextResponse.json(
        {
          error: `El monto por cuota (${(amountPerPayment / 100).toFixed(2)} ${currency.toUpperCase()}) es menor al mínimo permitido por Stripe (${(minimumAmount / 100).toFixed(2)} ${currency.toUpperCase()}).`
        },
        { status: 400 }
      );
    }

    // URL base desde la petición: success/cancel apuntan al mismo dominio (Vercel o localhost sin configurar nada)
    const requestUrl = new URL(request.url);
    const appUrl = requestUrl.origin;

    // Un solo pago = pago único (no suscripción)
    if (paymentsCount === 1) {
      const productName = body.productName || 'Pago único';
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency,
              unit_amount: amountPerPayment,
              product_data: {
                name: productName,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/cancel`,
      });
      return NextResponse.json({
        url: session.url,
        sessionId: session.id,
        amountPerPayment,
        totalAmount: amountPerPayment,
        currency,
      });
    }

    // Varios pagos = suscripción con cancelación automática
    const newPrice = await stripe.prices.create({
      product: finalProductId,
      unit_amount: amountPerPayment,
      currency: currency,
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
    });

    const now = new Date();
    const cancelAt = new Date(now);
    cancelAt.setMonth(cancelAt.getMonth() + paymentsCount);
    const cancelAtTimestamp = Math.floor(cancelAt.getTime() / 1000);

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
          original_price_id: priceId || 'manual',
          is_manual_price: (manualPrice !== undefined && manualPrice !== null).toString(),
        },
      },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancel`,
      // Fallback: si la metadata no se copia a la suscripción, el webhook puede leerla de la sesión
      metadata: {
        cancel_at_timestamp: cancelAtTimestamp.toString(),
        payments_count: paymentsCount.toString(),
      },
    };

    const session = await stripe.checkout.sessions.create(
      sessionParams as Stripe.Checkout.SessionCreateParams
    );

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      amountPerPayment, // Precio por cuota
      totalAmount: amountPerPayment * paymentsCount, // Monto total (precio por cuota × cantidad de cuotas)
      currency,
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
