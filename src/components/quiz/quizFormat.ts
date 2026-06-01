export function formatQuizTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return `${m}:${s.toString().padStart(2, '0')}`
}

export function allowOnlyPositiveIntegerKeys(event: React.KeyboardEvent<HTMLInputElement>) {
  if (
    ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return
  }

  if (!/^[0-9]$/.test(event.key)) {
    event.preventDefault()
  }
}
