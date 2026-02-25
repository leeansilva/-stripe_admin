# 🔐 Configuración de Autenticación en Vercel

## Opción 1: Autenticación con Variables de Entorno (IMPLEMENTADA)

Ya está implementada en el código. Solo necesitas configurar las variables de entorno en Vercel.

### Pasos:

1. **Ve a tu proyecto en Vercel Dashboard**
   - https://vercel.com/dashboard

2. **Ve a Settings → Environment Variables**

3. **Agrega las siguientes variables:**

   ```
   ADMIN_USER=tu_usuario
   ADMIN_PASSWORD=tu_contraseña_segura
   ```

   **Para que las suscripciones tengan límite de ciclos (expiren después de N pagos):**
   - Configura el **webhook de Stripe** en el Dashboard de Stripe → Developers → Webhooks → Add endpoint.
   - URL del endpoint: `https://tu-dominio.vercel.app/api/webhooks/stripe`
   - Eventos: marca al menos `checkout.session.completed`.
   - Añade la variable de entorno en Vercel: `STRIPE_WEBHOOK_SECRET` con el “Signing secret” del webhook.

   **Ejemplo:**
   ```
   ADMIN_USER=admin
   ADMIN_PASSWORD=MiContraseñaSuperSegura123!
   ```

4. **Redeploy el proyecto** (o espera al siguiente deploy automático)

5. **Listo!** Ahora cuando accedas a tu sitio, te pedirá usuario y contraseña.

### Cómo funciona:

- El navegador mostrará un popup de autenticación básica
- Ingresa el usuario y contraseña que configuraste
- La sesión dura 7 días (cookie)
- Solo las rutas de webhooks están exentas (necesarias para Stripe)

---

## Opción 2: Password Protection de Vercel (MÁS SIMPLE)

Si prefieres una solución aún más simple sin código:

### Pasos:

1. **Ve a tu proyecto en Vercel Dashboard**

2. **Settings → Deployment Protection**

3. **Habilita "Password Protection"**

4. **Ingresa una contraseña**

5. **Guarda**

6. **Listo!** Toda la aplicación queda protegida con una contraseña.

### Ventajas:
- ✅ Muy simple (2 clicks)
- ✅ Sin código adicional
- ✅ Funciona inmediatamente

### Desventajas:
- ⚠️ Una sola contraseña para todos
- ⚠️ No puedes tener múltiples usuarios

---

## Recomendación

**Para uso personal/privado:** Usa la **Opción 2 (Password Protection de Vercel)** - Es más simple y suficiente.

**Para múltiples usuarios o más control:** Usa la **Opción 1 (Variables de entorno)** que ya está implementada.

---

## Nota Importante

⚠️ **En desarrollo local**, si no configuras `ADMIN_USER` y `ADMIN_PASSWORD`, la aplicación funciona sin autenticación para facilitar el desarrollo.

**En producción (Vercel)**, asegúrate de configurar las variables de entorno para que la autenticación funcione.
