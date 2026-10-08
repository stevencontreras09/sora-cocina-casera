# Sora Cocina Casera - Plataforma de Gestión, Delivery y Finanzas 🍲

Aplicación web full-stack desarrollada con **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Google Maps API** y **Supabase**, lista para desplegarse en **Vercel**.

---

## 🎨 1. Identidad Visual (Paleta Sora)

Configurada en `tailwind.config.ts`:
- **`bg-sora`**: `#FBF6F0` (Crema Vainilla)
- **`primary-sora`**: `#C2665B` (Terracota / Coral)
- **`primary-hover`**: `#A85248`
- **`text-sora`**: `#1E1815` (Espresso Oscuro)
- **`border-sora`**: `#EADCCF` (Lino Suave)
- **`whatsapp`**: `#25D366` (Verde WhatsApp Corporativo)

---

## 🔐 2. Roles de Usuario y Matriz de Acceso

El sistema gestiona los accesos mediante la tabla `profiles` en Supabase y el Middleware de Next.js (`src/middleware.ts`):

| Módulo / Ruta | Admin | Coadmin | Delivery | Descripción |
| :--- | :---: | :---: | :---: | :--- |
| **`/dashboard`** | ✅ | ❌ | ❌ | Métricas de ventas, flujo en cocina y pedidos del día |
| **`/ventas`** | ✅ | ❌ | ❌ | Formulario rápido de pedidos y asignación a repartidores |
| **`/clientes`** | ✅ | ❌ | ❌ | Directorio, Google Maps interactivo y WhatsApp directo |
| **`/gastos`** | ✅ | ✅ | ❌ | Control de egresos con filtro por mes y usuario vinculado |
| **`/delivery`** | ✅ | ✅ | ✅ | Vista Móvil exclusiva ergonómica para repartidores |
| **`/reportes`** | ✅ | ❌ | ❌ | Rentabilidad neta, balance semestral y ticket promedio |
| **`/admin/usuarios`** | ✅ | ❌ | ❌ | **Gestión de perfiles, roles y activación de cuentas** |

---

## 👥 3. Gestión de Usuarios (`/admin/usuarios` - Acceso: Exclusivo Admin)

- **Consulta de `profiles`:** Despliega Email, Nombre completo, Rol y Estado activo/inactivo.
- **Badges Distintivos por Rol:**
  * **Admin:** Terracota (`#C2665B`)
  * **Coadmin:** Azul suave (`#2563EB`)
  * **Delivery:** Verde esmeralda (`#10B981`)
- **Edición de Rol y Asignación de Accesos:**
  * Modal para cambiar de rol (`admin`, `coadmin`, `delivery`).
  * Conmutador para activar o desactivar cuentas (bloqueando acceso en el middleware con mensaje de alerta si está inactivo).
  * **Protección contra auto-degradación:** El administrador en sesión no puede quitarse su propio rol de admin ni desactivar su propia cuenta.
- **Invitación / Registro:** Formulario para registrar a los miembros del equipo con asignación directa de rol en Supabase Auth y `profiles`.

---

## 🛵 4. Interfaz Móvil para Repartidores (`/delivery`)

Optimizada con diseño **Mobile-First** para uso con una sola mano en ruta:
- **Carga de pedidos asignados:** Consulta en Supabase por `delivery_user_id` en estados activos (`Pendiente`, `En Preparacion`, `En Camino`).
- **Indicador destacado de cobro:**
  * **`✓ PAGADO`** en verde esmeralda.
  * **`⚠ COBRAR: $XXX`** en terracota de alerta.
- **Navegación GPS de un solo toque:**
  * **Google Maps:** `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
  * **Waze:** `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`
- **Comunicación rápida:**
  * **WhatsApp Cliente:** `https://wa.me/[telefono]?text=Hola%20[Nombre],%20soy%20el%20delivery%20de%20Sora%20Cocina%20Casera,%20voy%20en%20camino%20con%20tu%20pedido.`
  * **Llamar:** Enlace telefónico directo `tel:[telefono]`.

---

## 🚀 5. Instalación y Ejecución Local

1. Instala dependencias:
   ```bash
   npm install
   ```

2. Verifica tus variables en `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://zotdzsczmytqcxhtmcik.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAf5crs4ySF7j6v71-ErYi6-F5JHLReUFo
   ```

3. Ejecuta el servidor en desarrollo:
   ```bash
   npm run dev
   ```

4. Compilar para producción:
   ```bash
   npm run build
   ```
