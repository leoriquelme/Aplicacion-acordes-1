// Círculo con tres ondas, al estilo del logo de Spotify (toma el color del texto).
export default function SpotifyLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="spotify-logo">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M7 9.3c3.4-1 7.3-.7 10.2.9M7.6 12.4c2.8-.8 5.9-.5 8.3.8M8.2 15.3c2.2-.6 4.5-.4 6.4.6" fill="none" stroke="var(--spotify-onda, #fff)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
