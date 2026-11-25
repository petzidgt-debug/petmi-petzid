-- ════════════════════════════════════════════════════════════════════════════
-- TIENDA PETMI + TRIBBI · 17_cupon_amigoxmas.sql
-- Cupón AMIGOXMAS: Q25 en la tienda PetMi para quienes participan en el Amigo secreto PetMi.
--   · Monto fijo de Q25, sin compra mínima (Recurrente cobra mínimo Q5: si el carrito es menor a Q30, se descuenta hasta dejar Q5).
--   · Una vez por correo (cuentan solo pedidos PAGADOS) y solo con el correo con el que se inscribieron y pagaron el envío.
--   · Válido hasta el 31 de enero de 2027. No se combina con ofertas como Black Pet Day (cámbialo abajo si quieres).
-- Va junto con el api/crear-checkout.js nuevo. Se puede correr más de una vez.
-- ════════════════════════════════════════════════════════════════════════════
begin;

-- 1. Reglas nuevas para cualquier cupón de la tienda (las que no se usan quedan vacías)
alter table public.cupones_tienda add column if not exists reusable boolean default false;
alter table public.cupones_tienda add column if not exists vence_en timestamptz;
alter table public.cupones_tienda add column if not exists uno_por_correo boolean default false;
alter table public.cupones_tienda add column if not exists solo_tribbi boolean default false;
alter table public.cupones_tienda add column if not exists combina_oferta boolean default false;

-- 2. Cada pedido guarda el cupón que usó (para saber si un correo ya lo usó y para tus reportes)
alter table public.pedidos_tienda add column if not exists cupon text;

-- 3. El cupón (en la tienda se puede escribir AMIGOxMas, AmigoXmas…: se convierte a mayúsculas)
insert into public.cupones_tienda (codigo, tipo, valor, usado, reusable, vence_en, uno_por_correo, solo_tribbi, combina_oferta)
values ('AMIGOXMAS', 'monto_fijo', 25, false, true, '2027-01-31 23:59:59-06', true, true, false)
on conflict (codigo) do update set tipo = 'monto_fijo', valor = 25, usado = false, reusable = true,
  vence_en = excluded.vence_en, uno_por_correo = true, solo_tribbi = true, combina_oferta = excluded.combina_oferta;

-- 4. ¿Este correo participa en el amigo secreto? (inscripción pagada). Solo la usa el servidor de la tienda.
create or replace function public.tribbi_correo_inscrito(p_email text)
returns boolean language sql stable security definer
set search_path to 'tribbi', 'public', 'pg_temp'
as $$
  select exists (
    select 1 from tribbi.inscripciones i join auth.users u on u.id = i.user_id
    where lower(u.email) = lower(btrim(coalesce(p_email, ''))) and i.estado = 'pagada')
$$;
revoke all on function public.tribbi_correo_inscrito(text) from public, anon, authenticated;
grant execute on function public.tribbi_correo_inscrito(text) to service_role;

commit;

-- Comprobación: debe decir monto_fijo | 25 | true | true
select tipo, valor, uno_por_correo, solo_tribbi from public.cupones_tienda where codigo = 'AMIGOXMAS';

-- ── Útiles ──
-- Que sí se combine con Black Pet Day (Q25 menos, sobre el precio ya rebajado):
--   update public.cupones_tienda set combina_oferta = true where codigo = 'AMIGOXMAS';
-- Apagarlo:
--   update public.cupones_tienda set vence_en = now() where codigo = 'AMIGOXMAS';
-- Quién lo ha usado:
--   select email, total_centavos / 100.0 as total_q, estado, created_at from public.pedidos_tienda where cupon = 'AMIGOXMAS' order by created_at desc;
