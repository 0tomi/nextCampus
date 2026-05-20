// CampusApp — wraps the screens with nav state and drawer.
// initialScreen: 'home' | 'year' | 'materia'
// initialSlug:   year slug or subject slug
// initialDrawer: bool
const { useState: useStateApp } = React;
const { HomeScreen, YearScreen, MateriaScreen } = window.CampusScreens;
const { CalendarScreen } = window.CampusCalendar;
const { MobileDrawer } = window.CampusMobile;

function CampusApp({ initialScreen = 'home', initialSlug = '', initialDrawer = false, initialTab = 'calendario', initialSelectedDate = null }) {
  const [stack, setStack] = useStateApp(() => {
    if (initialScreen === 'home') return [{ kind: 'home' }];
    if (initialScreen === 'year') return [{ kind: 'home' }, { kind: 'year', slug: initialSlug }];
    if (initialScreen === 'calendar') return [{ kind: 'home' }, { kind: 'year', slug: initialSlug }, { kind: 'calendar', slug: initialSlug }];
    if (initialScreen === 'materia') {
      // find the year for this subject so back goes to that year
      const data = window.CAMPUS_DATA.career;
      let yearSlug = null;
      for (const y of data.years) {
        if (y.subjects.some((s) => s.slug === initialSlug)) { yearSlug = y.slug; break; }
      }
      return [{ kind: 'home' }, ...(yearSlug ? [{ kind: 'year', slug: yearSlug }] : []), { kind: 'materia', slug: initialSlug }];
    }
    return [{ kind: 'home' }];
  });
  const [drawer, setDrawer] = useStateApp(initialDrawer);

  const current = stack[stack.length - 1];

  const nav = {
    openDrawer: () => setDrawer(true),
    closeDrawer: () => setDrawer(false),
    toHome: () => { setStack([{ kind: 'home' }]); setDrawer(false); },
    toYear: (slug) => {
      setStack((s) => {
        // if already in stack, jump back to it; else push
        const i = s.findIndex((f) => f.kind === 'year' && f.slug === slug);
        if (i >= 0) return s.slice(0, i + 1);
        // if last frame is also a year, replace it
        const last = s[s.length - 1];
        if (last && last.kind === 'year') return [...s.slice(0, -1), { kind: 'year', slug }];
        return [...s, { kind: 'year', slug }];
      });
      setDrawer(false);
    },
    toSubject: (slug) => {
      setStack((s) => [...s, { kind: 'materia', slug }]);
      setDrawer(false);
    },
    back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    toCalendar: (slug) => {
      setStack((s) => [...s, { kind: 'calendar', slug }]);
      setDrawer(false);
    },
  };

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: '#0f0f0f', overflow: 'hidden',
    }}>
      {current.kind === 'home'    ? <HomeScreen    nav={nav} /> : null}
      {current.kind === 'year'    ? <YearScreen    slug={current.slug} nav={nav} /> : null}
      {current.kind === 'calendar' ? <CalendarScreen yearSlug={current.slug} nav={nav} initialSelectedDate={initialSelectedDate} /> : null}
      {current.kind === 'materia' ? <MateriaScreen slug={current.slug} nav={nav} initialTab={initialTab} /> : null}

      <MobileDrawer
        open={drawer}
        onClose={nav.closeDrawer}
        current={current}
        onNavigateYear={nav.toYear}
        onNavigateHome={nav.toHome}
      />
    </div>
  );
}

window.CampusApp = CampusApp;
