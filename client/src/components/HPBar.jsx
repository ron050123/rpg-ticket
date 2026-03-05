import React from 'react';

const HPBar = ({ boss }) => {
    if (!boss) return <div className="nes-container is-dark">No Boss Active</div>;

    const percentage = Math.max(0, Math.min(100, (boss.current_hp / boss.total_hp) * 100));

    // Determine tier color
    let tierColorClass = '';
    let tierText = '';
    if (boss.tier === 'Raid Boss') {
        tierColorClass = 'is-error'; // Red for Raid Boss
        tierText = 'Raid Boss';
    } else if (boss.tier === 'Mini-Boss') {
        tierColorClass = 'is-warning'; // Yellow for Mini-Boss
        tierText = 'Mini-Boss';
    } else {
        tierColorClass = 'is-success'; // Green for regular Boss or other
        tierText = 'Boss';
    }

    // Color change based on HP
    let progressClass = "is-success";
    if (percentage < 50) progressClass = "is-warning";
    if (percentage < 20) progressClass = "is-error";

    return (
        <div className="nes-container is-dark with-title">
            <p className="title">BOSS: {boss.name} <span className={`nes-text ${tierColorClass}`} style={{ fontSize: '0.7em' }}>[ {tierText} ]</span></p>

            <div>
                <progress className={`nes-progress ${progressClass}`} value={boss.current_hp} max={boss.total_hp}></progress>
                <div style={{ textAlign: 'center' }}>
                    HP: {boss.current_hp} / {boss.total_hp}
                </div>
            </div>
        </div>
    );
};

export default HPBar;
