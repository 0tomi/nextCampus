// Screens: Home, Year, Materia
const { useState: useState_S } = React;
const { career: careerS, getYearColors: getYearColorsS } = window.CAMPUS_DATA;
const {
  MobileTopbar, YearCarousel, AgendaList, SectionHeader,
  IconChevronR, IconArrowR, IconCalendar, IconSparkles, IconBook,
  IconDownload, IconExternal, IconLayers, IconDot,
  eyebrow: eyebrowS,
} = window.CampusMobile;

// ─────────────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────────────
function HomeScreen({ nav }) {
  return (
    <div style={screen}>
      <MobileTopbar onMenu={nav.openDrawer} title="NextCampus" subtitle="FCYT · UADER" />
      <main style={{ ...mainCol, paddingTop: 22, paddingBottom: 60 }}>
        {/* Hero */}
        <section style={{ padding: '0 18px' }}>
          <div style={{ ...eyebrowS, fontSize: 10 }}>CARRERA</div>
          <h1 style={{ margin: '10px 0 0', fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.1, textWrap: 'pretty' }}>
            {careerS.nombre}
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: 13.5, color: 'rgba(255,255,255,0.52)', fontWeight: 500, lineHeight: 1.55, textWrap: 'pretty' }}>
            {careerS.descripcion}
          </p>
        </section>

        {/* Stats inline */}
        <section style={{ padding: '0 18px' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Stat label="Años" value={careerS.years.length} />
            <Stat label="Materias" value={careerS.years.reduce((a, y) => a + y.subjects.length, 0)} />
            <Stat label="Próximos" value="4" hint="eventos" />
          </div>
        </section>

        {/* Carrusel de años */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SectionHeader
            eyebrow="MATERIAS POR AÑO"
            title="Tu carrera, año por año"
            action={
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.42)',
                textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                Deslizá <IconChevronR size={12} stroke="rgba(255,255,255,0.42)" />
              </span>
            }
          />
          <YearCarousel onOpenYear={nav.toYear} onOpenSubject={nav.toSubject} />
        </section>

        {/* Próximos eventos (cross-año teaser) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionHeader eyebrow="ESTA SEMANA" title="Próximos eventos" />
          <div style={{ padding: '0 18px' }}>
            <AgendaList events={pickUpcoming(6)} accent="#fbbf24" emptyMessage="Nada en agenda." />
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div style={{
      flex: 1, padding: '12px 14px',
      background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10,
    }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
      {hint ? <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.40)', fontWeight: 600 }}>{hint}</div> : null}
    </div>
  );
}

function pickUpcoming(n) {
  const all = [];
  careerS.years.forEach((y) => y.subjects.forEach((s) => {
    (s.eventos || []).forEach((e) => all.push({ ...e, titulo: `${e.titulo} · ${s.nombre}` }));
  }));
  return all.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).slice(0, n);
}

// ─────────────────────────────────────────────────────────────
// YEAR SCREEN
// ─────────────────────────────────────────────────────────────
function YearScreen({ slug, nav }) {
  const year = careerS.years.find((y) => y.slug === slug) ?? careerS.years[0];
  const idx = careerS.years.indexOf(year);
  const c = getYearColorsS(idx);
  const events = year.subjects.flatMap((s) =>
    (s.eventos ?? []).map((e) => ({ ...e, titulo: `${e.titulo} · ${s.nombre}` }))
  ).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  return (
    <div style={screen}>
      <MobileTopbar onBack={nav.back} title={year.nombre} subtitle={careerS.nombre} />
      <main style={{ ...mainCol, paddingTop: 18, paddingBottom: 60 }}>
        {/* Hero año */}
        <section style={{ padding: '0 18px' }}>
          <div style={{
            position: 'relative', overflow: 'hidden',
            borderRadius: 12, padding: '20px 18px 18px',
            background: c.gradient,
          }}>
            <div style={{
              position: 'absolute', right: -40, top: -40, width: 160, height: 160,
              borderRadius: '50%', background: 'rgba(255,255,255,0.12)', filter: 'blur(20px)',
            }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase' }}>
                AÑO {idx + 1} · {year.subjects.length} MATERIAS
              </div>
              <div style={{ marginTop: 6, fontSize: 26, fontWeight: 900, color: c.name === 'violet' || c.name === 'rose' ? '#fff' : '#0a0a0a', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                {year.nombre}
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <span style={pillDark}>
                  <IconCalendar size={11} stroke="#fff" sw={2.2} />
                  {events.length} eventos
                </span>
                <span style={pillDark}>
                  <IconLayers size={11} stroke="#fff" sw={2.2} />
                  {year.subjects.length} materias
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Switcher entre años */}
        <YearSwitcher currentIdx={idx} onChange={(s) => nav.toYear(s)} />

        {/* Agenda — 3 próximos */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionHeader
            eyebrow="PRÓXIMOS EVENTOS"
            title="Lo que se viene"
          />
          <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AgendaList
              events={events.slice(0, 3)}
              accent={c.tone}
              emptyMessage="Todavía no hay eventos visibles a nivel año. Entrá a una materia para ver su agenda real."
            />
            <button
              onClick={() => nav.toCalendar?.(year.slug)}
              style={{
                marginTop: 4, padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                background: 'transparent', border: `1px solid ${c.tone}`,
                color: '#fff', fontSize: 13, fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: c.gradient,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: c.name === 'violet' || c.name === 'rose' ? '#fff' : '#0a0a0a',
                }}>
                  <IconCalendar size={14} sw={2.2} />
                </span>
                Ver calendario completo
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', color: c.tone, textTransform: 'uppercase' }}>
                {events.length} eventos
                <IconChevronR size={13} stroke={c.tone} />
              </span>
            </button>
          </div>
        </section>

        {/* Materias */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionHeader
            eyebrow="MATERIAS"
            title="Accesos directos del año"
          />
          <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {year.subjects.map((s, sIdx) => (
              <SubjectRow key={s.slug} subject={s} idx={sIdx} colors={c} onClick={() => nav.toSubject(s.slug)} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function YearSwitcher({ currentIdx, onChange }) {
  return (
    <div style={{
      padding: '0 18px', display: 'flex', gap: 8, overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      {careerS.years.map((y, i) => {
        const c = getYearColorsS(i);
        const active = i === currentIdx;
        return (
          <button
            key={y.id}
            onClick={() => onChange(y.slug)}
            style={{
              flexShrink: 0, height: 30, padding: '0 12px', borderRadius: 999,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: active ? `1px solid ${c.tone}` : '1px solid rgba(255,255,255,0.10)',
              background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.6)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: c.gradient }} />
            Año {i + 1}
          </button>
        );
      })}
    </div>
  );
}

function SubjectRow({ subject, idx, colors, onClick }) {
  const evCount = subject.eventos?.length ?? 0;
  const apCount = subject.apuntes?.length ?? 0;
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 10, padding: '14px 14px',
        display: 'flex', alignItems: 'center', gap: 14,
        color: '#fff',
      }}>
      <span style={{
        width: 40, height: 40, minWidth: 40, borderRadius: 8,
        background: colors.gradient,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 900, color: colors.name === 'violet' || colors.name === 'rose' ? '#fff' : '#0a0a0a',
        letterSpacing: '0.05em',
      }}>
        {String(idx + 1).padStart(2, '0')}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase' }}>
          Materia {String(idx + 1).padStart(2, '0')}
        </span>
        <span style={{ display: 'block', marginTop: 4, fontSize: 14.5, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.25, textWrap: 'pretty' }}>
          {subject.nombre}
        </span>
        <span style={{ display: 'flex', marginTop: 6, gap: 10, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconCalendar size={11} stroke="rgba(255,255,255,0.45)" sw={2} />{evCount} eventos</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconBook size={11} stroke="rgba(255,255,255,0.45)" sw={2} />{apCount} apuntes</span>
        </span>
      </span>
      <IconChevronR size={16} stroke="rgba(255,255,255,0.40)" />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// MATERIA SCREEN
// ─────────────────────────────────────────────────────────────
function MateriaScreen({ slug, nav, initialTab = 'calendario' }) {
  const found = findSubject(slug);
  const subject = found?.subject ?? careerS.years[1].subjects[1];
  const year = found?.year ?? careerS.years[1];
  const idx = careerS.years.indexOf(year);
  const c = getYearColorsS(idx);
  const eventos = subject.eventos ?? [];
  const apuntes = subject.apuntes ?? [];
  const [tab, setTab] = useState_S(initialTab);

  return (
    <div style={screen}>
      <MobileTopbar onBack={nav.back} title={subject.nombre} subtitle={year.nombre} />
      <main style={{ ...mainCol, paddingTop: 18, paddingBottom: 60 }}>
        {/* Hero card */}
        <section style={{ padding: '0 18px' }}>
          <div style={{
            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 12, padding: '18px 18px 20px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', right: -60, top: -60, width: 180, height: 180,
              borderRadius: '50%', background: c.tone, opacity: 0.08, filter: 'blur(40px)',
            }} />
            <div style={{
              display: 'inline-flex', padding: '4px 10px', borderRadius: 4,
              background: c.chip, border: `1px solid ${c.chipBorder}`, color: c.chipText,
              fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>
              {year.nombre}
            </div>
            <h1 style={{ margin: '12px 0 0', fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.1, textWrap: 'pretty' }}>
              {subject.nombre}
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, fontWeight: 500 }}>
              Agenda, quiz y apuntes en un solo lugar.
            </p>

            <button style={{
              marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: 4,
                background: 'linear-gradient(135deg, #4285f4 0%, #34a853 50%, #fbbc04 100%)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 900,
              }}>D</span>
              Drive de la materia
              <IconExternal size={13} stroke="rgba(255,255,255,0.50)" />
            </button>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex' }}>
              <SummaryStat label="Eventos" value={eventos.length} />
              <div style={{ width: 1, background: 'rgba(255,255,255,0.05)' }} />
              <SummaryStat label="Apuntes" value={apuntes.length} />
              <div style={{ width: 1, background: 'rgba(255,255,255,0.05)' }} />
              <SummaryStat label="Quizzes" value={3} />
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section style={{ padding: '0 18px' }}>
          <div role="tablist" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
            padding: 4, borderRadius: 10, background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.05)',
          }}>
            {[
              { id: 'calendario', label: 'Agenda',  icon: IconCalendar },
              { id: 'quiz',       label: 'Quiz',    icon: IconSparkles },
              { id: 'apuntes',    label: 'Apuntes', icon: IconBook },
            ].map((t) => {
              const active = tab === t.id;
              const Icn = t.icon;
              return (
                <button key={t.id} role="tab" aria-selected={active}
                  onClick={() => setTab(t.id)}
                  style={{
                    height: 36, border: 'none', borderRadius: 8, cursor: 'pointer',
                    background: active ? '#1f1f1f' : 'transparent',
                    boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.06)' : 'none',
                    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                    fontSize: 12, fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  <Icn size={13} sw={2.2} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Tab body */}
        {tab === 'calendario' ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <window.CampusCalendar.MobileCalendar events={eventos} accent={c.tone} initialDate={eventos[0]?.fecha} />
          </section>
        ) : null}

        {tab === 'quiz' ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SectionHeader eyebrow="MODO ESTUDIO" title="Poné a prueba lo que sabés" />
            <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <QuizBankCard title="Unidad 1 — Modelo Relacional" count={24} colors={c} />
              <QuizBankCard title="Unidad 2 — Normalización" count={18} colors={c} />
              <QuizBankCard title="Unidad 3 — SQL avanzado" count={32} colors={c} />
              <button style={{
                marginTop: 4, padding: '14px', borderRadius: 8,
                background: c.gradient, border: 'none', cursor: 'pointer',
                color: c.name === 'violet' || c.name === 'rose' ? '#fff' : '#0a0a0a',
                fontSize: 14, fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                Empezar quiz
                <IconArrowR size={15} sw={2.6} />
              </button>
            </div>
          </section>
        ) : null}

        {tab === 'apuntes' ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SectionHeader eyebrow="RECURSOS" title="Apuntes y descargas" />
            <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {apuntes.length === 0 ? (
                <div style={{
                  padding: 20, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 10, fontSize: 13, color: 'rgba(255,255,255,0.55)',
                }}>
                  Esta materia no tiene apuntes cargados todavía.
                </div>
              ) : (
                apuntes.map((a) => <ApunteCard key={a.id} apunte={a} colors={c} />)
              )}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function SummaryStat({ label, value }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 4, fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

function QuizBankCard({ title, count, colors }) {
  return (
    <div style={{
      padding: '12px 14px', background: '#1a1a1a',
      border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{
        width: 36, height: 36, borderRadius: 8, background: colors.gradient,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: colors.name === 'violet' || colors.name === 'rose' ? '#fff' : '#0a0a0a',
      }}>
        <IconSparkles size={16} sw={2.2} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', textWrap: 'pretty', lineHeight: 1.3 }}>{title}</div>
        <div style={{ marginTop: 3, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.42)' }}>{count} preguntas</div>
      </div>
      <input type="checkbox" defaultChecked={count > 20} style={{ accentColor: colors.tone, width: 18, height: 18 }} />
    </div>
  );
}

function ApunteCard({ apunte, colors }) {
  return (
    <div style={{
      padding: '14px 14px', background: '#1a1a1a',
      border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...eyebrowS, fontSize: 9 }}>APUNTE</div>
          <div style={{ marginTop: 5, fontSize: 14.5, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.25, textWrap: 'pretty' }}>
            {apunte.titulo}
          </div>
        </div>
        {apunte.hasPdf ? (
          <button style={{
            padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
            background: colors.chip, border: `1px solid ${colors.chipBorder}`, color: colors.chipText,
            fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <IconDownload size={11} sw={2.2} /> PDF
          </button>
        ) : (
          <button style={{
            padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)',
            fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <IconExternal size={11} sw={2.2} /> Link
          </button>
        )}
      </div>
      {apunte.descripcion ? (
        <div style={{ marginTop: 10, fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
          {apunte.descripcion}
        </div>
      ) : null}
    </div>
  );
}

function findSubject(slug) {
  for (const year of careerS.years) {
    const subject = year.subjects.find((s) => s.slug === slug);
    if (subject) return { subject, year };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Shared styles
// ─────────────────────────────────────────────────────────────
const screen = {
  width: '100%', height: '100%', background: '#0f0f0f', color: '#fff',
  display: 'flex', flexDirection: 'column',
  fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
};
const mainCol = {
  flex: 1, display: 'flex', flexDirection: 'column', gap: 26,
  paddingBottom: 24,
};
const pillDark = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '4px 9px', borderRadius: 4,
  background: 'rgba(0,0,0,0.22)',
  fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: '#fff',
  textTransform: 'uppercase',
};
const linkBtn = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
};

window.CampusScreens = { HomeScreen, YearScreen, MateriaScreen };
