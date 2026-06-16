import { useState } from "react";

const ALBUM_URL = "https://photos.google.com/share/AF1QipOhA5XOMQKE18avZesnViQWGsOTXPAQqC3sKiWHeun67OapOkfew3UD5e4QYHqxNw";

const DAYS = [
  {
    num: "24", label: "Mié · Jun", title: "Llegada a Guadalajara", badge: "🛬 Llegada", color: "#2D5016",
    activities: [
      { time: "6:00 PM", icon: "🏠", name: "Check-in Casa del Patio", desc: "Calle Escorza 417, Col. Americana. Boutique hotel tranquilo y bien ubicado.", tags: [] },
      { time: "7:30 PM", icon: "🍽️", name: "Cena en la Americana", desc: "Av. Chapultepec a pasos. La Tequila Cocina o cualquier restaurante del barrio.", tags: ["food"] },
    ]
  },
  {
    num: "25", label: "Jue · Jun", title: "Centro Histórico + 🎸 Alejandro Fdz", badge: "🎸 Concierto", color: "#4A7C59",
    activities: [
      { time: "10:00 AM", icon: "🏛️", name: "Instituto Cultural Cabañas", desc: "UNESCO. Murales de Orozco en la cúpula. ~$80 MXN. Uber ~$50. Cerrado lunes.", tags: ["must"] },
      { time: "12:00 PM", icon: "⚽", name: "FIFA Fan Fest — Plaza Liberación", desc: "Gratis. Transmisión en vivo de todos los partidos. 60,000 personas/día. 10am–11pm.", tags: ["free"] },
      { time: "2:00 PM", icon: "🍲", name: "La Chata de Guadalajara", desc: "80 años. 4.6★ · 23,000 reseñas. Torta ahogada, pozole, enchiladas tapatías.", tags: ["must", "food"], mapsUrl: "https://maps.google.com/?cid=7852885374401021280" },
      { time: "3:30 PM", icon: "⛪", name: "Catedral y Plaza de Armas", desc: "Paseo por el centro. Teatro Degollado, Plaza Tapatía, ambiente mundialista.", tags: [] },
      { time: "Noche", icon: "🎸", name: "Alejandro Fernández — Glorieta La Minerva", desc: "Concierto al aire libre. Llegar temprano. Uber desde centro ~10 min.", tags: ["event"], mapsUrl: "https://maps.google.com/?cid=4849993490534301966" },
    ]
  },
  {
    num: "26", label: "Vie · Jun", title: "Acuario + ⚽ Uruguay vs España 6pm", badge: "⚽ Mundial", color: "#1565C0",
    activities: [
      { time: "11:00 AM", icon: "🐠", name: "Acuario Michin", desc: "4.6★ · 26,000 reseñas. Reserva online. Capibaras, aves, cabras interactivas. Metro Juárez o Uber ~$50.", tags: ["must"], mapsUrl: "https://maps.google.com/?cid=2124888181077620162" },
      { time: "2:00 PM", icon: "🥩", name: "Karne Garibaldi", desc: "Récord Guinness: carne en su jugo en 40 seg. 4.6★ · 33,000 reseñas. Cerca del hotel.", tags: ["must", "food"], mapsUrl: "https://maps.google.com/?cid=14423620267480614218" },
      { time: "5:30 PM", icon: "⚽", name: "Uruguay vs España — Fan Fest Plaza Liberación", desc: "60,000 personas. Partido 66 del Mundial. Llegar 30 min antes. Gratis.", tags: ["event", "free"], mapsUrl: "https://maps.google.com/?cid=8165146298086361182" },
    ]
  },
  {
    num: "27", label: "Sáb · Jun", title: "🚂 Tren Tequila Express", badge: "🌵 Todo el día", color: "#795548",
    activities: [
      { time: "7:15 AM", icon: "🚂", name: "Salida hacia estación — Tren 8am", desc: "⚠️ Salir 7:15am. Uber ~15 min desde hotel. No desayunar fuerte — hay comida a bordo. Música en vivo, tequila artesanal, hacienda, campos de agave UNESCO. Regreso ~6–7pm.", tags: ["alert"], mapsUrl: "https://maps.google.com/?cid=2142371822430279900" },
    ]
  },
  {
    num: "28", label: "Dom · Jun", title: "😴 Día de descanso", badge: "🛋️ Free day", color: "#6A6A6A",
    activities: [
      { time: "Todo el día", icon: "☕", name: "Sin planes fijos", desc: "Brunch en la Americana, Parque Revolución, FIFA Fan Fest por la tarde (gratis). La Tequila Cocina abre desde 1pm.", tags: [] },
    ]
  },
  {
    num: "29", label: "Lun · Jun", title: "🛍️ Tlaquepaque", badge: "🛍️ Artesanías", color: "#E65100",
    activities: [
      { time: "10:30 AM", icon: "🛍️", name: "Tlaquepaque — Calle Independencia", desc: "Galerías, artesanías, El Parián con mariachis. Todo abierto. Uber ~20 min, ~$80 MXN.", tags: ["must"], mapsUrl: "https://maps.google.com/?cid=16886086056187464546" },
      { time: "1:00 PM", icon: "🌺", name: "Casa Fuerte Tlaquepaque", desc: "4.7★. Patio jardín colonial. Mole de camarones, enmoladas oaxaqueñas.", tags: ["must", "food"], mapsUrl: "https://maps.google.com/?cid=17307205063851710412" },
      { time: "Tarde", icon: "🎶", name: "El Parián — Mariachis en vivo", desc: "Plaza central de Tlaquepaque. Mariachis desde el mediodía. Copa y ambiente tapatío auténtico.", tags: [] },
    ]
  },
  {
    num: "30", label: "Mar · Jun", title: "🕌 Zapopan + 🥊 Luchas", badge: "🥊 Gran noche", color: "#6A1B9A",
    activities: [
      { time: "10:30 AM", icon: "🕌", name: "Basílica de Zapopan + Plaza", desc: "4.8★. Basílica, Museo Huichol, esquites. Macrobús L1 ~$12 MXN / 35 min, o Uber ~$80.", tags: ["must"], mapsUrl: "https://maps.google.com/?cid=15492390400401168095" },
      { time: "2:30 PM", icon: "🍷", name: "Alcalde Restaurante", desc: "Uno de los mejores de México. 4.6★. Cocina de autor. Reserva en alcalde.com.mx. ~$3,000 MXN degustación.", tags: ["must", "food"], mapsUrl: "https://maps.google.com/?cid=16447800704257734701" },
      { time: "8:30 PM", icon: "🥊", name: "Arena Coliseo de Guadalajara — Lucha Libre", desc: "4.7★ · 5,000 reseñas. ¡Martes = Lucha Libre CMLL! Funciones ~9pm. Uber obligatorio. Cervezas baratas, ambiente total.", tags: ["must", "event"], mapsUrl: "https://maps.google.com/?cid=9049096705661470274" },
    ]
  },
  {
    num: "1", label: "Mié · Jul", title: "✈️ Mañana libre + Regreso", badge: "🛫 Vuelo tarde", color: "#37474F",
    activities: [
      { time: "Mañana", icon: "🛒", name: "Mañana libre — Mercado Libertad o paseo", desc: "Souvenirs y comida de mercado. El mercado cubierto más grande de Latinoamérica.", tags: [], mapsUrl: "https://maps.google.com/maps?q=Mercado+Libertad+Guadalajara" },
      { time: "~2:00 PM", icon: "🚕", name: "Uber al Aeropuerto GDL", desc: "⚠️ Salir 2.5 hrs antes del vuelo. ~$200–250 MXN, 25–40 min según tráfico.", tags: ["alert"] },
    ]
  },
];

