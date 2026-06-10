'use client';

import { AlertDialog } from '@/components/ui/AlertDialog';

export function MapaResetDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Reiniciar el progreso del mapa"
      description="Se va a borrar todo el avance que marcaste en el mapa de correlativas. Esta acción no se puede deshacer."
      confirmText="Reiniciar"
      variant="destructive"
    />
  );
}
