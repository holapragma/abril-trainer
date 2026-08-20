/**
 * Íconos de gimnasio que no existen en lucide-react, dibujados con la misma
 * convención (viewBox 24×24, trazo redondeado, sin relleno) para poder
 * mezclarlos con los de la librería sin que se note la costura.
 */

type IconProps = {
  size?: number
  strokeWidth?: number
  className?: string
}

export function JumpRope({ size = 24, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="7.5" r="3" />
      <path d="M5.5 16.5c.5-4 2.5-6.5 4.3-7.6" />
      <path d="M18.5 16.5c-.5-4-2.5-6.5-4.3-7.6" />
      <rect x="4.2" y="16.5" width="2.6" height="5.5" rx="1.3" />
      <rect x="17.2" y="16.5" width="2.6" height="5.5" rx="1.3" />
    </svg>
  )
}

export function Kettlebell({ size = 24, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8.6 9C8.6 5.9 10.1 4 12 4c1.9 0 3.4 1.9 3.4 5" />
      <circle cx="12" cy="15.3" r="6.3" />
    </svg>
  )
}