const RESTOS = [
  { emoji: "🍲", name: "La Chata de Guadalajara", stars: "4.6★ · 23,000 reseñas", desc: "80 años de historia. Torta ahogada, pozole y enchiladas tapatías.", zone: "Centro · Jue 25", mapsUrl: "https://maps.google.com/?cid=7852885374401021280" },
  { emoji: "🥩", name: "Karne Garibaldi", stars: "4.6★ · 33,000 reseñas", desc: "Récord Guinness: carne en su jugo en 40 segundos. Frijoles de la olla increíbles.", zone: "Santa Teresita · Vie 26", mapsUrl: "https://maps.google.com/?cid=14423620267480614218" },
  { emoji: "🌮", name: "La Tequila Cocina", stars: "4.7★ · 7,800 reseñas", desc: "Cocina mexicana de excelencia. Tacos, molcajetes, mole y cocteles memorables.", zone: "Col. Americana · Mié 24", mapsUrl: "https://maps.google.com/?cid=13134601285460284810" },
  { emoji: "🍷", name: "Alcalde Restaurante", stars: "4.6★ · 1,700 reseñas", desc: "Uno de los mejores de México. Cocina de autor. Reserva previa obligatoria.", zone: "Vallarta Norte · Mar 30", mapsUrl: "https://maps.google.com/?cid=16447800704257734701" },
  { emoji: "🌺", name: "Casa Fuerte Tlaquepaque", stars: "4.7★ · 400 reseñas", desc: "Patio jardín colonial espectacular. Mole de camarones, enmoladas oaxaqueñas.", zone: "Tlaquepaque · Lun 29", mapsUrl: "https://maps.google.com/?cid=17307205063851710412" },
  { emoji: "🥗", name: "Mercado Libertad", stars: "⭐ Clásico tapatío", desc: "El mercado cubierto más grande de Latinoamérica. Birria, tamales, jugos desde $50 MXN.", zone: "Centro · Mié 1 Jul", mapsUrl: "https://maps.google.com/maps?q=Mercado+Libertad+Guadalajara" },
];

