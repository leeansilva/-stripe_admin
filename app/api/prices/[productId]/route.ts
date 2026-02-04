import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

/**
 * GET /api/prices/:productId
 * Devuelve los precios recurrentes mensuales de un producto
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
    });

    // Filtrar solo precios recurrentes mensuales
    const monthlyPrices = prices.data.filter(
      (price) =>
        price.type === 'recurring' &&
        price.recurring?.interval === 'month'
    );

    return NextResponse.json({
      prices: monthlyPrices.map((price) => ({
        id: price.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        interval_count: price.recurring?.interval_count,
      })),
    });
  } catch (error) {
    console.error('Error al obtener precios:', error);
    return NextResponse.json(
      { error: 'Error al obtener precios' },
      { status: 500 }
    );
  }
}
