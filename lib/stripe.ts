import Stripe from 'stripe';

/**
 * Inicialización segura de Stripe del lado servidor
 * La clave secreta nunca debe exponerse al cliente
 * 
 * Soporta tanto Standard keys (sk_live_...) como Restricted keys (rk_live_...)
 */
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey && process.env.NODE_ENV !== 'test') {
  // Solo lanzar error en runtime, no durante el build
  if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
    console.warn('STRIPE_SECRET_KEY no está definida. Las funciones de Stripe no funcionarán.');
  }
}

// Validar formato de clave (acepta sk_ y rk_)
const isValidStripeKey = (key: string | undefined): boolean => {
  if (!key) return false;
  // Acepta Standard keys (sk_live_ o sk_test_) y Restricted keys (rk_live_ o rk_test_)
  return /^(sk|rk)_(live|test)_/.test(key);
};

export const stripe = stripeSecretKey && isValidStripeKey(stripeSecretKey)
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  : ({} as Stripe); // Objeto vacío para evitar errores durante el build