const MOBILITY = [
  { icon: "📱", title: "Uber — Primera opción", desc: "Funciona excelente en GDL. $40–120 MXN la mayoría de trayectos. Recomendado de noche, Tlaquepaque, Arena y aeropuerto.", url: "https://www.uber.com/mx/es/", urlLabel: "Abrir Uber" },
  { icon: "🚇", title: "Metro + Tren Ligero", desc: "Líneas TL-1 y TL-2. Estación Juárez cerca de la Americana. ~$12 MXN/viaje. App Moovit para rutas.", url: "https://moovitapp.com", urlLabel: "Ver en Moovit" },
  { icon: "🚌", title: "Macrobús", desc: "Línea 1 para Zapopan (~35 min desde Av. Federalismo). ~$12 MXN. Rápido para distancias largas.", url: "https://www.siteur.gob.mx/macrobus", urlLabel: "siteur.gob.mx" },
  { icon: "🚲", title: "MiBici — Bicicletas públicas", desc: "Sistema de bicicletas compartidas en 300+ estaciones. Ideal para la Col. Americana y el centro. Pase diario ~$50 MXN. App MiBici para ver estaciones.", url: "https://mibici.net", urlLabel: "mibici.net" },
  { icon: "🚶", title: "A pie desde el hotel", desc: "La Col. Americana tiene todo caminando: Av. Chapultepec, Parque Revolución, restaurantes, cafés.", url: null },
  { icon: "✈️", title: "Aeropuerto GDL", desc: "Uber directo desde baggage claim. ~$200–250 MXN, 20–30 min. Conductor en 4–8 min. Sin negociación de precio.", url: "https://www.aeropuertoguadalajara.com.mx", urlLabel: "aeropuertoguadalajara.com.mx" },
  { icon: "🚕", title: "Taxi oficial (aeropuerto)", desc: "Caja oficial dentro de terminal. Precio fijo por zona. Evita taxistas con chaleco en el pasillo — cobran el doble.", url: null },
  { icon: "🗺️", title: "Tlaquepaque y Tren", desc: "Solo Uber o taxi — sin metro directo. Tlaquepaque ~$80 MXN. Estación tren ~$50–70 MXN desde hotel.", url: null },
];

