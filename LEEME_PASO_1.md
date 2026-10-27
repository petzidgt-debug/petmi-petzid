# Paso 1: cerrar el Admin (20 archivos)

**Qué logra:** las páginas de administración dejan de llevar la llave de tu base de datos y la contraseña escrita, y todas piden **la clave de administración** (la misma de la página de correos). El servidor deja de aceptar de cualquiera 81 acciones de administración, como marcar pedidos como pagados o activar Premium.

**Qué NO cambia:** el sitio público, la tienda, el registro, los correos. Nadie más notará nada.

> ⚠️ Se sube **todo junto, en UN solo commit**. Si subes el servidor sin las páginas (o al revés), el Admin deja de funcionar hasta que subas lo que falte.

## Antes de empezar (2 minutos)
1. **Ten a la mano la clave de administración** (la que usas en *Emails y campañas*). Si no la recuerdas, antes de seguir corre `supabase/01_migraciones/configurar_clave_admin.sql` con una nueva (instrucciones dentro del archivo).
2. **Haz un respaldo** de Supabase (*Database → Backups*) o al menos anota qué versión está en producción: Vercel → *Deployments* → el que dice *Production*. Con eso puedes volver atrás en un clic.

## Subir (5 minutos)
1. En GitHub, entra a la **raíz** del repositorio (donde está `index.html`) → *Add file* → *Upload files*.
2. Arrastra **todo el contenido de esta carpeta** (los archivos sueltos **y** la carpeta `api`), salvo `LEEME_PASO_1.md` y `BORRAR_DE_GITHUB.txt`. Son 20 archivos: GitHub debe mostrar `api/admin.js`, `api/crear-checkout.js`, `api/galeria.js` y `api/webhook-premium.js` dentro de la carpeta `api`.
3. Un solo *Commit changes*. Espera a que Vercel diga **Ready** (1–2 minutos).
4. Borra los archivos de `BORRAR_DE_GITHUB.txt` (cada uno es un commit aparte; da igual).

## Comprobar (10 minutos)
1. `app.revistapetmi.com/api/galeria` debe mostrar `"version":"2026-10-27-a"`.
2. `app.revistapetmi.com/api/admin` **no** debe mostrar esa versión (es el proxy de 39 líneas).
3. Abre `app.revistapetmi.com/admin.html` con **Cmd/Ctrl + Shift + R**. Debe aparecer una **pantalla oscura pidiendo la clave de administración**. Escríbela: entra y carga igual que siempre.
4. Abre cada una y verifica que se ve la información:

| Página | Qué mirar |
|---|---|
| `admin.html` | Listado de mascotas, **Pedidos** (en línea y WhatsApp), Eventos, Lugares, Tienda (productos), Carrera |
| `admin-carrera.html` | Lista de reservas |
| `ruleta-carrera-sorteo.html` | Carga las reservas (la usas en vivo: pruébala hoy, no el día del evento) |
| `admin-wazu.html` | Clientes y promos de Wazu |
| `admin-premium.html` | Lista de Premium |
| `admin-afiliados.html`, `admin-evento.html`, `admin-lugar.html`, `admin-mundial.html`, `admin-whatsapp-quiniela.html` | Que abran y muestren datos |
| `emails-mk.html` | Igual que antes (usa la misma clave) |
| La tienda y el registro | Igual que siempre (haz una compra de prueba si puedes) |

5. En `emails-mk.html` → **🔧 Sistema → Probar ahora**: las 3 filas en ✅. Verás un bloque nuevo **"🔐 Secretos en variables de Vercel"** con ⏳: es lo que haremos en el Paso 2; por ahora no falla nada.

## Si algo sale mal
- **Volver atrás al instante:** Vercel → *Deployments* → el despliegue anterior → ⋯ → **Promote to Production** (o *Instant Rollback*). Deshace todo en segundos.
- **La pantalla de entrada dice "Clave incorrecta":** es la clave de `emails-mk.html`. Si no la sabes: `configurar_clave_admin.sql` con una nueva.
- **"Demasiados intentos":** se bloquea 15 minutos tras 10 fallos. Espera.
- **Una página se ve vacía:** abre las herramientas del navegador (F12 → pestaña *Network*) y busca filas en rojo; mándame el nombre de la fila (nunca una llave).

## Importante: esto todavía NO cambia las llaves
La llave vieja sigue valiendo, y sigue en el historial público de GitHub. **Las páginas ya no la llevan, pero hasta cambiarla (Paso 3) cualquiera que la haya copiado antes la puede seguir usando.** Los pasos 2 y 3 están en `docs/PASO_A_PASO_SEGURIDAD.md`.
