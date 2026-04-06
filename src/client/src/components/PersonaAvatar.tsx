import React, { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import * as styles from '@dicebear/collection';

export type AvatarStyle = 'bottts' | 'avataaars' | 'funEmoji' | 'icons' | 'shapes' | 'thumbs' | 'pixelArt' | 'initials' | 'rings' | 'lorelei';

const STYLE_MAP: Record<AvatarStyle, any> = {
  bottts: styles.bottts,
  avataaars: styles.avataaars,
  funEmoji: styles.funEmoji,
  icons: styles.icons,
  shapes: styles.shapes,
  thumbs: styles.thumbs,
  pixelArt: styles.pixelArt,
  initials: styles.initials,
  rings: styles.rings,
  lorelei: styles.lorelei,
};

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

interface PersonaAvatarProps {
  seed: string;
  style?: AvatarStyle;
  size?: number;
  className?: string;
}

/**
 * Generates a deterministic avatar from a seed string (e.g., persona name).
 * Same seed + style always produces the same avatar.
 */
const PersonaAvatar: React.FC<PersonaAvatarProps> = ({
  seed,
  style = 'bottts',
  size = 40,
  className = '',
}) => {
  const svgDataUri = useMemo(() => {
    const avatarStyle = STYLE_MAP[style] || styles.bottts;
    const avatar = createAvatar(avatarStyle, {
      seed,
      size,
    });
    return avatar.toDataUri();
  }, [seed, style, size]);

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
