import React, { useState } from 'react';

const DungeonForge = ({ bossId, onForgeComplete }) => {
    const [markdown, setMarkdown] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const handleForge = async () => {
        if (!markdown.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5322/api'}/dungeons/forge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ markdownGuide: markdown, bossId })
            });

            if (!res.ok) throw await res.json();
            const data = await res.json();
            setResult(data);
            if (onForgeComplete) onForgeComplete(data);
        } catch (err) {
            setError(err.error || 'Failed to forge dungeon.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="nes-container is-rounded is-dark" style={{ marginTop: '2rem', backgroundColor: '#212529' }}>
            <h3 style={{ color: '#e76e55' }}>⚒️ AI Dungeon Forge</h3>
            <p style={{ fontSize: '0.8rem' }}>Paste your project guidelines (Markdown) here. The AI will split it into SCRUM tasks and auto-assign them to your party.</p>
            
            <div className="nes-field">
                <label htmlFor="markdown_field">Project Guidelines (Markdown)</label>
                <textarea 
                    id="markdown_field" 
                    className="nes-textarea" 
                    placeholder="### Task 1: Fix the UI...&#10;### Task 2: Implement Auth..." 
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    style={{ minHeight: '150px' }}
                />
            </div>

            {error && <p className="nes-text is-error">{error}</p>}

            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                <button 
                    className={`nes-btn is-primary ${loading ? 'is-disabled' : ''}`} 
                    onClick={handleForge}
                    disabled={loading}
                >
                    {loading ? 'Forging...' : 'Forge Tasks!'}
                </button>
            </div>

            {result && (
                <div className="nes-container is-rounded is-white" style={{ marginTop: '1rem', color: '#000' }}>
                    <p className="nes-text is-success">{result.message}</p>
                    <ul className="nes-list is-disc" style={{ textAlign: 'left', fontSize: '0.8rem' }}>
                        {result.tasks.map((t, idx) => (
                            <li key={idx}>
                                <strong>{t.title}</strong> - Difficulty: {t.difficulty}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default DungeonForge;