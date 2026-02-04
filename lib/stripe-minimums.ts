/**
 * Montos mínimos de Stripe por moneda
 * Fuente: https://stripe.com/docs/currencies#minimum-and-maximum-charge-amounts
 */
export const STRIPE_MINIMUM_AMOUNTS: Record<string, number> = {
  usd: 50, // $0.50
  eur: 50, // €0.50
  gbp: 30, // £0.30
  cad: 50, // C$0.50
  aud: 50, // A$0.50
  jpy: 50, // ¥50
  mxn: 10, // $10 MXN
  brl: 50, // R$0.50
  ars: 50, // $0.50 ARS
  clp: 50, // $50 CLP
  cop: 2000, // $2,000 COP
  pen: 200, // S/2.00
  // Agregar más monedas según sea necesario
};

/**
 * Obtiene el monto mínimo para una moneda
 * @param currency Código de moneda (ej: 'usd', 'eur')
 * @returns Monto mínimo en centavos/unidad más pequeña
 */
export function getMinimumAmount(currency: string): number {
  const normalizedCurrency = currency.toLowerCase();
  return STRIPE_MINIMUM_AMOUNTS[normalizedCurrency] || 50; // Default: 50 centavos
}
