// MobileCalendar — month grid + agenda for selected day
const { useState: useStateCal, useMemo: useMemoCal } = React;
const { career: careerCal, getYearColors: getYearColorsCal, EVENT_TONES: ETcal } = window.CAMPUS_DATA;
const {
  MobileTopbar: MobileTopbarCal, SectionHeader: SectionHeaderCal, AgendaList: AgendaListCal,
  IconChevronR: IconChevronRCal, IconChevronL: IconChevronLCal,
  eyebrow: eyebrowCal,
} = window.CampusMobile;

const MONTH_NAMES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DOW_ES = ['D','L','M','M','J','V','S'];

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function MobileCalendar({ events, accent = '#fbbf24', initialDate, initialSelected = null }) {
  const [cursor, setCursor] = useStateCal(() => {
    if (initialDate) { const d = new Date(initialDate); d.setDate(1); return d; }
    // anchor on first month that has events
    if (events && events.length) { const d = new Date(events[0].fecha); d.setDate(1); return d; }
    const d = new Date(); d.setDate(1); return d;
  });
  // null = no day selected → show all month events; Date = filter to that day
  const [selected, setSelected] = useStateCal(() => initialSelected ? new Date(initialSelected) : null);

  const monthEvents = useMemoCal(() => {
    return (events || []).filter((e) => {
      const d = new Date(e.fecha);
      return d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear();
    });
  }, [events, cursor]);

  // map day-of-month → events
  const dayMap = useMemoCal(() => {
    const m = {};
    monthEvents.forEach((e) => {
      const d = new Date(e.fecha).getDate();
      (m[d] = m[d] || []).push(e);
    });
    return m;
  }, [monthEvents]);

  // grid days (6 rows × 7 cols)
  const firstDow = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const prevMonthDays = new Date(cursor.getFullYear(), cursor.getMonth(), 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push({ d: prevMonthDays - firstDow + i + 1, muted: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ d, muted: false });
  }
  while (cells.length < 42) {
    cells.push({ d: cells.length - daysInMonth - firstDow + 1, muted: true });
  }

  const today = new Date();
  const selectedEvents = selected
    ? (events || []).filter((e) => sameDay(new Date(e.fecha), selected))
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    : [];
  const monthEventsSorted = [...monthEvents].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const goPrev = () => { const d = new Date(cursor); d.setMonth(d.getMonth() - 1); setCursor(d); };
  const goNext = () => { const d = new Date(cursor); d.setMonth(d.getMonth() + 1); setCursor(d); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        padding: '0 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ ...eyebrowCal, fontSize: 10 }}>MES</div>
          <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {MONTH_NAMES_ES[cursor.getMonth()]} <span style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 700 }}>{cursor.getFullYear()}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={goPrev} aria-label="Mes anterior" style={navCircle}>
            <IconChevronLCal size={16} />
          </button>
          <button onClick={goNext} aria-label="Mes siguiente" style={navCircle}>
            <IconChevronRCal size={16} />
          </button>
        </div>
      </div>

      <div style={{
        margin: '0 18px',
        background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12, padding: '12px 10px 14px',
      }}>
        {/* days of week */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 2px 8px' }}>
          {DOW_ES.map((d, i) => (
            <div key={i} style={{
              textAlign: 'center', fontSize: 10, fontWeight: 800, letterSpacing: '0.16em',
              color: i === 0 || i === 6 ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.48)',
              textTransform: 'uppercase',
            }}>{d}</div>
          ))}
        </div>

        {/* day grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {cells.map((cell, i) => {
            const dayDate = new Date(cursor.getFullYear(), cursor.getMonth() + (cell.muted && i < firstDow ? -1 : (cell.muted ? 1 : 0)), cell.d);
            const isToday = !cell.muted && sameDay(dayDate, today);
            const isSelected = !cell.muted && selected && sameDay(dayDate, selected);
            const dayEvents = !cell.muted ? (dayMap[cell.d] || []) : [];
            return (
              <button
                key={i}
                onClick={() => {
                  if (cell.muted) return;
                  // tap same day again → deselect (back to month view)
                  if (isSelected) setSelected(null);
                  else setSelected(dayDate);
                }}
                disabled={cell.muted}
                style={{
                  aspectRatio: '1 / 1',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: 'none', borderRadius: 8, padding: 0,
                  background: isSelected ? accent : 'transparent',
                  color: cell.muted
                    ? 'rgba(255,255,255,0.18)'
                    : isSelected
                      ? '#0a0a0a'
                      : isToday
                        ? accent
                        : 'rgba(255,255,255,0.85)',
                  fontSize: 14, fontWeight: isToday || isSelected ? 900 : 600,
                  cursor: cell.muted ? 'default' : 'pointer',
                  position: 'relative',
                  transition: 'background 180ms',
                }}>
                <span style={{ lineHeight: 1 }}>{cell.d}</span>
                {dayEvents.length > 0 && !isSelected ? (
                  <span style={{
                    marginTop: 4, display: 'flex', gap: 2, height: 4,
                  }}>
                    {dayEvents.slice(0, 3).map((e, j) => {
                      const tone = ETcal[e.tipo] ?? ETcal['Aviso'];
                      return <span key={j} style={{ width: 4, height: 4, borderRadius: 999, background: tone.text }} />;
                    })}
                  </span>
                ) : null}
                {dayEvents.length > 0 && isSelected ? (
                  <span style={{
                    marginTop: 4, display: 'flex', gap: 2, height: 4,
                  }}>
                    {dayEvents.slice(0, 3).map((e, j) => (
                      <span key={j} style={{ width: 4, height: 4, borderRadius: 999, background: 'rgba(0,0,0,0.55)' }} />
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* legend */}
        <div style={{
          marginTop: 12, padding: '10px 4px 0',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', gap: 12, flexWrap: 'wrap',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
        }}>
          {[
            ['Examen', ETcal['Examen']],
            ['Trabajo Práctico', ETcal['Trabajo Práctico']],
            ['Exposición', ETcal['Exposición']],
          ].map(([label, tone]) => (
            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: tone.text }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* events list — all month by default, filtered to selected day when one is selected */}
      <div style={{ padding: '4px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...eyebrowCal, fontSize: 10 }}>
            {selected
              ? selected.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
              : `Todos los eventos · ${MONTH_NAMES_ES[cursor.getMonth()]}`}
          </div>
          {selected ? (
            <button onClick={() => setSelected(null)} style={{
              height: 24, padding: '0 9px', borderRadius: 999, cursor: 'pointer',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.70)', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>
              Ver mes
            </button>
          ) : null}
        </div>
        <div style={{ marginTop: 10 }}>
          {selected ? (
            selectedEvents.length === 0 ? (
              <div style={{
                padding: '16px 14px', background: '#1a1a1a',
                border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 10,
                fontSize: 12.5, color: 'rgba(255,255,255,0.48)',
              }}>
                Sin eventos este día.
              </div>
            ) : (
              <AgendaListCal events={selectedEvents} accent={accent} emptyMessage="" />
            )
          ) : (
            monthEventsSorted.length === 0 ? (
              <div style={{
                padding: '16px 14px', background: '#1a1a1a',
                border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 10,
                fontSize: 12.5, color: 'rgba(255,255,255,0.48)',
              }}>
                Sin eventos este mes.
              </div>
            ) : (
              <AgendaListCal events={monthEventsSorted} accent={accent} emptyMessage="" />
            )
          )}
        </div>
      </div>
    </div>
  );
}

const navCircle = {
  width: 36, height: 36, borderRadius: 999,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.80)', cursor: 'pointer',
};

// ─────────────────────────────────────────────────────────────
// CalendarScreen — full mobile calendar view (todas las materias del año)
// ─────────────────────────────────────────────────────────────
function CalendarScreen({ yearSlug, nav, initialSelectedDate = null }) {
  const year = careerCal.years.find((y) => y.slug === yearSlug) ?? careerCal.years[1];
  const idx = careerCal.years.indexOf(year);
  const c = getYearColorsCal(idx);
  const events = year.subjects.flatMap((s) =>
    (s.eventos ?? []).map((e) => ({ ...e, titulo: `${e.titulo} · ${s.nombre}` }))
  ).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  return (
    <div style={{
      width: '100%', height: '100%', background: '#0f0f0f', color: '#fff',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    }}>
      <MobileTopbarCal onBack={nav.back} title="Calendario" subtitle={year.nombre} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 16, paddingBottom: 50 }}>
        <MobileCalendar
          events={events}
          accent={c.tone}
          initialDate={events[0]?.fecha}
          initialSelected={initialSelectedDate}
        />
      </main>
    </div>
  );
}

window.CampusCalendar = { MobileCalendar, CalendarScreen };
