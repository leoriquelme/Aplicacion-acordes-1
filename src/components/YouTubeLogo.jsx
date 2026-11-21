// Rectángulo redondeado con triángulo, al estilo del logo de YouTube.
export default function YouTubeLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="youtube-logo">
      <rect x="1.5" y="5" width="21" height="14" rx="4.5" fill="currentColor" />
      <path d="M10 9.2v5.6l4.8-2.8z" fill="#fff" />
    </svg>
  );
}
