import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

/** Lista blanca: solo estos nombres exactos se muestran (según capturas del cliente) */
const ALLOWED_PRODUCT_NAMES = [
  'Developer/Data Engineer - Online mentorship / Online Course / Curso Online',
  'Developer/Data Engineer - Online mentorship / Sesion 1 - 1',
  'Developer/Data Engineer - Online mentorship / Online Course / Curso Online - 2 Pagos',
  'Developer/Data Engineer - Online mentorship / Online Course / Curso Online - 3 Pagos',
  'Developer/Data Engineer - Online mentorship / Online Course / Curso Online - 4 Pagos',
];

/**
 * GET /api/products
 * Devuelve solo los productos permitidos (lista blanca por nombre exacto)
 */
export async function GET() {
  try {
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    const allowedSet = new Set(ALLOWED_PRODUCT_NAMES);
    const filtered = products.data.filter((product) =>
      allowedSet.has(product.name)
    );

    return NextResponse.json({
      products: filtered.map((product) => ({
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
