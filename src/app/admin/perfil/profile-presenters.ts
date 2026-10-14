export function roleLabel(role: string) {
  if (role === 'ADMIN') return 'Admin'
  if (role === 'SUPERVISOR') return 'Supervisor'
  return 'Ayudante'
}

export function buildAssignedYearsSummary(yearNames: string[], canManageAllYears: boolean) {
  if (canManageAllYears) return 'Acceso a todos los años'
  if (yearNames.length === 0) return 'Sin años asignados'
  if (yearNames.length === 1) return `1 año asignado: ${yearNames[0]}`
  if (yearNames.length === 2) return `2 años asignados: ${yearNames[0]} y ${yearNames[1]}`

  return `${yearNames.length} años asignados: ${yearNames[0]}, ${yearNames[1]} y ${yearNames.length - 2} más`
}

