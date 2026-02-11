import React from 'react';

const HPBar = ({ boss }) => {
    if (!boss) return <div className="nes-container is-dark">No Boss Active</div>;

    const percentage = Math.max(0, Math.min(100, (boss.current_hp / boss.total_hp) * 100));

    // Color change based on HP
    let progressClass = "is-success";
    if (percentage < 50) progressClass = "is-warning";
    if (percentage < 20) progressClass = "is-error";

    return (
        <div className="nes-container is-dark with-title">
            <p className="title">BOSS: {boss.name}</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                {boss.image_url && (
                    <img src={boss.image_url} alt="Boss" style={{ width: '64px', height: '64px', imageRendering: 'pixelated' }} />
                )}

                <div style={{ flex: 1 }}>
                    <progress className={`nes-progress ${progressClass}`} value={boss.current_hp} max={boss.total_hp}></progress>
                    <div style={{ textAlign: 'center' }}>
                        HP: {boss.current_hp} / {boss.total_hp}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HPBar;
