import React, { useRef, useEffect, useState, useCallback } from 'react';
import bossIdle from '../assets/boss_idle.png';
import bossAttack from '../assets/boss_attack.png';
import bossDeath from '../assets/boss_death.png';
import bossHurt from '../assets/boss_hurt.png';
import bossFlying from '../assets/boss_flying.png';

/*
  Boss sprite with animation state machine.
  States:
    - idle:     plays IDLE loop (no quest active)
    - active:   cycles FLYING → ATTACK → FLYING → ATTACK ... (quest in progress)
    - hurt:     plays HURT once, then returns to active cycle
    - defeated: plays DEATH once, stops on last frame
*/

const SHEETS = {
    idle:    { src: bossIdle,   frames: 4, speed: 250 },
    flying:  { src: bossFlying, frames: 4, speed: 200 },
    attack:  { src: bossAttack, frames: 8, speed: 120 },
    hurt:    { src: bossHurt,   frames: 3, speed: 200 },
    death:   { src: bossDeath,  frames: 8, speed: 200 },
};

// Cache loaded images
const imageCache = {};
function loadImage(src) {
    if (imageCache[src]) return Promise.resolve(imageCache[src]);
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { imageCache[src] = img; resolve(img); };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

const SpriteBoss = ({ state = 'idle', size = 160, onAttack }) => {
    const canvasRef = useRef(null);
    const frameIdxRef = useRef(0);
    const timerRef = useRef(null);
    // Internal animation key: which sheet is currently playing
    const [animKey, setAnimKey] = useState('idle');
    // Track the active cycle position: 'flying' or 'attack'
    const cycleRef = useRef('flying');
    // Loaded image data for the current animation
    const [sheetData, setSheetData] = useState(null);

    // Determine what internal animation to play based on the external state
    useEffect(() => {
        if (state === 'defeated') {
            setAnimKey('death');
        } else if (state === 'hurt') {
            setAnimKey('hurt');
        } else if (state === 'active') {
            // Start the flying/attack cycle
            cycleRef.current = 'flying';
            setAnimKey('flying');
        } else {
            setAnimKey('idle');
        }
    }, [state]);

    // Load the sprite sheet when animKey changes
    useEffect(() => {
        const sheet = SHEETS[animKey];
        if (!sheet) return;
        let cancelled = false;
        loadImage(sheet.src).then(img => {
            if (!cancelled && img) {
                setSheetData({
                    img,
                    frameW: Math.floor(img.naturalWidth / sheet.frames),
                    frameH: img.naturalHeight,
                    frameCount: sheet.frames,
                    speed: sheet.speed,
                    key: animKey,
                });
            }
        });
        return () => { cancelled = true; };
    }, [animKey]);

    // Callback: advance to next animation in cycle
    const onAnimComplete = useCallback(() => {
        if (state === 'hurt') {
            // After hurt, go back to the active cycle
            cycleRef.current = 'flying';
            setAnimKey('flying');
        } else if (state === 'active') {
            // Toggle between flying and attack
            if (cycleRef.current === 'flying') {
                cycleRef.current = 'attack';
                setAnimKey('attack');
                // Notify parent that an attack is starting
                if (onAttack) onAttack();
            } else {
                cycleRef.current = 'flying';
                setAnimKey('flying');
            }
        }
        // idle and defeated don't cycle
    }, [state, onAttack]);

    // Animate the current sheet
    useEffect(() => {
        if (!sheetData || !canvasRef.current) return;

        const { img, frameW, frameH, frameCount, speed, key } = sheetData;
        const canvas = canvasRef.current;
        canvas.width = frameW;
        canvas.height = frameH;
        const ctx = canvas.getContext('2d');

        frameIdxRef.current = 0;

        const draw = () => {
            const idx = frameIdxRef.current % frameCount;
            ctx.clearRect(0, 0, frameW, frameH);
            ctx.drawImage(img, idx * frameW, 0, frameW, frameH, 0, 0, frameW, frameH);
        };

        draw();
        if (timerRef.current) clearInterval(timerRef.current);

        const isOneShot = key === 'death' || key === 'hurt' ||
            (state === 'active' && (key === 'flying' || key === 'attack'));

        if (isOneShot) {
            // Play once through, then trigger callback
            timerRef.current = setInterval(() => {
                if (frameIdxRef.current < frameCount - 1) {
                    frameIdxRef.current++;
                    draw();
                } else {
                    clearInterval(timerRef.current);
                    if (key !== 'death') {
                        onAnimComplete();
                    }
                }
            }, speed);
        } else {
            // Loop (idle)
            timerRef.current = setInterval(() => {
                frameIdxRef.current = (frameIdxRef.current + 1) % frameCount;
                draw();
            }, speed);
        }

        return () => clearInterval(timerRef.current);
    }, [sheetData, state, onAnimComplete]);

    // Calculate display dimensions
    let displayW = size;
    let displayH = size;
    if (sheetData) {
        const scale = size / sheetData.frameW;
        displayH = Math.round(sheetData.frameH * scale);
    }

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: `${displayW}px`,
                height: `${displayH}px`,
                imageRendering: 'pixelated',
                display: 'block',
            }}
        />
    );
};

export default SpriteBoss;
