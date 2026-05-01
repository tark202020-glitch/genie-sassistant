interface PildongLogoProps {
  className?: string;
  size?: number;
}

export function PildongLogo({ className = '', size = 40 }: PildongLogoProps) {
  const width = size * 2.4;
  const height = size;

  return (
    <svg
      viewBox="0 0 280 100"
      width={width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="필동 로고"
    >
      {/*
        Original logo structure:
        1) Pulse wave: tilde → deep V → sharp peak → small settle
        2) Pen nib: angular diamond pointing right (top peak, bottom valley, right tip)
        3) Slit line + ink dot inside nib
      */}

      {/* Pulse wave */}
      <path
        d="M6 48
           C10 48, 14 46, 18 44
           C22 42, 26 44, 30 48
           C34 52, 36 56, 40 62
           C44 68, 46 74, 50 80
           C54 86, 56 86, 60 80
           C64 74, 66 64, 70 54
           C74 44, 76 32, 80 22
           C84 12, 86 12, 90 20
           C94 28, 96 40, 100 48
           C104 56, 108 56, 114 48
           C118 42, 120 38, 124 34"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Pen nib upper edge: junction → sharp angular peak → straight to tip */}
      <path
        d="M124 34
           Q134 16, 150 8
           L260 48"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Pen nib lower edge: junction → smooth bottom → straight to tip */}
      <path
        d="M124 34
           Q134 68, 152 86
           L260 48"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Nib slit line */}
      <line
        x1="156"
        y1="40"
        x2="236"
        y2="47"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Ink hole dot */}
      <circle cx="244" cy="48" r="5" fill="currentColor" />
    </svg>
  );
}
