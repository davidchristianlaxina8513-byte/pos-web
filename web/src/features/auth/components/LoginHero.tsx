/**
 * Flat cafe-scene illustration for the login hero panel (v2 design
 * language). Pure SVG, decorative only — no data, no interaction.
 */
export function LoginHero() {
  return (
    <svg
      viewBox="0 0 320 170"
      role="img"
      aria-label="Barista at the cafe counter"
      className="h-full w-full"
    >
      {/* shelf with cups */}
      <rect x="28" y="34" width="86" height="8" rx="4" fill="#7a9b7e" />
      <rect x="36" y="22" width="12" height="12" rx="2" fill="#4a6b4f" />
      <rect x="52" y="24" width="10" height="10" rx="2" fill="#2e4a2d" />
      <rect x="66" y="22" width="12" height="12" rx="2" fill="#7a9b7e" />
      {/* LOGIN board */}
      <rect x="196" y="18" width="72" height="30" rx="4" fill="#f4f6f9" />
      <text
        x="232"
        y="37"
        textAnchor="middle"
        fontSize="11"
        letterSpacing="3"
        fill="#9aa5b1"
      >
        LOGIN
      </text>
      {/* plant */}
      <ellipse cx="286" cy="60" rx="10" ry="22" fill="#4a6b4f" />
      <ellipse cx="272" cy="68" rx="9" ry="17" fill="#7a9b7e" />
      <ellipse cx="298" cy="70" rx="8" ry="15" fill="#7a9b7e" />
      <rect x="276" y="88" width="20" height="18" rx="3" fill="#4a6b4f" />
      {/* bottles */}
      <rect x="246" y="78" width="7" height="22" rx="2" fill="#4a6b4f" />
      <rect x="256" y="82" width="6" height="18" rx="2" fill="#7a9b7e" />
      {/* barista */}
      <circle cx="120" cy="66" r="17" fill="#f2c9a8" />
      <path
        d="M103 64c-2-14 6-24 17-24s19 10 17 24c-4-8-9-10-17-10s-13 2-17 10Z"
        fill="#8a4f3d"
      />
      <rect x="100" y="44" width="40" height="10" rx="5" fill="#f4f6f9" />
      <path d="M98 92c0-12 10-18 22-18s22 6 22 18v18H98V92Z" fill="#f4f6f9" />
      <path d="M110 92c0-8 4-13 10-13s10 5 10 13v18h-20V92Z" fill="#4a6b4f" />
      {/* laptop */}
      <rect
        x="168"
        y="76"
        width="44"
        height="30"
        rx="3"
        fill="#2e4a2d"
        transform="skewX(-8)"
      />
      <rect x="162" y="104" width="60" height="6" rx="3" fill="#223825" />
      {/* counter */}
      <rect x="16" y="110" width="288" height="14" rx="7" fill="#4a6b4f" />
      <rect x="16" y="122" width="288" height="34" rx="6" fill="#a9bfa4" />
      <rect x="16" y="122" width="288" height="8" fill="#93ad8a" />
    </svg>
  );
}
