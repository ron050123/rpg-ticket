import React from 'react';

const GUILD_ASSETS = '/assets/craftpix-net-189780-free-top-down-pixel-art-guild-hall-asset-pack/PNG';

// Known sprite sheet dimensions (original pixels)
const SHEET_SIZES = {
  'Interior_objects.png': [384, 384],
  'Walls_interior.png': [384, 128],
  'Guildmaster.png': [288, 32],
  'Talking_people.png': [576, 48],
  'Fire.png': [384, 48],
  'Flags_animation.png': [32, 576],
  'Reader1.png': [576, 48],
  'Windows_doors.png': [192, 192],
  'Exterior.png': [448, 80],
};

/**
 * Renders a cropped region from a Guild Hall sprite sheet.
 * @param {string} sheet - Filename within PNG folder
 * @param {number} sx - Source X in original pixels
 * @param {number} sy - Source Y in original pixels
 * @param {number} sw - Source width in original pixels
 * @param {number} sh - Source height in original pixels
 * @param {number} scale - Display magnification (default 3)
 * @param {object} style - Additional CSS styles
 */
const GuildHallSprite = ({ sheet, sx, sy, sw, sh, scale = 3, style = {} }) => {
  const [sheetW, sheetH] = SHEET_SIZES[sheet] || [384, 384];
  const src = `${GUILD_ASSETS}/${sheet}`;

  return (
    <div style={{
      width: sw * scale,
      height: sh * scale,
      backgroundImage: `url(${src})`,
      backgroundPosition: `-${sx * scale}px -${sy * scale}px`,
      backgroundSize: `${sheetW * scale}px ${sheetH * scale}px`,
      backgroundRepeat: 'no-repeat',
      imageRendering: 'pixelated',
      ...style,
    }} />
  );
};

export default GuildHallSprite;
export { GUILD_ASSETS, SHEET_SIZES };
