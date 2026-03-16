import React, { useRef, useEffect, useState, useMemo } from 'react';
import { HEAD_IMGS, BODY_IMGS, WEAPON_IMGS } from './CharacterParts';

// Standard canvas size for modular parts
const CW = 512;
const CH = 512;

const CustomHero = ({ appearance, active = false, size = 128 }) => {
    const canvasRef = useRef(null);
    const frameIdx = useRef(0);
    const [imagesLoaded, setImagesLoaded] = useState({});

    const app = useMemo(() => appearance || {
        head: 'knight_helm',
        body: 'plate_armor',
        weapon: 'broadsword'
    }, [appearance]);

    // Load images
    useEffect(() => {
        const parts = {
            head: HEAD_IMGS[app.head],
            body: BODY_IMGS[app.body],
            weapon: WEAPON_IMGS[app.weapon]
        };

        const loaded = {};
        let loadedCount = 0;
        const totalToLoad = Object.values(parts).filter(Boolean).length;

        if (totalToLoad === 0) {
            setImagesLoaded({});
            return;
        }

        Object.entries(parts).forEach(([key, src]) => {
            if (!src) return;
            const img = new Image();
            img.src = src;
            img.onload = () => {
                loaded[key] = img;
                loadedCount++;
                if (loadedCount === totalToLoad) {
                    setImagesLoaded(loaded);
                }
            };
        });
    }, [app]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            ctx.clearRect(0, 0, CW, CH);

            // Simple bobbing animation
            const bobOffset = active ? (Math.sin(Date.now() / 150) * 10) : 0;

            // Drawing order: Body -> Head -> Weapon
            // We assume AI generated images are already aligned correctly in their 512x512 space
            if (imagesLoaded.body) ctx.drawImage(imagesLoaded.body, 0, bobOffset, CW, CH);
            if (imagesLoaded.head) ctx.drawImage(imagesLoaded.head, 0, bobOffset, CW, CH);
            if (imagesLoaded.weapon) ctx.drawImage(imagesLoaded.weapon, 0, bobOffset, CW, CH);
        };

        let animationFrame;
        const render = () => {
            draw();
            animationFrame = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrame);
    }, [imagesLoaded, active]);

    return (
        <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                imageRendering: 'pixelated',
                display: 'block',
                margin: '0 auto',
                filter: 'drop-shadow(4px 4px 0px rgba(0,0,0,0.2))'
            }}
        />
    );
};

export default CustomHero;
