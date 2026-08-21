import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement> & {
  size?: number | string
  color?: string
  strokeWidth?: number | string
}

/** Ícone de check-in do Clube Florescer (clipboard + check). */
export default function CheckinIcon({
  size = 24,
  className,
  color = 'currentColor',
  strokeWidth: _strokeWidth,
  ...props
}: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 519 453"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <path
        d="M456.942 242.502C456.942 242.502 428.942 131.002 418.442 69.0043C417.606 64.0719 417.942 18.5017 376.442 18.5017C312.822 18.5017 193.442 17.1698 157.442 16.5032C141.275 16.8365 114.842 22.2032 110.442 51.0032C106.042 79.8032 68.1083 230.668 52.9417 302.502M52.9417 302.502C41.275 303.168 17.8856 306.003 16.9417 331.002C16.1412 352.202 16.6083 392.168 16.9417 409.502C17.4513 436.002 32.8416 436.002 64.4416 436.002H456.442C473.442 434.835 501.942 436.002 501.942 401.002C501.942 375.789 501.608 343.835 501.942 331.002C500.942 321.502 496.842 306.003 470.442 306.003H345.442C343.442 306.003 345.942 337.503 343.942 337.503C327.442 337.503 182.442 339.003 182.442 337.503C182.442 322.273 183.689 302.502 182.442 302.502H52.9417ZM200.442 157.502C200.442 157.502 246.342 211.002 249.942 207.502C267.942 190.002 340.942 115.002 340.942 115.002"
        stroke={color}
        strokeWidth={33}
        strokeLinecap="round"
      />
    </svg>
  )
}
