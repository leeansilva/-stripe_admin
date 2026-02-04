/**
 * Script de verificación de clave de Stripe
 * Ejecuta: node verify-stripe.js
 */

const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

// Leer .env.local
const envPath = path.join(__dirname, '.env.local');
let stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/STRIPE_SECRET_KEY=(.+)/);
  if (match) {
    stripeKey = match[1].trim();
  }
}

if (!stripeKey) {
  console.error('❌ Error: STRIPE_SECRET_KEY no está definida en .env.local');
  process.exit(1);
}

// Verificar formato de la clave
if (!stripeKey.startsWith('sk_')) {
  console.error('❌ Error: La clave no tiene el formato correcto');
  console.error('   Las claves de Stripe deben empezar con: sk_test_ o sk_live_');
  console.error(`   Tu clave empieza con: ${stripeKey.substring(0, 5)}...`);
  process.exit(1);
}

console.log('🔍 Verificando clave de Stripe...');
console.log(`   Tipo: ${stripeKey.startsWith('sk_live_') ? 'PRODUCCIÓN (live)' : 'TEST'}`);
console.log(`   Prefijo: ${stripeKey.substring(0, 12)}...\n`);

const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-02-24.acacia',
});

// Intentar hacer una llamada simple a la API
stripe.products.list({ limit: 1 })
  .then((response) => {
    console.log('✅ ¡Clave de Stripe válida y funcionando!');
    console.log(`   Cuenta conectada correctamente`);
    console.log(`   Productos encontrados: ${response.data.length}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error al verificar la clave:\n');
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('   Tipo: Error de autenticación');
      console.error('   Mensaje:', error.message);
      console.error('\n   Posibles causas:');
      console.error('   - La clave es inválida o incorrecta');
      console.error('   - La clave fue revocada en el Dashboard de Stripe');
      console.error('   - La clave tiene caracteres extra o faltantes');
      console.error('   - La clave pertenece a otra cuenta de Stripe');
    } else if (error.type === 'StripePermissionError') {
      console.error('   Tipo: Error de permisos');
      console.error('   La clave no tiene permisos suficientes');
    } else if (error.type === 'StripeAPIError') {
      console.error('   Tipo: Error de API');
      console.error('   Mensaje:', error.message);
    } else {
      console.error('   Tipo:', error.type || 'Desconocido');
      console.error('   Mensaje:', error.message);
    }
    
    console.error('\n   Verifica con tu cliente:');
    console.error('   1. Que la clave sea correcta y esté activa');
    console.error('   2. Que no haya sido revocada');
    console.error('   3. Que tenga permisos para leer productos');
    
    process.exit(1);
  });
