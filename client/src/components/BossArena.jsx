import React, { useMemo } from 'react';
import SpriteHero from './SpriteHero';
import SpriteBoss from './SpriteBoss';
import './BossArena.css';

const BossArena = ({ boss, userClass }) => {
    // Memoize stars so they don't re-randomize on each render
    const stars = useMemo(() => Array.from({ length: 25 }).map((_, i) => ({
        key: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
    })), []);

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

    // Determine boss animation state
    const bossState = isDefeated ? 'defeated' : isLowHP ? 'rage' : 'idle';

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

                {/* HP Bar */}
                <div className="arena-hp-bar-container">
                    <div className="arena-hp-label">HP</div>
                    <div className="arena-hp-bar">
                        <div
                            className={`arena-hp-fill ${isLowHP ? 'hp-low' : ''}`}
                            style={{ width: `${hpPercent}%` }}
                        />
                    </div>
                    <div className="arena-hp-text">{boss.current_hp}/{boss.total_hp}</div>
                </div>

                {/* ===== BATTLE SCENE ===== */}
                <div className="battle-scene">
                    {/* Hero on the left */}
                    {userClass && (
                        <div className={`battle-hero ${isDefeated ? 'hero-victory' : 'hero-fighting'}`}>
                            <SpriteHero
                                heroClass={userClass}
                                active={!isDefeated}
                                size={150}
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
                    <div className={`battle-boss ${isDefeated ? 'boss-fallen' : ''}`}>
                        {boss.image_url ? (
                            <img
                                src={boss.image_url}
                                alt={boss.name}
                                className="boss-sprite boss-sprite--custom"
                            />
                        ) : (
                            <SpriteBoss state={bossState} size={260} />
                        )}
                    </div>
                </div>

                {/* Defeated overlay */}
                {isDefeated && (
                    <div className="defeated-overlay">
                        <span className="defeated-text">DEFEATED</span>
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
