import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

/**
 * GET /api/products
 * Devuelve todos los productos activos de Stripe
 */
export async function GET() {
  try {
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    return NextResponse.json({
      products: products.data.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        images: product.images,
      })),
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}
