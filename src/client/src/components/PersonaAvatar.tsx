import React, { useMemo } from 'react';

export type AvatarStyle =
  | 'bottts'
  | 'avataaars'
  | 'funEmoji'
  | 'icons'
  | 'shapes'
  | 'thumbs'
  | 'pixelArt'
  | 'initials'
  | 'rings'
  | 'lorelei';

export const AVATAR_STYLES: { key: AvatarStyle; label: string }[] = [
  { key: 'bottts', label: 'Robots' },
  { key: 'avataaars', label: 'Characters' },
  { key: 'funEmoji', label: 'Emoji' },
  { key: 'icons', label: 'Icons' },
  { key: 'shapes', label: 'Shapes' },
  { key: 'thumbs', label: 'Thumbs' },
  { key: 'pixelArt', label: 'Pixel Art' },
  { key: 'initials', label: 'Initials' },
  { key: 'rings', label: 'Rings' },
  { key: 'lorelei', label: 'Portraits' },
];

/** Simple deterministic hash from a string → 0..1 float */
function hashSeed(seed: string, offset = 0): number {
  let h = offset * 2654435761;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/** Pick a hue from the seed */
function seedToHue(seed: string): number {
  return Math.floor(hashSeed(seed) * 360);
}

/** Get initials (up to 2 chars) from a seed string */
function getInitials(seed: string): string {
  const words = seed.trim().split(/[\s_\-\.]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return seed.slice(0, 2).toUpperCase();
}

/** Generate a deterministic SVG avatar as a data URI */
function buildAvatarSvg(seed: string, style: AvatarStyle, size: number): string {
  const hue = seedToHue(seed);
  const hue2 = (hue + 60 + Math.floor(hashSeed(seed, 1) * 120)) % 360;
  const bg = `hsl(${hue}, 65%, 55%)`;
  const fg = `hsl(${hue2}, 70%, 90%)`;
  const initials = getInitials(seed);

  let inner = '';

  switch (style) {
    case 'rings': {
      const rings = [0.42, 0.32, 0.22, 0.12];
      inner = rings
        .map((r, i) => {
          const rh = (hue + i * 40) % 360;
          return `<circle cx="50" cy="50" r="${r * 100}" fill="none" stroke="hsl(${rh},70%,60%)" stroke-width="${3 + i}"/>`;
        })
        .join('');
      break;
    }
    case 'shapes': {
      const pts = [3, 5, 6, 7, 8][Math.floor(hashSeed(seed, 2) * 5)];
      const angleStep = (2 * Math.PI) / pts;
      const points = Array.from({ length: pts }, (_, i) => {
        const a = i * angleStep - Math.PI / 2;
        const r = 38;
        return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
      }).join(' ');
      inner = `<polygon points="${points}" fill="${fg}" stroke="${bg}" stroke-width="2"/>`;
      break;
    }
    case 'pixelArt': {
      const grid: string[] = [];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          const mirrorCol = col > 2 ? 4 - col : col;
          const on = hashSeed(seed, row * 3 + mirrorCol) > 0.4;
          if (on) {
            const ph = (hue + (row + col) * 15) % 360;
            grid.push(`<rect x="${8 + col * 17}" y="${8 + row * 17}" width="16" height="16" fill="hsl(${ph},70%,60%)"/>`);
          }
        }
      }
      inner = grid.join('');
      break;
    }
    case 'funEmoji': {
      const emojis = ['😀', '🤖', '🦄', '🐱', '🎩', '🦊', '🐸', '🌈', '🔥', '⚡'];
      const idx = Math.floor(hashSeed(seed) * emojis.length);
      inner = `<text x="50" y="62" text-anchor="middle" font-size="44">${emojis[idx]}</text>`;
      break;
    }
    default:
    case 'initials':
    case 'bottts':
    case 'avataaars':
    case 'icons':
    case 'thumbs':
    case 'lorelei': {
      // Fallback: coloured circle + initials for all styles
      inner = `<text x="50" y="58" text-anchor="middle" font-family="system-ui, sans-serif" font-size="36" font-weight="bold" fill="${fg}">${initials}</text>`;
      break;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
  <circle cx="50" cy="50" r="50" fill="${bg}"/>
  ${inner}
</svg>`;

  const bytes = new TextEncoder().encode(svg);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

interface PersonaAvatarProps {
  seed: string;
  style?: AvatarStyle;
  size?: number;
  className?: string;
}

/**
 * Generates a deterministic avatar from a seed string (e.g., persona name).
 * Same seed + style always produces the same avatar.
 * Pure SVG implementation — no external avatar library required.
 */
const PersonaAvatar: React.FC<PersonaAvatarProps> = ({
  seed,
  style = 'bottts',
  size = 40,
  className = '',
}) => {
  const svgDataUri = useMemo(
    () => buildAvatarSvg(seed, style, size),
    [seed, style, size],
  );

  return (
    <img
      src={svgDataUri}
      alt={`Avatar for ${seed}`}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export default React.memo(PersonaAvatar);
