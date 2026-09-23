interface IconProps {
  name: keyof typeof PATHS;
  className?: string;
}

const PATHS = {
  swap: (
    <>
      <path d="M4 4v6h6M20 20v-6h-6" />
      <path d="M20 8a8 8 0 0 0-14.93-3M4 16a8 8 0 0 0 14.93 3" />
    </>
  ),
  chevron: <path d="M6 9l6 6 6-6" />,
  check: <path d="M20 6 9 17l-5-5" />,
  clock: (
    <>
      <path d="M12 6v6l4 2" />
      <circle cx="12" cy="12" r="10" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  external: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5M12 15V3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </>
  ),
  bold: (
    <>
      <path d="M6 4h8a4 4 0 0 1 0 8H6z" />
      <path d="M6 12h9a4 4 0 0 1 0 8H6z" />
    </>
  ),
  italic: (
    <>
      <path d="M19 4h-9M5 20h9M14.5 4 9.5 20" />
    </>
  ),
  strike: (
    <>
      <path d="M5 12h14" />
      <path d="M7.5 6.5C7.5 5 9.5 4 12 4c2.7 0 4.5 1.2 4.5 3" />
      <path d="M7 17.5c0 1.5 2 2.5 5 2.5s5-1.2 5-3" />
    </>
  ),
  code: (
    <>
      <path d="m9 8-4 4 4 4" />
      <path d="m15 8 4 4-4 4" />
    </>
  ),
  link: (
    <>
      <path d="M9 15 15 9" />
      <path d="M10 6.5 11 5.5a3.5 3.5 0 0 1 5 5l-1 1" />
      <path d="M14 17.5 13 18.5a3.5 3.5 0 0 1-5-5l1-1" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    </>
  ),
  listOrdered: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 5.5h1v3M4 8.5h2" />
      <path d="M4.2 12.8c0-.7.6-1.3 1.3-1.3s1.3.6 1.3 1.3c0 .5-.3.8-.7 1.2l-1.9 1.8h2.6" />
    </>
  ),
  quote: (
    <>
      <path d="M7 8c-2 0-3 1.3-3 3.5S5 15 7 15" />
      <path d="M17 8c-2 0-3 1.3-3 3.5S15 15 17 15" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5-9 9" />
    </>
  ),
  divider: (
    <>
      <path d="M4 12h16" />
    </>
  ),
  heading: (
    <>
      <path d="M6 4v16M18 4v16M6 12h12" />
    </>
  ),
  heading2: (
    <>
      <path d="M6 5v14M14 5v14M6 12h8" />
      <path d="M16.5 16.5c0-1 .8-1.6 1.6-1.6s1.6.6 1.6 1.6c0 .6-.4 1-.9 1.4l-2.3 2h3.2" />
    </>
  ),
  heading3: (
    <>
      <path d="M4 5v14M12 5v14M4 12h8" />
      <path d="M15 14.5c0-.7.7-1.1 1.4-1.1.8 0 1.4.5 1.4 1.1 0 .5-.3.8-.7 1 .5.1.9.5.9 1.1 0 .8-.7 1.3-1.6 1.3-.7 0-1.3-.3-1.5-.9" />
    </>
  ),
  paragraph: (
    <>
      <path d="M9 4h9M9 4a4 4 0 0 0 0 8h1M9 4v16M14 4v16" />
    </>
  ),
  callout: (
    <>
      <path d="M12 9v4M12 17h.01" />
      <circle cx="12" cy="12" r="10" />
    </>
  ),
  star: (
    <>
      <path d="M12 3.5 14.7 9l6.1.9-4.4 4.3 1 6.1L12 17.3 6.6 20.3l1-6.1L3.2 9.9 9.3 9z" />
    </>
  ),
  spinner: (
    <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeDasharray="30 100" />
  ),
  grip: (
    <>
      <circle cx="9" cy="6" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="18" r="1" />
    </>
  ),
  toggle: (
    <>
      <path d="m8 7 4 4-4 4" />
      <path d="M15 17h5" />
    </>
  ),
  cards: (
    <>
      <rect x="3" y="7" width="14" height="14" rx="2" />
      <path d="M7 3h12a2 2 0 0 1 2 2v12" />
    </>
  ),
  cloze: (
    <>
      <path d="M3 12h4M17 12h4" />
      <rect x="9" y="9" width="6" height="6" rx="1" strokeDasharray="2 2" />
    </>
  ),
  quiz: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
    </>
  ),
  sidebar: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </>
  ),
  menu: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
  play: <path d="m7 4 13 8-13 8z" />,
  pencil: <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />,
  shuffle: <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />,
  note: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </>
  ),
  steps: (
    <>
      <circle cx="5" cy="12" r="2.5" />
      <circle cx="19" cy="12" r="2.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7.5 12h2M14.5 12h2" />
    </>
  ),
  timeline: (
    <>
      <path d="M6 3v18" />
      <circle cx="6" cy="7" r="2" />
      <circle cx="6" cy="17" r="2" />
      <path d="M11 7h9M11 17h6" />
    </>
  ),
  bars: <path d="M4 6h10M4 12h16M4 18h7" strokeLinecap="round" strokeWidth={3} />,
  cycle: (
    <>
      <path d="M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2" />
      <path d="M18 2v4h-4M6 22v-4h4" />
    </>
  ),
  pause: <path d="M8 5v14M16 5v14" strokeWidth={3} />,
  table: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M3 15h18M9 4v16" />
    </>
  ),
  rowAdd: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="1.5" />
      <path d="M12 15v6M9 18h6" />
    </>
  ),
  colAdd: (
    <>
      <rect x="4" y="3" width="7" height="18" rx="1.5" />
      <path d="M15 12h6M18 9v6" />
    </>
  ),
  rowDel: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="1.5" />
      <path d="M9 18h6" />
    </>
  ),
  colDel: (
    <>
      <rect x="4" y="3" width="7" height="18" rx="1.5" />
      <path d="M15 12h6" />
    </>
  ),
  headerRow: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M3 4h18v6H3z" fill="currentColor" stroke="none" opacity=".35" />
    </>
  ),
  checkbox: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  outdent: (
    <>
      <path d="M11 6h9M11 12h9M11 18h9" />
      <path d="m7 9-3 3 3 3" />
    </>
  ),
  indent: (
    <>
      <path d="M11 6h9M11 12h9M11 18h9" />
      <path d="m4 9 3 3-3 3" />
    </>
  ),
  alignLeft: <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />,
  alignCenter: <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />,
  alignRight: <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />,
  alignJustify: <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />,
  mermaid: (
    <>
      <rect x="3" y="3" width="7" height="6" rx="1.5" />
      <rect x="14" y="15" width="7" height="6" rx="1.5" />
      <path d="M6.5 9v3.5a2.5 2.5 0 0 0 2.5 2.5h5" />
      <path d="m12 12.5 2.5 2.5-2.5 2.5" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>
  ),
  collection: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 9v11" />
      <path d="M13 13.5h5M13 16.5h3" />
    </>
  ),
  fieldText: (
    <>
      <path d="M3 18 7.5 6 12 18M4.7 14h5.6" />
      <path d="M17 6v12M15 6h4M15 18h4" />
    </>
  ),
  fieldNumber: <path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  fieldSelect: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <path d="M7 12h6" />
      <path d="m15.5 11 1.5 1.5 1.5-1.5" />
    </>
  ),
  fieldMulti: (
    <>
      <path d="M4 6.5 5.5 8 8 5.5M4 13.5l1.5 1.5L8 12.5" />
      <circle cx="6" cy="19.5" r="1.6" />
      <path d="M11 7h9M11 14h9M11 19.5h9" />
    </>
  ),
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  hash: <path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
