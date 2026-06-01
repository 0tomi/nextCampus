'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { YearModal } from '@/components/admin/YearModal'
import { SubjectModal } from '@/components/admin/SubjectModal'
import {
  ConfirmDeleteYearModal,
  ConfirmDeleteSubjectModal,
} from '@/components/admin/ConfirmDeleteModal'

interface SubjectData {
  id: string
  slug: string
  nombre: string
  descripcion?: string | null
  driveUrl?: string | null
}

interface YearData {
  id: string
  slug: string
  nombre: string
  descripcion?: string | null
  driveUrl?: string | null
  playlistUrl?: string | null
  playlistEnabled?: boolean
  orden: number
  subjects: SubjectData[]
}

// ---------------------------------------------------------------------------
// Botón flotante "+ Año"
// ---------------------------------------------------------------------------
function AddYearButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-surface-1 px-3 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        Nuevo año
      </button>

      <YearModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Controles de edición/eliminación de un año
// ---------------------------------------------------------------------------
function YearAdminBar({ year }: { year: YearData }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-white/6">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          title="Editar año"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-white/50 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
        >
          <Pencil className="h-3 w-3" />
          Editar
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          title="Eliminar año"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-rose-400/70 transition-colors hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
        >
          <Trash2 className="h-3 w-3" />
          Eliminar
        </button>
      </div>

      <YearModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        year={{
          id: year.id,
          nombre: year.nombre,
          descripcion: year.descripcion,
          driveUrl: year.driveUrl,
          playlistUrl: year.playlistUrl,
          playlistEnabled: year.playlistEnabled,
          orden: year.orden,
        }}
      />

      <ConfirmDeleteYearModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        year={{ id: year.id, nombre: year.nombre }}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Controles de edición/eliminación de una materia + botón "+ Materia"
// ---------------------------------------------------------------------------
function SubjectAdminRow({
  subject,
  yearId,
}: {
  subject: SubjectData
  yearId: string
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-end gap-0.5 lg:opacity-0 transition-opacity lg:group-hover:opacity-100 opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            setEditOpen(true)
          }}
          title="Editar materia"
          className="inline-flex h-6 w-6 items-center justify-center rounded text-white/40 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            setDeleteOpen(true)
          }}
          title="Eliminar materia"
          className="inline-flex h-6 w-6 items-center justify-center rounded text-rose-400/60 transition-colors hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <SubjectModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        subject={{
          id: subject.id,
          nombre: subject.nombre,
          descripcion: subject.descripcion ?? undefined,
          driveUrl: subject.driveUrl,
        }}
        yearId={yearId}
      />

      <ConfirmDeleteSubjectModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        subject={{ id: subject.id, nombre: subject.nombre }}
      />
    </>
  )
}

function AddSubjectButton({ yearId }: { yearId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 px-5 py-3 text-xs text-white/30 transition-colors hover:bg-white/5 hover:text-white/60 border-t border-white/5 cursor-pointer"
      >
        <Plus className="h-3 w-3" />
        Agregar materia
      </button>

      <SubjectModal
        open={open}
        onClose={() => setOpen(false)}
        yearId={yearId}
      />
    </>
  )
}

export { AddYearButton, YearAdminBar, SubjectAdminRow, AddSubjectButton }
