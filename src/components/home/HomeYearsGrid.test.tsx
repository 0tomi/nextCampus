import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const adminAccessState = {
  isAdmin: false,
}

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/admin/adminAccess', () => ({
  useAdminAccess: () => adminAccessState.isAdmin,
}))

vi.mock('@/components/admin/HomeAdminOverlay', () => ({
  YearAdminBar: () => <div>Admin año</div>,
  SubjectAdminRow: () => <span>Admin materia</span>,
  AddYearButton: () => <button type="button">Agregar año</button>,
  AddSubjectButton: () => <button type="button">Agregar materia</button>,
}))

vi.mock('@/components/admin/SubjectModal', () => ({
  SubjectModal: () => null,
}))

function makeYears() {
  return [
    {
      id: 'year-1',
      slug: 'primer-anio',
      nombre: 'Primer año',
      subjects: [
        {
          id: 'subject-1',
          slug: 'calculo',
          nombre: 'Cálculo',
          descripcion: 'Números y funciones',
          driveUrl: null,
        },
      ],
    },
    {
      id: 'year-2',
      slug: 'segundo-anio',
      nombre: 'Segundo año',
      subjects: [
        {
          id: 'subject-2',
          slug: 'fisica',
          nombre: 'Física',
          descripcion: 'Ondas y energía',
          driveUrl: null,
        },
      ],
    },
  ]
}

describe('HomeYearsGrid', () => {
  beforeEach(() => {
    adminAccessState.isAdmin = false
  })

  it('mantiene ocultos los años filtrados para usuarios no admin', async () => {
    const { HomeYearsGrid } = await import('./HomeYearsGrid')

    const markup = renderToStaticMarkup(
      <HomeYearsGrid
        initialPrefs={{
          hiddenYears: ['segundo-anio'],
          hiddenSubjects: [],
          hiddenCommissions: [],
        }}
        years={makeYears()}
      />,
    )

    expect(markup).toContain('Primer año')
    expect(markup).not.toContain('Segundo año')
    expect(markup).not.toContain('Mostrar años ocultos')
    expect(markup).not.toContain('Ocultar años ocultos')
  })

  it('muestra el toggle para admins aunque no haya años visibles por preferencias', async () => {
    adminAccessState.isAdmin = true

    const { HomeYearsGrid } = await import('./HomeYearsGrid')

    const markup = renderToStaticMarkup(
      <HomeYearsGrid
        initialPrefs={{
          hiddenYears: ['primer-anio', 'segundo-anio'],
          hiddenSubjects: [],
          hiddenCommissions: [],
        }}
        years={makeYears()}
      />,
    )

    expect(markup).toContain('Mostrar años ocultos')
    expect(markup).toContain('No tenés años o materias visibles')
    expect(markup).not.toContain('Ocultar años ocultos')
  })

  it('incluye años ocultos sin escribir preferencias cuando el admin activa la vista local', async () => {
    const { getHomeYearsForDisplay } = await import('./HomeYearsGrid.utils')

    const result = getHomeYearsForDisplay({
      years: makeYears(),
      prefs: {
        hiddenYears: ['segundo-anio'],
        hiddenSubjects: ['calculo'],
        hiddenCommissions: [],
      },
      isAdmin: true,
      showHiddenYears: true,
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      originalIndex: 0,
      isHiddenByPrefs: false,
      year: {
        slug: 'primer-anio',
        subjects: [],
      },
    })
    expect(result[1]).toMatchObject({
      originalIndex: 1,
      isHiddenByPrefs: true,
      year: {
        slug: 'segundo-anio',
        subjects: [{ slug: 'fisica' }],
      },
    })
  })

  it('muestra las materias de un año revelado aunque estén marcadas como ocultas al ocultar el año', async () => {
    const { getHomeYearsForDisplay } = await import('./HomeYearsGrid.utils')

    // Ocultar un año arrastra todas sus materias a hiddenSubjects, así que un
    // año revelado por el admin debe seguir mostrando su contenido completo.
    const result = getHomeYearsForDisplay({
      years: makeYears(),
      prefs: {
        hiddenYears: ['segundo-anio'],
        hiddenSubjects: ['fisica'],
        hiddenCommissions: [],
      },
      isAdmin: true,
      showHiddenYears: true,
    })

    expect(result[1]).toMatchObject({
      isHiddenByPrefs: true,
      year: {
        slug: 'segundo-anio',
        subjects: [{ slug: 'fisica' }],
      },
    })
  })
})
