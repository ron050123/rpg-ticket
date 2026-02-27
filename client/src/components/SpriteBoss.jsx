import React, { useRef, useEffect, useState } from 'react';
import bossDragonSprite from '../assets/boss_dragon_sprite.png';

/*
  Boss dragon sprite sheet: 640×640, 4 cols × 4 rows
  Row 0: idle poses (wing flap)
  Row 1: fire breathing attack
  Row 2: rage / roar poses
  Row 3: defeated / crumbling
*/

const processedCache = {};

function removeBackground(img, tolerance = 35) {
    const cacheKey = img.src;
    if (processedCache[cacheKey]) return processedCache[cacheKey];

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

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
    const bgR = Math.round(corners.reduce((s, c) => s + c[0], 0) / 4);
    const bgG = Math.round(corners.reduce((s, c) => s + c[1], 0) / 4);
    const bgB = Math.round(corners.reduce((s, c) => s + c[2], 0) / 4);

    for (let i = 0; i < data.length; i += 4) {
        const dr = Math.abs(data[i] - bgR);
        const dg = Math.abs(data[i + 1] - bgG);
        const db = Math.abs(data[i + 2] - bgB);
        if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
            data[i + 3] = 0;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    processedCache[cacheKey] = canvas;
    return canvas;
}

const COLS = 4, ROWS = 4;

const FRAME_SETS = {
    idle: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }],
    attack: [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }],
    rage: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }],
    defeated: [{ r: 3, c: 0 }, { r: 3, c: 1 }, { r: 3, c: 2 }, { r: 3, c: 3 }],
};

const SpriteBoss = ({ state = 'idle', size = 160 }) => {
    const canvasRef = useRef(null);
    const [processedSheet, setProcessedSheet] = useState(null);
    const frameIdxRef = useRef(0);
    const timerRef = useRef(null);

    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => setProcessedSheet(removeBackground(img));
        img.src = bossDragonSprite;
    }, []);

    useEffect(() => {
        if (!processedSheet || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const frameW = processedSheet.width / COLS;
        const frameH = processedSheet.height / ROWS;
        canvas.width = frameW;
        canvas.height = frameH;

        const frames = FRAME_SETS[state] || FRAME_SETS.idle;
        const speed = state === 'attack' ? 150 : state === 'defeated' ? 350 : 300;

        const draw = () => {
            const frame = frames[frameIdxRef.current % frames.length];
            ctx.clearRect(0, 0, frameW, frameH);
            ctx.drawImage(processedSheet, frame.c * frameW, frame.r * frameH, frameW, frameH, 0, 0, frameW, frameH);
        };

        frameIdxRef.current = 0;
        draw();

        if (timerRef.current) clearInterval(timerRef.current);

        // For defeated, play through once then hold last frame
        if (state === 'defeated') {
            timerRef.current = setInterval(() => {
                if (frameIdxRef.current < frames.length - 1) {
                    frameIdxRef.current++;
                    draw();
                } else {
                    clearInterval(timerRef.current);
                }
            }, speed);
        } else {
            timerRef.current = setInterval(() => {
                frameIdxRef.current = (frameIdxRef.current + 1) % frames.length;
                draw();
            }, speed);
        }

        return () => clearInterval(timerRef.current);
    }, [processedSheet, state]);

    const frameW = processedSheet ? processedSheet.width / COLS : 1;
    const frameH = processedSheet ? processedSheet.height / ROWS : 1;
    const scale = size / frameW;

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: `${size}px`,
                height: `${Math.round(frameH * scale)}px`,
                imageRendering: 'pixelated',
                display: 'block',
            }}
        />
    );
};

export default SpriteBoss;
