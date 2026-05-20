// Mobile redesign de nextCampus — componentes y screens
// Carga después de React + data.js
const { useState, useRef, useEffect, useCallback } = React;

const { career, getYearColors, EVENT_TONES } = window.CAMPUS_DATA;

// ─────────────────────────────────────────────────────────────
// Icons (lucide-equivalentes, inline SVG)
// ─────────────────────────────────────────────────────────────
const Icon = ({ d, size = 18, stroke = 'currentColor', sw = 1.75, fill = 'none', children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    {children ?? <path d={d} />}
  </svg>
);
const IconMenu     = (p) => <Icon {...p}><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="13" x2="20" y2="13"/><line x1="4" y1="19" x2="14" y2="19"/></Icon>;
const IconChevronR = (p) => <Icon {...p} d="M9 6l6 6-6 6"/>;
const IconChevronL = (p) => <Icon {...p} d="M15 6l-6 6 6 6"/>;
const IconArrowR   = (p) => <Icon {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Icon>;
const IconArrowL   = (p) => <Icon {...p}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></Icon>;
const IconShield   = (p) => <Icon {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>;
const IconClose    = (p) => <Icon {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>;
const IconCalendar = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></Icon>;
const IconSparkles = (p) => <Icon {...p}><path d="M12 3l1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5L12 3z"/><path d="M19 14l.9 2.2L22 17l-2.1.8L19 20l-.9-2.2L16 17l2.1-.8L19 14z"/></Icon>;
const IconBook     = (p) => <Icon {...p}><path d="M4 4h12a3 3 0 013 3v13H7a3 3 0 01-3-3V4z"/><line x1="4" y1="17" x2="19" y2="17"/></Icon>;
const IconDownload = (p) => <Icon {...p}><path d="M12 3v12"/><polyline points="6 11 12 17 18 11"/><line x1="4" y1="21" x2="20" y2="21"/></Icon>;
const IconExternal = (p) => <Icon {...p}><path d="M14 4h6v6"/><line x1="20" y1="4" x2="10" y2="14"/><path d="M19 14v6H4V5h6"/></Icon>;
const IconLayers   = (p) => <Icon {...p}><polygon points="12 3 2 8 12 13 22 8 12 3"/><polyline points="2 16 12 21 22 16"/></Icon>;
const IconCap      = (p) => <Icon {...p}><path d="M2 9l10-5 10 5-10 5-10-5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/></Icon>;
const IconDot      = (p) => <Icon {...p} sw={0}><circle cx="12" cy="12" r="3" fill="currentColor"/></Icon>;

// ─────────────────────────────────────────────────────────────
// TOPBAR (sticky)
// ─────────────────────────────────────────────────────────────
function MobileTopbar({ onMenu, title, subtitle, onBack }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30,
      height: 56, padding: '0 8px 0 4px',
      display: 'flex', alignItems: 'center', gap: 4,
      background: 'rgba(20,20,20,0.92)', backdropFilter: 'saturate(180%) blur(14px)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      {onBack ? (
        <button onClick={onBack} aria-label="Volver" style={iconBtn}>
          <IconChevronL size={22} />
        </button>
      ) : (
        <button onClick={onMenu} aria-label="Menú" style={iconBtn}>
          <IconMenu size={22} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 6,
          background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#000', flexShrink: 0,
        }}>
          <IconCap size={16} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{title ?? 'NextCampus'}</div>
          {subtitle ? (
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.18em',
              color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{subtitle}</div>
          ) : null}
        </div>
      </div>
      <button style={{ ...iconBtn, width: 38 }} aria-label="Admin">
        <IconShield size={17} />
      </button>
    </div>
  );
}

const iconBtn = {
  width: 40, height: 40, borderRadius: 10, border: 'none',
  background: 'transparent', color: 'rgba(255,255,255,0.85)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', padding: 0,
};

// ─────────────────────────────────────────────────────────────
// DRAWER (sidebar móvil)
// ─────────────────────────────────────────────────────────────
function MobileDrawer({ open, onClose, current, onNavigateYear, onNavigateHome }) {
  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.6)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 240ms cubic-bezier(0.16,1,0.3,1)',
        }}
      />
      {/* panel */}
      <aside style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 41,
        width: 304, background: '#141414',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        transform: `translateX(${open ? 0 : -100}%)`,
        transition: 'transform 320ms cubic-bezier(0.16,1,0.3,1)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '24px 0 60px rgba(0,0,0,0.5)',
      }}>
        {/* header */}
        <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div onClick={onNavigateHome} style={{ cursor: 'pointer' }}>
              <div style={eyebrow}>CARRERA</div>
              <div style={{ marginTop: 8, fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                {career.nombre}
              </div>
            </div>
            <button onClick={onClose} aria-label="Cerrar menú" style={{ ...iconBtn, width: 32, height: 32 }}>
              <IconClose size={18} />
            </button>
          </div>
        </div>
        {/* body */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px 24px' }}>
          <div style={{ padding: '0 12px 12px', ...eyebrow, fontSize: 10 }}>
            AÑOS ACADÉMICOS
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {career.years.map((y, idx) => {
              const c = getYearColors(idx);
              const active = current?.kind === 'year' && current?.slug === y.slug;
              return (
                <li key={y.id}>
                  <button
                    onClick={() => onNavigateYear(y.slug)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 8, border: 'none',
                      background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                      color: '#fff', cursor: 'pointer', textAlign: 'left',
                    }}>
                    <span style={{
                      width: 34, height: 34, minWidth: 34, borderRadius: 6,
                      background: c.gradient,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 900, color: c.name === 'violet' || c.name === 'rose' ? '#fff' : '#000',
                    }}>{idx + 1}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#fff' }}>{y.nombre}</span>
                      <span style={{ display: 'block', marginTop: 2, fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase' }}>{y.subjects.length} materias</span>
                    </span>
                    <IconChevronR size={15} stroke="rgba(255,255,255,0.30)" />
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        {/* footer */}
        <div style={{ padding: '14px 20px 18px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
          <span>FCYT · UADER</span>
          <span>v alpha</span>
        </div>
      </aside>
    </>
  );
}

const eyebrow = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.22em',
  color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase',
};

// ─────────────────────────────────────────────────────────────
// YEAR CAROUSEL — pieza central del rediseño mobile
// ─────────────────────────────────────────────────────────────
function YearCarousel({ onOpenYear, onOpenSubject }) {
  const scrollerRef = useRef(null);
  const [page, setPage] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setPage(idx);
  }, []);

  const scrollTo = (idx) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Pill row de años */}
      <div style={{
        display: 'flex', gap: 8, padding: '0 18px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {career.years.map((y, idx) => {
          const c = getYearColors(idx);
          const active = page === idx;
          return (
            <button
              key={y.id}
              onClick={() => scrollTo(idx)}
              style={{
                flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 999,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                border: active ? `1px solid ${c.tone}` : '1px solid rgba(255,255,255,0.08)',
                background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                transition: 'all 200ms',
              }}>
              <span style={{
                width: 8, height: 8, borderRadius: 2,
                background: c.gradient,
              }} />
              Año {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Carousel */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        style={{
          display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
          padding: '4px 0 4px',
        }}>
        {career.years.map((y, idx) => (
          <YearCarouselCard key={y.id} year={y} index={idx} onOpenYear={onOpenYear} onOpenSubject={onOpenSubject} />
        ))}
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '4px 0 8px' }}>
        {career.years.map((y, idx) => {
          const c = getYearColors(idx);
          const active = page === idx;
          return (
            <button
              key={y.id}
              aria-label={`Ir al año ${idx + 1}`}
              onClick={() => scrollTo(idx)}
              style={{
                width: active ? 22 : 6, height: 6, borderRadius: 999,
                background: active ? c.tone : 'rgba(255,255,255,0.18)',
                border: 'none', padding: 0, cursor: 'pointer',
                transition: 'width 280ms cubic-bezier(0.16,1,0.3,1), background 200ms',
              }} />
          );
        })}
      </div>
    </div>
  );
}

function YearCarouselCard({ year, index, onOpenYear, onOpenSubject }) {
  const c = getYearColors(index);
  return (
    <div style={{
      flex: '0 0 100%', minWidth: '100%',
      scrollSnapAlign: 'center', padding: '0 18px',
    }}>
      <div style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* gradient header */}
        <button
          onClick={() => onOpenYear(year.slug)}
          style={{
            width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
            background: c.gradient,
            padding: '18px 18px 16px',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase' }}>
              Año {index + 1} · {year.subjects.length} materias
            </div>
            <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: c.name === 'violet' || c.name === 'rose' ? '#fff' : '#0a0a0a', letterSpacing: '-0.02em' }}>
              {year.nombre}
            </div>
          </div>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: c.name === 'violet' || c.name === 'rose' ? '#fff' : '#0a0a0a',
          }}>
            <IconArrowR size={18} sw={2.4} />
          </div>
        </button>

        {/* subjects list */}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {year.subjects.map((s, sIdx) => (
            <li key={s.slug} style={{
              borderTop: sIdx === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
            }}>
              <button
                onClick={() => onOpenSubject(s.slug)}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  background: 'transparent', color: '#fff',
                  padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                <IconLayers size={14} stroke="rgba(255,255,255,0.22)" />
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.78)', textWrap: 'pretty', lineHeight: 1.35 }}>
                  {s.nombre}
                </span>
                <IconChevronR size={14} stroke="rgba(255,255,255,0.32)" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EVENT LIST (agenda compacta, replacement para FullCalendar)
// ─────────────────────────────────────────────────────────────
function formatES(date) {
  const d = new Date(date);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''),
    weekday: d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', ''),
    time: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
  };
}

function AgendaList({ events, emptyMessage, accent }) {
  if (!events || events.length === 0) {
    return (
      <div style={{
        padding: '20px 18px', background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8,
        fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5,
      }}>
        {emptyMessage}
      </div>
    );
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {events.map((e) => {
        const f = formatES(e.fecha);
        const tone = EVENT_TONES[e.tipo] ?? EVENT_TONES['Aviso'];
        return (
          <li key={e.id} style={{
            display: 'flex', gap: 14, alignItems: 'stretch',
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 10, padding: '12px 14px',
          }}>
            <div style={{
              width: 48, minWidth: 48, padding: '6px 0',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', color: accent || 'rgba(255,255,255,0.50)', textTransform: 'uppercase' }}>
                {f.weekday}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {f.day}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase', marginTop: 2 }}>
                {f.month}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
              <div style={{
                display: 'inline-flex', alignSelf: 'flex-start',
                padding: '3px 8px', borderRadius: 4,
                background: tone.bg, border: `1px solid ${tone.border}`, color: tone.text,
                fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>
                {e.tipo}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.35, textWrap: 'pretty' }}>
                {e.titulo}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                {f.time} hs
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────
// Section helper
// ─────────────────────────────────────────────────────────────
function SectionHeader({ eyebrow: eb, title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '0 18px' }}>
      <div style={{ minWidth: 0 }}>
        {eb ? <div style={{ ...eyebrow, fontSize: 10 }}>{eb}</div> : null}
        <h2 style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', textWrap: 'pretty', lineHeight: 1.15 }}>
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

window.CampusMobile = {
  MobileTopbar, MobileDrawer, YearCarousel, AgendaList, SectionHeader,
  IconChevronR, IconChevronL, IconArrowR, IconArrowL, IconCalendar, IconSparkles, IconBook, IconDownload, IconExternal, IconLayers, IconCap, IconClose, IconMenu, IconShield, IconDot,
  eyebrow, iconBtn,
};
