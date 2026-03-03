import React, { useRef, useEffect, useState } from 'react';

import warriorSprite from '../assets/warrior_sprite.png';
import mageSprite from '../assets/mage_sprite.png';
import rogueSprite from '../assets/rogue_sprite.png';
import clericSprite from '../assets/cleric_sprite.png';
import grandmasterSprite from '../assets/grandmaster_sprite.png';

/*
  Auto-detect frames from AI-generated sprite sheets.
  After removing the background, we scan columns for gaps of
  transparent pixels to find the bounding box of each character frame.
*/

const SPRITE_IMGS = {
    Warrior: warriorSprite,
    Mage: mageSprite,
    Rogue: rogueSprite,
    Cleric: clericSprite,
    Grandmaster: grandmasterSprite,
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

function detectFrames(canvas) {
    const cacheKey = canvas.toDataURL().slice(0, 100);
    if (frameCache[cacheKey]) return frameCache[cacheKey];

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // For each column, check if it has any non-transparent pixel
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

    // Find horizontal segments (clusters of columns with pixels)
    const segments = [];
    let inSeg = false;
    let start = 0;
    const GAP_THRESHOLD = 5; // minimum gap of transparent columns to split frames
    let gapCount = 0;

    for (let x = 0; x < width; x++) {
        if (colHasPixel[x]) {
            if (!inSeg) {
                inSeg = true;
                start = x;
            }
            gapCount = 0;
        } else {
            if (inSeg) {
                gapCount++;
                if (gapCount >= GAP_THRESHOLD) {
                    segments.push({ x: start, w: x - gapCount - start + 1 });
                    inSeg = false;
                    gapCount = 0;
                }
            }
        }
    }
    if (inSeg) segments.push({ x: start, w: width - start - gapCount });

    // Build bounding boxes using the shared Y range (with some padding)
    const padY = 2;
    const cropMinY = Math.max(0, minY - padY);
    const cropMaxY = Math.min(height - 1, maxY + padY);
    const cropH = cropMaxY - cropMinY + 1;

    const frames = segments.map(seg => ({
        x: Math.max(0, seg.x - 1),
        y: cropMinY,
        w: Math.min(width - seg.x + 1, seg.w + 2),
        h: cropH,
    }));

    // If we got fewer than 4 frames, try splitting by rows
    if (frames.length < 4) {
        // Check for row-based layout
        const rowHasPixel = new Array(height).fill(false);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (data[(y * width + x) * 4 + 3] > 10) {
                    rowHasPixel[y] = true;
                    break;
                }
            }
        }

        const rowSegments = [];
        let inRowSeg = false;
        let rowStart = 0;
        let rowGapCount = 0;

        for (let y = 0; y < height; y++) {
            if (rowHasPixel[y]) {
                if (!inRowSeg) { inRowSeg = true; rowStart = y; }
                rowGapCount = 0;
            } else {
                if (inRowSeg) {
                    rowGapCount++;
                    if (rowGapCount >= GAP_THRESHOLD) {
                        rowSegments.push({ y: rowStart, h: y - rowGapCount - rowStart + 1 });
                        inRowSeg = false;
                        rowGapCount = 0;
                    }
                }
            }
        }
        if (inRowSeg) rowSegments.push({ y: rowStart, h: height - rowStart - rowGapCount });

        // If we have multiple rows, combine with column segments for a grid
        if (rowSegments.length >= 2) {
            const gridFrames = [];
            for (const rowSeg of rowSegments) {
                // Find column segments within this row
                const rowColHasPixel = new Array(width).fill(false);
                for (let y = rowSeg.y; y < rowSeg.y + rowSeg.h; y++) {
                    for (let x = 0; x < width; x++) {
                        if (data[(y * width + x) * 4 + 3] > 10) {
                            rowColHasPixel[x] = true;
                        }
                    }
                }
                let rInSeg = false, rStart = 0, rGap = 0;
                for (let x = 0; x < width; x++) {
                    if (rowColHasPixel[x]) {
                        if (!rInSeg) { rInSeg = true; rStart = x; }
                        rGap = 0;
                    } else {
                        if (rInSeg) {
                            rGap++;
                            if (rGap >= GAP_THRESHOLD) {
                                gridFrames.push({ x: rStart, y: rowSeg.y, w: x - rGap - rStart + 1, h: rowSeg.h });
                                rInSeg = false; rGap = 0;
                            }
                        }
                    }
                }
                if (rInSeg) gridFrames.push({ x: rStart, y: rowSeg.y, w: width - rStart - rGap, h: rowSeg.h });
            }
            if (gridFrames.length >= 4) {
                frameCache[cacheKey] = gridFrames;
                return gridFrames;
            }
        }
    }

    // Ensure we have at least 4 frames by uniform splitting as fallback
    if (frames.length < 4) {
        const avgStart = frames.length > 0 ? frames[0].x : 0;
        const avgEnd = frames.length > 0 ? frames[frames.length - 1].x + frames[frames.length - 1].w : width;
        const sliceW = Math.floor((avgEnd - avgStart) / 4);
        const fallbackFrames = [];
        for (let i = 0; i < 4; i++) {
            fallbackFrames.push({
                x: avgStart + i * sliceW,
                y: cropMinY,
                w: sliceW,
                h: cropH,
            });
        }
        frameCache[cacheKey] = fallbackFrames;
        return fallbackFrames;
    }

    frameCache[cacheKey] = frames;
    return frames;
}

