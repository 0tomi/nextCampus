import Image from 'next/image'

export function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/resources/google_drive_logo_icon_159334.png"
      alt="Google Drive"
      width={20}
      height={20}
      className={className}
    />
  )
}