// Lugares en el mapa agrupados por día
const PLACES = [
  { lat: 20.6708516, lng: -103.3583354, emoji: "🏠", title: "Casa del Patio", sub: "Hotel · Base", color: "#2D5016", day: "base", mapsUrl: "https://maps.google.com/?cid=4849993490534301966" },
  // Jue 25
  { lat: 20.676557,  lng: -103.338246,  emoji: "🏛️", title: "Cabañas UNESCO", sub: "Jue 25 · 10am", color: "#4A7C59", day: "25", mapsUrl: "https://maps.google.com/?cid=5197980866120828450" },
  { lat: 20.677004,  lng: -103.346344,  emoji: "⚽", title: "FIFA Fan Fest", sub: "Todos los días", color: "#4A7C59", day: "25", mapsUrl: "https://maps.google.com/?cid=8165146298086361182" },
  { lat: 20.674693,  lng: -103.346653,  emoji: "🍲", title: "La Chata", sub: "Jue 25 · 2pm", color: "#4A7C59", day: "25", mapsUrl: "https://maps.google.com/?cid=7852885374401021280" },
  { lat: 20.6743943, lng: -103.387413,  emoji: "🎸", title: "La Minerva · Alejandro Fdz", sub: "Jue 25 · noche", color: "#4A7C59", day: "25", mapsUrl: "https://maps.google.com/?cid=4849993490534301966" },
  // Vie 26
  { lat: 20.692824,  lng: -103.351358,  emoji: "🐠", title: "Acuario Michin", sub: "Vie 26 · 11am", color: "#1565C0", day: "26", mapsUrl: "https://maps.google.com/?cid=2124888181077620162" },
  { lat: 20.681390,  lng: -103.366382,  emoji: "🥩", title: "Karne Garibaldi", sub: "Vie 26 · 2pm", color: "#1565C0", day: "26", mapsUrl: "https://maps.google.com/?cid=14423620267480614218" },
  // Sáb 27
  { lat: 20.6563625, lng: -103.3523101, emoji: "🚂", title: "Tren Tequila Express", sub: "Sáb 27 · 8am", color: "#795548", day: "27", mapsUrl: "https://maps.google.com/?cid=2142371822430279900" },
  // Lun 29
  { lat: 20.638374,  lng: -103.312374,  emoji: "🛍️", title: "Tlaquepaque", sub: "Lun 29 · 10:30am", color: "#E65100", day: "29", mapsUrl: "https://maps.google.com/?cid=16886086056187464546" },
  { lat: 20.639415,  lng: -103.314189,  emoji: "🌺", title: "Casa Fuerte", sub: "Lun 29 · 1pm", color: "#E65100", day: "29", mapsUrl: "https://maps.google.com/?cid=17307205063851710412" },
  // Mar 30
  { lat: 20.759162,  lng: -103.431396,  emoji: "🕌", title: "Basílica Zapopan", sub: "Mar 30 · 10:30am", color: "#6A1B9A", day: "30", mapsUrl: "https://maps.google.com/?cid=15492390400401168095" },
  { lat: 20.679327,  lng: -103.389796,  emoji: "🍷", title: "Alcalde", sub: "Mar 30 · 2:30pm", color: "#6A1B9A", day: "30", mapsUrl: "https://maps.google.com/?cid=16447800704257734701" },
  { lat: 20.671229,  lng: -103.342762,  emoji: "🥊", title: "Arena Coliseo · Luchas", sub: "Mar 30 · 8:30pm", color: "#6A1B9A", day: "30", mapsUrl: "https://maps.google.com/?cid=9049096705661470274" },
];

