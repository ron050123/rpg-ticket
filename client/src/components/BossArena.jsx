import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import CustomHero from './CustomHero';
import SpriteBoss from './SpriteBoss';
import SpriteCreep from './SpriteCreep';
import bossProjectile from '../assets/boss_projectile.png';
import './BossArena.css';

const BossArena = ({ boss, appearance, tasks = [] }) => {
    // Memoize stars so they don't re-randomize on each render
    const stars = useMemo(() => Array.from({ length: 25 }).map((_, i) => ({
        key: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
    })), []);

    // Filter tasks for this boss to render as creeps
    const creepTasks = useMemo(() => tasks.filter(t => t.boss_id === (boss ? boss.id : null)), [tasks, boss]);

    // Track previous HP to detect hits
    const prevHpRef = useRef(null);
    const [isHurt, setIsHurt] = useState(false);

    // Projectile state
    const [projectileFiring, setProjectileFiring] = useState(false);
    const projectileTimerRef = useRef(null);

    const handleBossAttack = useCallback(() => {
        // Fire a projectile from boss toward hero
        setProjectileFiring(true);
        if (projectileTimerRef.current) clearTimeout(projectileTimerRef.current);
        // Projectile flies for ~800ms then disappears
        projectileTimerRef.current = setTimeout(() => setProjectileFiring(false), 800);
    }, []);

    // Detect HP drops to trigger hurt animation
    useEffect(() => {
        if (!boss) return;
        if (prevHpRef.current !== null && boss.current_hp < prevHpRef.current && boss.current_hp > 0) {
            setIsHurt(true);
            // Hurt lasts for the duration of the hurt animation (~600ms for 3 frames at 200ms)
            const timer = setTimeout(() => setIsHurt(false), 700);
            return () => clearTimeout(timer);
        }
        prevHpRef.current = boss.current_hp;
    }, [boss?.current_hp]);

    // Cleanup projectile timer on unmount
    useEffect(() => {
        return () => { if (projectileTimerRef.current) clearTimeout(projectileTimerRef.current); };
    }, []);

    if (!boss) {
        return (
            <div className="boss-arena boss-arena--empty">
                <div className="arena-bg">
                    <div className="arena-stars">
                        {stars.map(s => (
                            <div key={s.key} className="star" style={{ left: s.left, top: s.top, animationDelay: s.delay }} />
                        ))}
                    </div>
                    <div className="arena-ground" />
                    <div className="arena-message">
                        <span className="arena-message-text">No Boss Active</span>
                        <span className="arena-message-sub">The realm is at peace... for now.</span>
                    </div>
                </div>
            </div>
        );
    }

    const hpPercent = boss.total_hp > 0 ? (boss.current_hp / boss.total_hp) * 100 : 0;
    const isDefeated = boss.current_hp === 0;
    const isLowHP = hpPercent > 0 && hpPercent <= 30;

    // Check if any quest/task is actively being worked on
    const hasActiveQuests = tasks.some(t => t.boss_id === boss.id && t.status === 'IN_PROGRESS');

    // Determine boss animation state:
    // defeated > hurt > active (has quests in progress) > idle
    let bossState = 'idle';
    if (isDefeated) {
        bossState = 'defeated';
    } else if (isHurt) {
        bossState = 'hurt';
    } else if (hasActiveQuests) {
        bossState = 'active';
    }

    return (
        <div className={`boss-arena ${isDefeated ? 'boss-arena--defeated' : ''} ${isLowHP ? 'boss-arena--rage' : ''}`}>
            <div className="arena-bg">
                {/* Stars */}
                <div className="arena-stars">
                    {stars.map(s => (
                        <div key={s.key} className="star" style={{ left: s.left, top: s.top, animationDelay: s.delay }} />
                    ))}
                </div>

                {/* Ground platform */}
                <div className="arena-ground" />

                {/* Boss Name Banner */}
                <div className="arena-boss-name">
                    <span>{boss.name}</span>
                </div>


                {/* ===== BATTLE SCENE ===== */}
                <div className="battle-scene" style={{ position: 'relative' }}>
                    
                    {/* Render Creeps around the Boss */}
                    {!isDefeated && creepTasks.map((t, idx) => {
                        const count = creepTasks.length;
                        const angle = (idx / count) * 2 * Math.PI;
                        const radiusX = 220;
                        const radiusY = 100;
                        const centerX = 200; // Center relative to battle-boss container
                        const centerY = 0;
                        const x = centerX + Math.cos(angle) * radiusX;
                        const y = centerY + Math.sin(angle) * radiusY;

                        return (
                            <div key={t.id} style={{
                                position: 'absolute',
                                right: `${15 + (x/5)}%`,
                                bottom: `${25 + (y/5)}%`,
                                zIndex: Math.floor(y) + 50,
                                transform: 'translate(50%, 50%)'
                            }}>
                                <SpriteCreep type={t.creep_visual} status={t.status} size={80} />
                                {t.status !== 'DONE' && (
                                    <div style={{
                                        position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)',
                                        backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.6rem',
                                        padding: '1px 4px', borderRadius: '3px', whiteSpace: 'nowrap', border: '1px solid #555'
                                    }}>
                                        {t.title.length > 15 ? t.title.substring(0, 15) + '...' : t.title}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Hero on the left */}
                    {appearance && (
                        <div className={`battle-hero ${isDefeated ? 'hero-victory' : 'hero-fighting'}`}>
                            <CustomHero
                                appearance={appearance}
                                active={!isDefeated}
                                size={220}
                            />
                            {/* Attack slash effect */}
                            {!isDefeated && (
                                <div className="attack-effects">
                                    <div className="slash slash-1" />
                                    <div className="slash slash-2" />
                                    <div className="slash slash-3" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Boss on the right */}
                    <div className={`battle-boss ${isDefeated ? 'boss-fallen' : ''}`} style={{ zIndex: 10 }}>
                        {boss.image_url && boss.image_url.startsWith('http') ? (
                            <img
                                src={boss.image_url}
                                alt={boss.name}
                                className="boss-sprite boss-sprite--custom"
                            />
                        ) : (
                            <SpriteBoss state={bossState} size={380} onAttack={handleBossAttack} />
                        )}

                        {/* Projectile */}
                        {projectileFiring && (
                            <img
                                src={bossProjectile}
                                alt="fireball"
                                className="boss-projectile"
                            />
                        )}
                    </div>

                    {/* Defeated text centered over the battle */}
                    {isDefeated && (
                        <span className="defeated-text defeated-text-inline">DEFEATED</span>
                    )}
                </div>

                {/* Defeated sparkles overlay */}
                {isDefeated && (
                    <div className="defeated-overlay">
                        <div className="defeated-sparkles">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="sparkle" style={{
                                    animationDelay: `${i * 0.2}s`,
                                    left: `${20 + Math.random() * 60}%`,
                                    top: `${20 + Math.random() * 60}%`
                                }} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Rage aura */}
                {isLowHP && !isDefeated && (
                    <div className="rage-aura">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rage-particle" style={{
                                animationDelay: `${i * 0.3}s`,
                                left: `${30 + Math.random() * 40}%`
                            }} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BossArena;
