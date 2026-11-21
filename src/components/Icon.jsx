// Íconos minimalistas de línea, de un solo color (toman el color del texto).
const P = {
  home: 'M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  folder: 'M3 6h6l2 2h10v11H3z',
  church: 'M12 2v4M10 4h4M12 6l-6 5v10h12V11l-6-5ZM10 21v-5h4v5M3 21h18',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  edit: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  play: 'M7 4.5v15l12-7.5-12-7.5Z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z',
  book: 'M4 5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2V5Zm0 15a2 2 0 0 0 2 2h14v-4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  laptop: 'M5 5h14v10H5zM2 19h20',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3Z',
  heart: 'M12 20s-7-4.4-9-8.7C1.6 8.2 3.5 5 6.6 5c2 0 3.4 1.1 4.4 2.6h2C14 6.1 15.4 5 17.4 5c3.1 0 5 3.2 3.6 6.3C19 15.6 12 20 12 20Z',
  pray: 'M12 3v8m0 0-3.5 5.5L6 21m6-10 3.5 5.5L18 21M12 3c-1.2 1.6-3 4.6-3 7M12 3c1.2 1.6 3 4.6 3 7',
  guitar: 'M14 10l6-6m-2-1 3 3M9.5 10.5a4 4 0 0 0-5.7 0c-1.6 1.6-1.6 4.6.6 6.8 2.2 2.2 5.2 2.2 6.8.6a4 4 0 0 0 0-5.7l2.3-2.3-1.7-1.7-2.3 2.3ZM8 14l2 2',
  download: 'M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M4 20h16',
  upload: 'M12 20V9m0 0-4.5 4.5M12 9l4.5 4.5M4 4h16',
  phone: 'M7 2h10v20H7zM11 18h2',
  print: 'M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Zm4 4h4',
  hand: 'M8 12V5.5a1.5 1.5 0 0 1 3 0V11m0-6.5a1.5 1.5 0 0 1 3 0V11m0-5a1.5 1.5 0 0 1 3 0v7c0 4-2.5 8-7 8-3 0-4.6-1.8-6-4l-2-3.6a1.5 1.5 0 0 1 2.6-1.5L8 14',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  volumeLow: 'M4 9v6h4l5 4V5L8 9H4Zm12 .5a3.5 3.5 0 0 1 0 5',
  volumeHigh: 'M4 9v6h4l5 4V5L8 9H4Zm12 .5a3.5 3.5 0 0 1 0 5M18.5 6.5a7.5 7.5 0 0 1 0 11',
  slow: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-12v4l2.5 2.5M10 2h4',
  fast: 'M13 3 5 14h6l-1 7 8-11h-6l1-7Z',
  pause: 'M8 5v14M16 5v14',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  arrowUp: 'M12 19V5m0 0-6 6m6-6 6 6',
  mic: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm-6-4a6 6 0 0 0 12 0M12 17v4M8 21h8',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5a6 6 0 0 1 3 5.5',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  note: 'M5 4h10l4 4v12H5zM15 4v4h4M8 12h8M8 16h5',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z',
  text: 'M5 19 10.5 5h1L17 19M7.3 14h7.4',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z',
};

export default function Icon({ name, size = '1.1em', className = '', title }) {
  const d = P[name];
  if (!d) return null;
  return (
    <svg
      className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'} role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <path d={d} />
    </svg>
  );
}
