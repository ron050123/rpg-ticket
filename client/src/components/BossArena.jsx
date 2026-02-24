import React from 'react';
import './BossArena.css';

const BossArena = ({ boss }) => {
    if (!boss) {
        return (
            <div className="boss-arena boss-arena--empty">
                <div className="arena-bg">
                    <div className="arena-stars">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} className="star" style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`
                            }} />
                        ))}
                    </div>
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

    return (
        <div className={`boss-arena ${isDefeated ? 'boss-arena--defeated' : ''} ${isLowHP ? 'boss-arena--rage' : ''}`}>
            <div className="arena-bg">
                {/* Animated stars/particles */}
                <div className="arena-stars">
                    {Array.from({ length: 25 }).map((_, i) => (
                        <div key={i} className="star" style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`
                        }} />
                    ))}
                </div>

                {/* Ground / Platform */}
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

                {/* The Boss Sprite */}
                <div className={`boss-sprite-container ${isDefeated ? 'defeated' : ''}`}>
                    {boss.image_url ? (
                        <img
                            src={boss.image_url}
                            alt={boss.name}
                            className="boss-sprite boss-sprite--custom"
                        />
                    ) : (
                        <div className="boss-sprite boss-sprite--default">
                            {/* CSS Pixel Art Dragon */}
                            <div className="pixel-dragon">
                                <div className="dragon-body" />
                                <div className="dragon-wing dragon-wing--left" />
                                <div className="dragon-wing dragon-wing--right" />
                                <div className="dragon-eye dragon-eye--left" />
                                <div className="dragon-eye dragon-eye--right" />
                                <div className="dragon-horn dragon-horn--left" />
                                <div className="dragon-horn dragon-horn--right" />
                                <div className="dragon-mouth" />
                                <div className="dragon-tail" />
                                {/* Fire breath particles */}
                                {!isDefeated && (
                                    <div className="dragon-fire">
                                        <div className="fire-particle fire-1" />
                                        <div className="fire-particle fire-2" />
                                        <div className="fire-particle fire-3" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

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
                </div>

                {/* Rage aura for low HP */}
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
