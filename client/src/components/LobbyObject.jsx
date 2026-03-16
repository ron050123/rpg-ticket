import React, { useState, useEffect } from 'react';
import GuildHallSprite from './GuildHallSprite';

const GUILD_ASSETS = '/assets/craftpix-net-189780-free-top-down-pixel-art-guild-hall-asset-pack/PNG';

// Sprite regions from Interior_objects.png (384×384, 16px tile grid)
const SPRITE_DEFS = {
    table:    { sx: 96, sy: 96, sw: 48, sh: 32 },
    bench:    { sx: 0,  sy: 160, sw: 48, sh: 32 },
    barrel:   { sx: 0,  sy: 32, sw: 32, sh: 32 },
    pot:      { sx: 48, sy: 32, sw: 32, sh: 32 },
    board:    { sx: 48, sy: 64, sw: 48, sh: 32 },
    treasure: { sx: 192, sy: 64, sw: 48, sh: 32 },
    rug:      { sx: 0,  sy: 96, sw: 64, sh: 32 },
    bookshelf:{ sx: 240, sy: 32, sw: 64, sh: 48 },
};

const AnimatedFire = ({ x, y }) => {
    const [frame, setFrame] = useState(2);
    const TOTAL_FRAMES = 7;

    useEffect(() => {
        const interval = setInterval(() => {
            // Cycle through frames 2-6 (the visible flames)
            setFrame(f => {
                const next = f + 1;
                return next > 5 ? 2 : next;
            });
        }, 180);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: Math.floor(y),
            filter: 'drop-shadow(0 0 15px rgba(255,150,30,0.8)) drop-shadow(0 0 8px rgba(255,80,0,0.6))',
            pointerEvents: 'none',
        }}>
            <GuildHallSprite
                sheet="Fire.png"
                sx={frame * 48}
                sy={0}
                sw={48}
                sh={48}
                scale={2}
            />
        </div>
    );
};

const LobbyObject = ({ type = 'table', x, y, size = 64 }) => {
    if (type === 'torch') {
        return <AnimatedFire x={x} y={y} />;
    }

    const spriteDef = SPRITE_DEFS[type];
    if (!spriteDef) {
        // Fallback for unknown types
        return (
            <div style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: `${size}px`,
                height: `${size}px`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: `${size * 0.8}px`,
                transform: 'translate(-50%, -100%)',
                zIndex: Math.floor(y),
                pointerEvents: 'none',
            }}>
                📦
            </div>
        );
    }

    const isRug = type === 'rug';
    const scale = isRug ? 5 : 3;

    return (
        <div style={{
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
            transform: isRug ? 'translate(-50%, -50%)' : 'translate(-50%, -100%)',
            zIndex: isRug ? 0 : Math.floor(y),
            pointerEvents: 'none',
        }}>
            <GuildHallSprite
                sheet="Interior_objects.png"
                {...spriteDef}
                scale={scale}
            />
        </div>
    );
};

export default LobbyObject;