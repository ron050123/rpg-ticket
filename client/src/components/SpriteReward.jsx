import React, { useRef, useEffect, useState } from 'react';

import redbullSprite from '../assets/redbull_sprite.png';
import coffeeSprite from '../assets/coffee_sprite.png';
import snacksSprite from '../assets/snacks_sprite.png';
import baobunSprite from '../assets/baobun_sprite.png';

/*
  Animated reward sprite component.
  Auto-detects frames from sprite sheets and loops through them.
*/

const REWARD_SPRITES = {
    redbull: redbullSprite,
    coffee: coffeeSprite,
    snacks: snacksSprite,
    'bao bun': baobunSprite,
    baobun: baobunSprite,
    'bao': baobunSprite,
};

/* ---------- background removal ---------- */
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

/* ---------- auto-detect frame bounding boxes ---------- */
const frameCache = {};

function detectFrames(canvas, cacheKey) {
    if (frameCache[cacheKey]) return frameCache[cacheKey];

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const colHasPixel = new Array(width).fill(false);
    let minY = height, maxY = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > 10) {
                colHasPixel[x] = true;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    const segments = [];
    let inSeg = false;
    let start = 0;
    const GAP_THRESHOLD = 5;
    let gapCount = 0;

    for (let x = 0; x < width; x++) {
        if (colHasPixel[x]) {
            if (!inSeg) { inSeg = true; start = x; }
            gapCount = 0;
        } else {
            if (inSeg) {
                gapCount++;
                if (gapCount >= GAP_THRESHOLD) {
                    segments.push({ x: start, w: x - gapCount - start + 1 });
                    inSeg = false; gapCount = 0;
                }
            }
        }
    }
    if (inSeg) segments.push({ x: start, w: width - start - gapCount });

    const padY = 2;
    const cropMinY = Math.max(0, minY - padY);
    const cropMaxY = Math.min(height - 1, maxY + padY);
    const cropH = cropMaxY - cropMinY + 1;

    let frames = segments.map(seg => ({
        x: Math.max(0, seg.x - 1),
        y: cropMinY,
        w: Math.min(width - seg.x + 1, seg.w + 2),
        h: cropH,
    }));

    // Fallback: uniform 4-column split
    if (frames.length < 2) {
        const sliceW = Math.floor(width / 4);
        frames = [];
        for (let i = 0; i < 4; i++) {
            frames.push({ x: i * sliceW, y: cropMinY, w: sliceW, h: cropH });
        }
    }

    frameCache[cacheKey] = frames;
    return frames;
}

function findSpriteForName(name) {
    if (!name) return null;
    const lower = name.toLowerCase().trim();
    // Exact match first
    if (REWARD_SPRITES[lower]) return REWARD_SPRITES[lower];
    // Partial match
    for (const [key, value] of Object.entries(REWARD_SPRITES)) {
        if (lower.includes(key) || key.includes(lower)) return value;
    }
    return null;
}

const SpriteReward = ({ name = '', size = 50 }) => {
    const canvasRef = useRef(null);
    const [processedSheet, setProcessedSheet] = useState(null);
    const [frames, setFrames] = useState(null);
    const frameIdxRef = useRef(0);
    const timerRef = useRef(null);

    const spriteSrc = findSpriteForName(name);

    useEffect(() => {
        if (!spriteSrc) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const processed = removeBackground(img);
            const detected = detectFrames(processed, spriteSrc);
            setProcessedSheet(processed);
            setFrames(detected);
        };
        img.src = spriteSrc;
    }, [spriteSrc]);

    useEffect(() => {
        if (!processedSheet || !frames || !canvasRef.current) return;
        if (frames.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const globalMaxW = Math.max(...frames.map(f => f.w));
        const globalMaxH = Math.max(...frames.map(f => f.h));
        canvas.width = globalMaxW;
        canvas.height = globalMaxH;

        const draw = () => {
            const frame = frames[frameIdxRef.current % frames.length];
            ctx.clearRect(0, 0, globalMaxW, globalMaxH);
            const dx = Math.floor((globalMaxW - frame.w) / 2);
            const dy = Math.floor((globalMaxH - frame.h) / 2);
            ctx.drawImage(processedSheet, frame.x, frame.y, frame.w, frame.h, dx, dy, frame.w, frame.h);
        };

        frameIdxRef.current = 0;
        draw();

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            frameIdxRef.current = (frameIdxRef.current + 1) % frames.length;
            draw();
        }, 350);

        return () => clearInterval(timerRef.current);
    }, [processedSheet, frames]);

    // If no matching sprite, fall back to nothing
    if (!spriteSrc) return null;

    let displayW = size;
    let displayH = size;
    if (frames && frames.length > 0) {
        const globalMaxW = Math.max(...frames.map(f => f.w));
        const globalMaxH = Math.max(...frames.map(f => f.h));
        const scale = Math.min(size / globalMaxW, size / globalMaxH);
        displayW = Math.round(globalMaxW * scale);
        displayH = Math.round(globalMaxH * scale);
    }

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: `${displayW}px`,
                height: `${displayH}px`,
                imageRendering: 'pixelated',
                display: 'block',
                margin: '0 auto',
            }}
        />
    );
};

export default SpriteReward;
