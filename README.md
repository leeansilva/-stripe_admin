# Stripe Admin - Sistema de Suscripciones con Cantidad de Pagos

Sistema de pagos con Stripe usando Next.js (App Router) que permite crear suscripciones con cancelación automática después de una cantidad específica de pagos.

## 🎯 Características

- ✅ Listar productos activos desde Stripe
- ✅ Listar precios recurrentes mensuales de un producto
- ✅ Seleccionar cantidad de pagos (1, 3, 6, 12)
- ✅ Crear suscripciones con cancelación automática
- ✅ Stripe gestiona los cobros mensuales automáticamente
- ✅ Seguridad: Stripe solo del lado servidor
- ✅ **NUEVO:** Diseño moderno con Chakra UI
- ✅ **NUEVO:** Estadísticas en tiempo real
- ✅ **NUEVO:** Historial de sesiones creadas
- ✅ **NUEVO:** Interfaz mejorada y responsive

## 🚀 Instalación

1. **Instalar dependencias:**
```bash
npm install
```

2. **Configurar variables de entorno:**
Crea un archivo `.env.local` en la raíz del proyecto:
```env
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Ejecutar en desarrollo:**
```bash
npm run dev
```

4. **Abrir en el navegador:**
```
http://localhost:3000
```

## 📁 Estructura del Proyecto

```
stripe_admin/
├── app/
│   ├── api/
│   │   ├── products/
│   │   │   └── route.ts          # GET /api/products
│   │   ├── prices/
│   │   │   └── [productId]/
│   │   │       └── route.ts      # GET /api/prices/:productId
│   │   └── create-checkout-session/
│   │       └── route.ts          # POST /api/create-checkout-session
│   ├── success/
│   │   └── page.tsx              # Página de éxito
│   ├── cancel/
│   │   └── page.tsx              # Página de cancelación
│   ├── layout.tsx                # Layout principal
│   ├── page.tsx                  # Página principal
│   └── globals.css               # Estilos globales
├── lib/
│   └── stripe.ts                 # Inicialización de Stripe
└── package.json
```

## 🔌 API Routes

### GET /api/products
Devuelve todos los productos activos de Stripe.

**Respuesta:**
```json
{
  "products": [
    {
      "id": "prod_xxx",
      "name": "Plan Básico",
      "description": "Descripción del plan",
      "images": []
    }
  ]
}
```

### GET /api/prices/:productId
Devuelve los precios recurrentes mensuales de un producto.

**Respuesta:**
```json
{
  "prices": [
    {
      "id": "price_xxx",
      "unit_amount": 1000,
      "currency": "usd",
      "interval": "month",
      "interval_count": 1
    }
  ]
}
```

### POST /api/create-checkout-session
Crea una sesión de Checkout de Stripe con suscripción que se cancela automáticamente.

**Body:**
```json
{
  "priceId": "price_xxx",
  "paymentsCount": 3
}
```

**Respuesta:**
```json
{
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_xxx"
}
```

## 🧠 Lógica de Cancelación Automática

El sistema calcula la fecha de cancelación basándose en:
- Fecha actual
- Cantidad de pagos seleccionada
- Intervalo mensual

**Ejemplo:**
- Inicio: 1 de enero
- Pagos: 3
- Cancelación: 1 de abril (3 meses después)

Stripe cancela automáticamente la suscripción en la fecha calculada usando `subscription_data.cancel_at`.

## 🔐 Seguridad

- ✅ `STRIPE_SECRET_KEY` solo se usa del lado servidor
- ✅ Las API routes están protegidas (no exponen keys)
- ✅ El frontend solo llama a endpoints internos
- ✅ Validación de datos en el servidor
- ✅ **Autenticación básica** configurada con variables de entorno

## 📦 Deploy en Vercel

1. **Conectar repositorio a Vercel**
2. **Configurar variables de entorno:**
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_APP_URL` (URL de producción)
3. **Deploy automático**

## 🧪 Pruebas

1. Asegúrate de tener productos y precios creados en Stripe Dashboard
2. Los precios deben ser recurrentes mensuales (`interval: month`)
3. Usa claves de prueba (`sk_test_xxx`) para desarrollo

## 📝 Notas

- Stripe no maneja "cuotas" directamente, sino suscripciones con fecha de cancelación
- La cancelación es automática: Stripe no cobrará después de la fecha calculada
- Los usuarios pueden cancelar manualmente antes si lo desean desde su cuenta de Stripe

## 🔐 Autenticación

**✅ Autenticación básica implementada** usando middleware de Next.js.

### Configuración en Vercel:

1. Ve a **Settings → Environment Variables** en tu proyecto de Vercel
2. Agrega estas variables:
   ```
   ADMIN_USER=tu_usuario
   ADMIN_PASSWORD=tu_contraseña_segura
   ```
3. Redeploy el proyecto

### Alternativa más simple:

También puedes usar **Password Protection de Vercel**:
1. Settings → Deployment Protection
2. Habilita "Password Protection"
3. Ingresa una contraseña

Ver `CONFIGURACION_VERCEL.md` para instrucciones detalladas.

## 🔄 Próximos Pasos

Para agregar webhooks y logging:
```bash
# Agregar webhooks para:
# - checkout.session.completed
# - invoice.paid
```
