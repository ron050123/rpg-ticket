import React, { useRef, useEffect, useState, useMemo } from 'react';

import warriorSprite from '../assets/warrior_sprite.png';
import mageSprite from '../assets/mage_sprite.png';
import rogueSprite from '../assets/rogue_sprite.png';
import clericSprite from '../assets/cleric_sprite.png';
import grandmasterSprite from '../assets/grandmaster_sprite.png';

/*
  Each sprite sheet is ~640×640px with characters arranged in a grid.
  We define per-class frame configs and remove the background color automatically.
*/

const SPRITES = {
    Warrior: {
        img: warriorSprite,
        cols: 4, rows: 4,
        idleFrames: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }],
        attackFrames: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }],
    },
    Mage: {
        img: mageSprite,
        cols: 8, rows: 5,
        idleFrames: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }],
        attackFrames: [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 1, c: 4 }, { r: 1, c: 5 }],
    },
    Rogue: {
        img: rogueSprite,
        cols: 6, rows: 6,
        idleFrames: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 }, { r: 0, c: 5 }],
        attackFrames: [{ r: 3, c: 0 }, { r: 3, c: 1 }, { r: 3, c: 2 }, { r: 3, c: 3 }, { r: 3, c: 4 }, { r: 3, c: 5 }],
    },
    Cleric: {
        img: clericSprite,
        cols: 4, rows: 4,
        idleFrames: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }],
        attackFrames: [{ r: 3, c: 0 }, { r: 3, c: 1 }, { r: 3, c: 2 }, { r: 3, c: 3 }],
    },
    Grandmaster: {
        img: grandmasterSprite,
        cols: 3, rows: 4,
        idleFrames: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }],
        attackFrames: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }],
    },
};

/* ---- Background removal cache (process each sheet only once) ---- */
const processedCache = {};

function removeBackground(img, tolerance = 40) {
    const cacheKey = img.src;
    if (processedCache[cacheKey]) return processedCache[cacheKey];

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Sample background color from 4 corners
    const getPixel = (x, y) => {
        const i = (y * canvas.width + x) * 4;
        return [data[i], data[i + 1], data[i + 2]];
    };
    const corners = [
        getPixel(1, 1),
        getPixel(canvas.width - 2, 1),
        getPixel(1, canvas.height - 2),
        getPixel(canvas.width - 2, canvas.height - 2),
    ];
    // Average corner colors to determine background
    const bgR = Math.round(corners.reduce((s, c) => s + c[0], 0) / 4);
    const bgG = Math.round(corners.reduce((s, c) => s + c[1], 0) / 4);
    const bgB = Math.round(corners.reduce((s, c) => s + c[2], 0) / 4);

    // Make all pixels within tolerance of background transparent
    for (let i = 0; i < data.length; i += 4) {
        const dr = Math.abs(data[i] - bgR);
        const dg = Math.abs(data[i + 1] - bgG);
        const db = Math.abs(data[i + 2] - bgB);
        if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
            data[i + 3] = 0; // set alpha to 0
        }
    }

    ctx.putImageData(imageData, 0, 0);
    processedCache[cacheKey] = canvas;
    return canvas;
}

const SpriteHero = ({ heroClass = 'Warrior', active = false, size = 64 }) => {
    const canvasRef = useRef(null);
    const config = SPRITES[heroClass] || SPRITES.Warrior;
    const [processedSheet, setProcessedSheet] = useState(null);
    const frameIdxRef = useRef(0);
    const timerRef = useRef(null);

    // Load and process sprite sheet
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const processed = removeBackground(img);
            setProcessedSheet(processed);
        };
        img.src = config.img;
    }, [config.img]);

    // Animate frames
    useEffect(() => {
        if (!processedSheet || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const frameW = processedSheet.width / config.cols;
        const frameH = processedSheet.height / config.rows;

        canvas.width = frameW;
        canvas.height = frameH;

        const frames = active ? config.attackFrames : config.idleFrames;

        const draw = () => {
            const frame = frames[frameIdxRef.current % frames.length];
            const sx = frame.c * frameW;
            const sy = frame.r * frameH;
            ctx.clearRect(0, 0, frameW, frameH);
            ctx.drawImage(processedSheet, sx, sy, frameW, frameH, 0, 0, frameW, frameH);
        };

        frameIdxRef.current = 0;
        draw();

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            frameIdxRef.current = (frameIdxRef.current + 1) % frames.length;
            draw();
        }, active ? 200 : 400);

        return () => clearInterval(timerRef.current);
    }, [processedSheet, heroClass, active, config]);

    const frameW = processedSheet ? processedSheet.width / config.cols : 0;
    const frameH = processedSheet ? processedSheet.height / config.rows : 0;
    const scale = frameW ? size / frameW : 1;

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: `${size}px`,
                height: `${Math.round(frameH * scale)}px`,
                imageRendering: 'pixelated',
                display: 'block',
                margin: '0 auto',
            }}
        />
    );
};

export default SpriteHero;
