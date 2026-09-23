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
  folder: <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.5h7.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />,
  noteRow: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="2.5" />
      <path d="M7 10.5h2M7 13.5h2M12 10.5h5M12 13.5h3" />
    </>
  ),
  noteCard: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7 7h7v7H7zM7 17.5h8" />
    </>
  ),
  graph: (
    <>
      <circle cx="5" cy="6" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M7.4 6.9 15.6 5.4M6.3 8.2l4.4 7.7M17 7.3l-4 8.4" />
    </>
  ),
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
  timelineAxis: (
    <>
      <path d="M2 12h20" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="16" cy="12" r="2" />
      <path d="M9 6h10M6 14.5V18M16 14.5V18" />
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
  plot: (
    <>
      <path d="M3 12h18M12 3v18" strokeOpacity=".45" />
      <path d="M3 20c4 0 5-13 9-13s5 8 9 8" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.8 1.7-1.7 0-.5-.2-.8-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7h2A4.6 4.6 0 0 0 21 11c0-4.4-4-8-9-8z" />
      <circle cx="7.5" cy="11" r="1.2" fill="currentColor" />
      <circle cx="10.5" cy="7" r="1.2" fill="currentColor" />
      <circle cx="15" cy="7.5" r="1.2" fill="currentColor" />
    </>
  ),
  present: (
    <>
      <rect x="2.5" y="3.5" width="19" height="13" rx="2" />
      <path d="M12 16.5V21M8 21h8M10 8v5l4-2.5z" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5M9 7h7M9 11h5" />
    </>
  ),
  laser: (
    <>
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5M12 3v12" />
    </>
  ),
  sparkle: <path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
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
  whiteboard: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M7 13c1.5-3 3-4 4-2.5s2 1.5 3.5-1.5" />
      <path d="M9 21l3-4 3 4" />
    </>
  ),
  expand: <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />,
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
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth={3} strokeLinecap="round" />,
  sticky: (
    <>
      <path d="M15.5 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10.5z" />
      <path d="M15 21v-4a2 2 0 0 1 2-2h4" />
    </>
  ),
  subscript: (
    <>
      <path d="M4 6l8 10M12 6l-8 10" />
      <path d="M15 20h5M17.5 16.8c0-.9.7-1.5 1.5-1.5s1.5.6 1.5 1.4c0 .5-.3.8-.7 1.2L18 19.4h2.5" />
    </>
  ),
  superscript: (
    <>
      <path d="M4 18l8-10M12 18l-8-10" />
      <path d="M15 8h5M17.5 4.8c0-.9.7-1.5 1.5-1.5s1.5.6 1.5 1.4c0 .5-.3.8-.7 1.2L18 7.4h2.5" />
    </>
  ),
  kbd: (
    <>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <path d="M7 10.5v3M10.2 10.5v3M13.4 10.5v3M7 13.5h2.2M10.4 13.5h2M8.5 10.5l1.7 3M17 10.5v3h-2.3" />
    </>
  ),
  formula: (
    <>
      <path d="M7 4h9l-1 4" />
      <path d="M6 20c2 0 2.5-1 3-3l1.5-9c.4-2.3 1.3-4 4-4" />
      <path d="M6 13h6" />
      <path d="M14 13l6 7M20 13l-6 7" />
    </>
  ),
  footnote: (
    <>
      <path d="M4 6h13M4 12h9" />
      <path d="M17 15.3c0-1 .8-1.7 1.7-1.7s1.7.7 1.7 1.6c0 .5-.3.9-.8 1.3L18 18h2.6" />
    </>
  ),
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
    </>
  ),
  layoutGrid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  layoutMosaic: (
    <>
      <rect x="3" y="3" width="7.5" height="11" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="6" rx="1.5" />
      <rect x="3" y="17" width="7.5" height="4" rx="1.5" />
      <rect x="13.5" y="12" width="7.5" height="9" rx="1.5" />
    </>
  ),
  layoutList: (
    <>
      <rect x="3" y="4" width="5" height="5" rx="1.2" />
      <rect x="3" y="15" width="5" height="5" rx="1.2" />
      <path d="M11 5.5h10M11 8h6M11 16.5h10M11 19h6" />
    </>
  ),
  sortAsc: <path d="M7 4v16M3 8l4-4 4 4M14 8h7M14 13h5M14 18h3" />,
  sortDesc: <path d="M7 4v16M3 16l4 4 4-4M14 6h3M14 11h5M14 16h7" />,
  group: (
    <>
      <rect x="3" y="3" width="18" height="7" rx="2" />
      <rect x="3" y="14" width="18" height="7" rx="2" />
    </>
  ),
  bezier: (
    <>
      <path d="M4 18C7 8 17 16 20 6" />
      <rect x="2" y="16" width="4" height="4" rx="1" />
      <rect x="18" y="4" width="4" height="4" rx="1" />
      <path d="M4 18 9 9M20 6l-5 9" strokeDasharray="1.5 2" />
    </>
  ),
  cursor: <path d="M5 3l14 7-6 2-2 6z" strokeLinejoin="round" />,
  shapeRect: <rect x="4" y="6" width="16" height="12" rx="1.5" />,
  shapeEllipse: <ellipse cx="12" cy="12" rx="8.5" ry="6.5" />,
  shapeLine: <path d="M5 19 19 5" strokeLinecap="round" />,
  shapeText: <path d="M5 6V4h14v2M12 4v16M9 20h6" />,
  undo: <path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />,
  redo: <path d="m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3" />,
  ungroup: (
    <>
      <rect x="3" y="3" width="10" height="10" rx="2" />
      <rect x="11" y="11" width="10" height="10" rx="2" strokeDasharray="2 2" />
    </>
  ),
  floatLeft: (
    <>
      <rect x="3" y="5" width="8" height="8" rx="1.5" />
      <path d="M14 6h7M14 10h7M14 14h7M3 18h18" />
    </>
  ),
  floatRight: (
    <>
      <rect x="13" y="5" width="8" height="8" rx="1.5" />
      <path d="M3 6h7M3 10h7M3 14h7M3 18h18" />
    </>
  ),
  // ---------- Bilder ----------
  crop: <path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" />,
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  wand: (
    <>
      <path d="m15 4 5 5L8 21l-5-5z" />
      <path d="m12 7 5 5M19 2v3M22 5h-3M4 3v2M5 4H3" />
    </>
  ),
  rotateLeft: (
    <>
      <path d="M3 4v5h5" />
      <path d="M3.5 13.5A8.5 8.5 0 1 0 5.6 6.3L3 9" />
    </>
  ),
  rotateRight: (
    <>
      <path d="M21 4v5h-5" />
      <path d="M20.5 13.5A8.5 8.5 0 1 1 18.4 6.3L21 9" />
    </>
  ),
  flipH: <path d="M12 3v18M9 6 3 18h6zM15 6l6 12h-6z" />,
  flipV: <path d="M3 12h18M6 9 18 3v6zM6 15l12 6v-6z" />,
  invert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </>
  ),
  zoomIn: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4M11 8v6M8 11h6" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4M8 11h6" />
    </>
  ),
  wrapInline: (
    <>
      <path d="M3 4h18M3 20h18" />
      <rect x="7" y="8" width="10" height="8" rx="1.5" />
    </>
  ),
  wrapLeft: (
    <>
      <rect x="3" y="4" width="8" height="8" rx="1.5" />
      <path d="M14 5h7M14 9h7M14 13h7M3 17h18M3 21h14" />
    </>
  ),
  wrapRight: (
    <>
      <rect x="13" y="4" width="8" height="8" rx="1.5" />
      <path d="M3 5h7M3 9h7M3 13h7M3 17h18M3 21h14" />
    </>
  ),
  wrapFront: (
    <>
      <path d="M3 4h18M3 8h4M3 12h4M3 16h4M3 20h18" />
      <rect x="9" y="7" width="12" height="10" rx="1.5" fill="currentColor" fillOpacity=".25" />
    </>
  ),
  wrapBehind: (
    <>
      <rect x="9" y="7" width="12" height="10" rx="1.5" strokeDasharray="2 2" />
      <path d="M3 4h18M3 8h18M3 12h18M3 16h18M3 20h18" strokeOpacity=".9" />
    </>
  ),
  anchor: (
    <>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 7.5V21M5 12H2a10 10 0 0 0 20 0h-3M8 11h8" />
    </>
  ),
  resize: <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7M14 21h7v-7M10 3H3v7" />,
  frame: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </>
  ),
  caption: (
    <>
      <rect x="3" y="3" width="18" height="12" rx="2" />
      <path d="M6 19h12M9 22h6" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  gallery: (
    <>
      <rect x="6" y="3" width="15" height="14" rx="2" />
      <path d="M3 7v12a2 2 0 0 0 2 2h12M10.5 8.5h.01M21 13l-4-4-7 7" />
    </>
  ),
  carousel: (
    <>
      <rect x="6" y="4" width="12" height="13" rx="2" />
      <path d="M2 6v9M22 6v9M10 21h.01M14 21h.01M12 21h.01" />
    </>
  ),
  strip: (
    <>
      <rect x="2" y="6" width="6" height="12" rx="1.5" />
      <rect x="9" y="6" width="6" height="12" rx="1.5" />
      <rect x="16" y="6" width="6" height="12" rx="1.5" />
    </>
  ),
  compare: (
    <>
      <path d="M12 2v20" />
      <path d="M8 7 3 12l5 5M16 7l5 5-5 5" />
    </>
  ),
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