const SpriteHero = ({ heroClass = 'Warrior', active = false, size = 64 }) => {
    const canvasRef = useRef(null);
    const [processedSheet, setProcessedSheet] = useState(null);
    const [frames, setFrames] = useState(null);
    const frameIdxRef = useRef(0);
    const timerRef = useRef(null);

    const imgSrc = SPRITE_IMGS[heroClass] || SPRITE_IMGS.Warrior;

    // Load and process sprite sheet
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const processed = removeBackground(img);
            const detected = detectFrames(processed);
            setProcessedSheet(processed);
            setFrames(detected);
        };
        img.src = imgSrc;
    }, [imgSrc]);

    // Animate frames
    useEffect(() => {
        if (!processedSheet || !frames || !canvasRef.current) return;

        // Split detected frames: first half idle, second half attack
        const half = Math.floor(frames.length / 2);
        const idleFrames = frames.slice(0, half);
        const attackFrames = frames.slice(half);
        const currentFrames = active ? attackFrames : idleFrames;

        if (currentFrames.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Use GLOBAL max across ALL frames so idle and attack are the same size
        const globalMaxW = Math.max(...frames.map(f => f.w));
        const globalMaxH = Math.max(...frames.map(f => f.h));
        canvas.width = globalMaxW;
        canvas.height = globalMaxH;

        const draw = () => {
            const frame = currentFrames[frameIdxRef.current % currentFrames.length];
            ctx.clearRect(0, 0, globalMaxW, globalMaxH);
            // Center each frame within the uniform canvas
            const dx = Math.floor((globalMaxW - frame.w) / 2);
            const dy = Math.floor((globalMaxH - frame.h) / 2);
            ctx.drawImage(processedSheet, frame.x, frame.y, frame.w, frame.h, dx, dy, frame.w, frame.h);
        };

        frameIdxRef.current = 0;
        draw();

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            frameIdxRef.current = (frameIdxRef.current + 1) % currentFrames.length;
            draw();
        }, active ? 200 : 400);

        return () => clearInterval(timerRef.current);
    }, [processedSheet, frames, heroClass, active]);

    // Calculate display size using GLOBAL max so idle and attack are the same visual size
    let displayW = size;
    let displayH = size;
    if (frames && frames.length > 0) {
        const globalMaxW = Math.max(...frames.map(f => f.w));
        const globalMaxH = Math.max(...frames.map(f => f.h));
        // Scale to fit within size x size box (use the tighter constraint)
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

export default SpriteHero;