const DAY_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "base", label: "🏠 Hotel" },
  { id: "25", label: "Jue 25" },
  { id: "26", label: "Vie 26" },
  { id: "27", label: "Sáb 27" },
  { id: "29", label: "Lun 29" },
  { id: "30", label: "Mar 30" },
];

const TAG_STYLES = {
  must:  { bg: "#E8F5E1", color: "#2D6A00", label: "MUST" },
  food:  { bg: "#FEF3DC", color: "#8A5E00", label: "A COMER" },
  event: { bg: "#EDE8FF", color: "#4B3A9E", label: "EVENTO" },
  alert: { bg: "#FDECEA", color: "#9E1A0A", label: "⚠️ OJO" },
  free:  { bg: "#E1F5FE", color: "#0A6A9E", label: "GRATIS" },
};

const AGAVE = "#2D5016";
const GOLD  = "#C9972B";
const CREAM = "#FDF6E3";

function Tag({ type }) {
  const s = TAG_STYLES[type];
  if (!s) return null;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "1px 6px", whiteSpace: "nowrap", letterSpacing: ".04em" }}>
      {s.label}
    </span>
  );
}

function DayCard({ day, isOpen, onToggle }) {
  return (
    <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(0,0,0,.08)", boxShadow: isOpen ? "0 4px 20px rgba(0,0,0,.1)" : "0 1px 6px rgba(0,0,0,.05)", marginBottom: 10 }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: day.color, cursor: "pointer", userSelect: "none" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 28, fontWeight: 900, color: GOLD, lineHeight: 1, minWidth: 38 }}>{day.num}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.5)", marginBottom: 1 }}>{day.label}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{day.title}</div>
        </div>
        <div style={{ background: "rgba(201,151,43,.25)", color: GOLD, borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{day.badge}</div>
        <div style={{ color: "rgba(255,255,255,.6)", fontSize: 14, marginLeft: 4 }}>{isOpen ? "▲" : "▼"}</div>
      </div>
      {isOpen && (
        <div style={{ background: "#fff", padding: "10px 16px" }}>
          {day.activities.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < day.activities.length - 1 ? "1px solid rgba(0,0,0,.06)" : "none" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9A8A70", minWidth: 50, paddingTop: 2 }}>{a.time}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1209" }}>{a.icon} {a.name}</span>
                  {a.tags.map(t => <Tag key={t} type={t} />)}
                </div>
                <div style={{ fontSize: 12, color: "#7A6A50", lineHeight: 1.5 }}>{a.desc}</div>
                {a.mapsUrl && (
                  <a href={a.mapsUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 5, fontSize: 11, color: "#1A73E8", fontWeight: 600, textDecoration: "none" }}>
                    📍 Ver en Google Maps
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MapView() {
  const [active, setActive] = useState(null);
  const [dayFilter, setDayFilter] = useState("all");

  const filtered = PLACES.filter(p => dayFilter === "all" || p.day === dayFilter);

  const toXY = (lat, lng) => ({
    x: ((lng - (-103.46)) / ((-103.28) - (-103.46))) * 100,
    y: ((20.775 - lat) / (20.775 - 20.62)) * 100,
  });

  const DAY_COLORS = {
    base: "#2D5016", "25": "#4A7C59", "26": "#1565C0",
    "27": "#795548", "29": "#E65100", "30": "#6A1B9A",
  };

  return (
    <div>
      {/* Day filter chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {DAY_FILTERS.map(f => (
          <button key={f.id} onClick={() => { setDayFilter(f.id); setActive(null); }} style={{
            padding: "5px 13px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
            background: dayFilter === f.id ? (DAY_COLORS[f.id] || AGAVE) : "#fff",
            color: dayFilter === f.id ? "#fff" : "#5A4A30",
            border: `1.5px solid ${dayFilter === f.id ? "transparent" : "rgba(0,0,0,.1)"}`,
          }}>{f.label}</button>
        ))}
      </div>

      <div style={{ position: "relative", background: "#E8F0DC", borderRadius: 14, overflow: "hidden", border: "2px solid rgba(0,0,0,.1)" }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", display: "block" }}>
          <rect width="100" height="100" fill="#EEF3E5" />
          {[15,25,35,45,55,65,75,85].map(v => (
            <line key={`h${v}`} x1="0" y1={v} x2="100" y2={v} stroke="rgba(255,255,255,.5)" strokeWidth=".25" />
          ))}
          {[15,25,35,45,55,65,75,85].map(v => (
            <line key={`v${v}`} x1={v} y1="0" x2={v} y2="100" stroke="rgba(255,255,255,.5)" strokeWidth=".25" />
          ))}
          {filtered.map((p, i) => {
            const { x, y } = toXY(p.lat, p.lng);
            const isAct = active === i;
            return (
              <g key={i} style={{ cursor: "pointer" }} onClick={() => setActive(active === i ? null : i)}>
                <circle cx={x} cy={y} r={isAct ? 4 : 3} fill={p.color} stroke="#fff" strokeWidth={isAct ? 1.5 : .8}
                  style={{ filter: isAct ? "drop-shadow(0 0 3px rgba(0,0,0,.4))" : "none" }} />
                <text x={x} y={y - 4.5} textAnchor="middle" fontSize="3.2" style={{ pointerEvents: "none" }}>
                  {p.emoji}
                </text>
              </g>
            );
          })}
        </svg>

        {active !== null && filtered[active] && (
          <div style={{
            position: "absolute", bottom: 12, left: 12, right: 12,
            background: "#fff", borderRadius: 10, padding: "10px 14px",
            boxShadow: "0 4px 16px rgba(0,0,0,.2)",
            borderLeft: `4px solid ${filtered[active].color}`
          }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{filtered[active].emoji} {filtered[active].title}</div>
            <div style={{ fontSize: 12, color: "#7A6A50", marginTop: 2, marginBottom: 6 }}>{filtered[active].sub}</div>
            {filtered[active].mapsUrl && (
              <a href={filtered[active].mapsUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11.5, color: "#1A73E8", fontWeight: 600, textDecoration: "none" }}>
                📍 Abrir en Google Maps →
              </a>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {[
          { color: "#2D5016", label: "Hotel" },
          { color: "#4A7C59", label: "Jue 25" },
          { color: "#1565C0", label: "Vie 26" },
          { color: "#795548", label: "Sáb 27" },
          { color: "#E65100", label: "Lun 29" },
          { color: "#6A1B9A", label: "Mar 30" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff", borderRadius: 8, padding: "4px 10px", border: "1px solid rgba(0,0,0,.08)", fontSize: 11, color: "#5A4A30" }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: l.color, flexShrink: 0 }} />
            {l.label}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: "#9A8A70", marginTop: 8, textAlign: "center" }}>Toca cada punto · filtra por día arriba</p>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("itinerario");
  const [openDay, setOpenDay] = useState(0);

  const tabs = [
    { id: "itinerario", label: "📅 Itinerario" },
    { id: "mapa",       label: "🗺️ Mapa" },
    { id: "comer",      label: "🍽️ A comer" },
    { id: "movilidad",  label: "🚇 Movilidad" },
    { id: "fotos",      label: "📸 Fotos" },
  ];

  return (
    <div style={{ fontFamily: "Inter,system-ui,sans-serif", background: CREAM, minHeight: "100vh", color: "#1A1209" }}>

      {/* HERO */}
      <div style={{ background: AGAVE, color: "#fff", padding: "40px 20px 34px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 70% 0%, rgba(201,151,43,.2) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: GOLD, fontWeight: 700, marginBottom: 10 }}>🌵 Viaje · Mundial 2026</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: "clamp(1.8rem,5vw,3rem)", fontWeight: 900, lineHeight: 1.1, marginBottom: 8 }}>
          Guadalajara<br /><span style={{ color: GOLD }}>24 Jun – 1 Jul 2026</span>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", marginBottom: 20 }}>Casa del Patio · Calle Escorza 417, Col. Americana</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
          {["🚂 Tren Tequila","⚽ Uruguay vs España","🥊 Lucha Libre","🎸 Alejandro Fdz","🐠 Acuario","🛍️ Tlaquepaque"].map(p => (
            <span key={p} style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 99, padding: "4px 12px", fontSize: 11.5, color: "rgba(255,255,255,.85)" }}>{p}</span>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 4, background: AGAVE, padding: "8px 12px", position: "sticky", top: 0, zIndex: 100, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink: 0, padding: "7px 15px", borderRadius: 99, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "none",
            background: tab === t.id ? GOLD : "rgba(255,255,255,.1)",
            color: tab === t.id ? "#1A1209" : "rgba(255,255,255,.75)",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 16px 60px" }}>

        {/* ITINERARIO */}
        {tab === "itinerario" && (
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontSize: "1.3rem", color: AGAVE, margin: "28px 0 14px", paddingBottom: 8, borderBottom: `2px solid ${GOLD}` }}>📅 Día a día</div>
            {DAYS.map((day, i) => (
              <DayCard key={i} day={day} isOpen={openDay === i} onToggle={() => setOpenDay(openDay === i ? -1 : i)} />
            ))}
          </div>
        )}

        {/* MAPA */}
        {tab === "mapa" && (
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontSize: "1.3rem", color: AGAVE, margin: "28px 0 14px", paddingBottom: 8, borderBottom: `2px solid ${GOLD}` }}>🗺️ Mapa del viaje</div>
            <MapView />
          </div>
        )}

        {/* A COMER */}
        {tab === "comer" && (
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontSize: "1.3rem", color: AGAVE, margin: "28px 0 14px", paddingBottom: 8, borderBottom: `2px solid ${GOLD}` }}>🍽️ Must Eats</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
              {RESTOS.map((r, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid rgba(0,0,0,.08)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{r.emoji}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: GOLD, marginBottom: 6 }}>{r.stars}</div>
                  <p style={{ fontSize: 12, color: "#7A6A50", lineHeight: 1.5, marginBottom: 8, flex: 1 }}>{r.desc}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: AGAVE, borderBottom: `1.5px solid ${GOLD}`, paddingBottom: 1 }}>{r.zone}</span>
                    <a href={r.mapsUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: "#1A73E8", fontWeight: 600, textDecoration: "none" }}>
                      📍 Maps
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MOVILIDAD */}
        {tab === "movilidad" && (
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontSize: "1.3rem", color: AGAVE, margin: "28px 0 14px", paddingBottom: 8, borderBottom: `2px solid ${GOLD}` }}>🚇 Movilidad en Guadalajara</div>

            {/* Aeropuerto destacado */}
            <div style={{ background: AGAVE, color: "#fff", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontFamily: "Georgia,serif", fontSize: 16, color: GOLD, marginBottom: 6 }}>✈️ Aeropuerto GDL → Casa del Patio</div>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.75)", marginBottom: 14 }}>~18 km al hotel. <strong>Uber es la mejor opción</strong> — opera libremente desde la sala de llegadas.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8 }}>
                {[
                  { label: "⭐ Recomendado", title: "📱 Uber", desc: "Pídelo en baggage claim. 4–8 min. Sin negociación.", price: "~$200–250 MXN · 20–30 min", highlight: true },
                  { label: "Oficial", title: "🚕 Taxi aeroportuario", desc: "Caja oficial en terminal. Precio fijo. Evita los del pasillo.", price: "~$350–450 MXN · 20 min", highlight: false },
                  { label: "Económico", title: "🚌 Autobús + Tren", desc: "350 m caminando al paradero. C98 → TL-1 → Juárez.", price: "~$30 MXN · 55–70 min", highlight: false },
                ].map(c => (
                  <div key={c.title} style={{ background: c.highlight ? "rgba(201,151,43,.15)" : "rgba(255,255,255,.07)", border: `1px solid ${c.highlight ? GOLD : "rgba(255,255,255,.15)"}`, borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: GOLD, fontWeight: 700, marginBottom: 2 }}>{c.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.65)", lineHeight: 1.5, marginBottom: 7 }}>{c.desc}</div>
                    <span style={{ background: "rgba(201,151,43,.25)", borderRadius: 6, padding: "2px 7px", fontSize: 10.5, color: GOLD, fontWeight: 600 }}>{c.price}</span>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,.4)" }}>⚠️ Regreso mié 1 Jul: salir 2.5 hrs antes. Uber ~25–40 min.</p>
            </div>

            {/* Resto de opciones */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
              {MOBILITY.map((m, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid rgba(0,0,0,.08)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{m.icon}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>{m.title}</div>
                  <p style={{ fontSize: 12, color: "#7A6A50", lineHeight: 1.5, flex: 1 }}>{m.desc}</p>
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-block", marginTop: 8, fontSize: 11.5, color: "#1A73E8", fontWeight: 600, textDecoration: "none" }}>
                      🔗 {m.urlLabel}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOTOS */}
        {tab === "fotos" && (
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontSize: "1.3rem", color: AGAVE, margin: "28px 0 14px", paddingBottom: 8, borderBottom: `2px solid ${GOLD}` }}>📸 Álbum compartido del viaje</div>
            <div style={{ background: "linear-gradient(135deg,#1A73E8 0%,#0D47A1 100%)", borderRadius: 16, padding: 26, color: "#fff" }}>
              <div style={{ fontFamily: "Georgia,serif", fontSize: "1.2rem", marginBottom: 6 }}>📷 Álbum Google Fotos — Guadalajara 2026</div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.8)", marginBottom: 22 }}>El álbum ya está creado. Toca el botón para abrirlo y agregar tus fotos.</p>
              <a href={ALBUM_URL} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: "#1A73E8", borderRadius: 99, padding: "11px 24px", fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: "0 2px 10px rgba(0,0,0,.2)" }}>
                📷 Abrir álbum compartido
              </a>
              <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { num: "1", title: "Abre el álbum", desc: "Toca el botón de arriba. Se abre en Google Fotos." },
                  { num: "2", title: "Agrega tus fotos", desc: "Toca + y selecciona de tu galería. Puedes subir varias a la vez." },
                  { num: "3", title: "Comparte el link", desc: "Manda el link por WhatsApp a tu compañero para que también suba." },
                  { num: "4", title: "Activa sincronización", desc: "En Google Fotos activa 'Contribuciones automáticas' para subida automática." },
                ].map(s => (
                  <div key={s.num} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ background: "rgba(255,255,255,.15)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{s.num}</div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 1 }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", lineHeight: 1.5 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(255,255,255,.1)", borderRadius: 10, fontSize: 12, color: "rgba(255,255,255,.7)", lineHeight: 1.5 }}>
                💡 Cualquier persona con el link puede ver y agregar fotos, aunque no tenga cuenta de Google.
              </div>
            </div>
          </div>
        )}

      </div>

      <div style={{ background: AGAVE, color: "rgba(255,255,255,.4)", textAlign: "center", padding: "20px 16px", fontSize: 11.5 }}>
        <strong style={{ color: GOLD }}>Guadalajara 2026</strong> · Casa del Patio, Calle Escorza 417 · 24 Jun – 1 Jul
      </div>
    </div>
  );
}
