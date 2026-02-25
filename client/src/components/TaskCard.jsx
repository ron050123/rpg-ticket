import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const TaskCard = ({ task, onMove, users, onNotify }) => {
    const { user } = useAuth();
    const [showSubForm, setShowSubForm] = useState(false);
    const [subTask, setSubTask] = useState({ title: '', difficulty: '', assigned_to: '', description: '' });

    // Side quest edit state
    const [editingSideQuestId, setEditingSideQuestId] = useState(null);
    const [sideQuestEditData, setSideQuestEditData] = useState({ title: '', xp_reward: 0, assigned_to: '', description: '' });

    // Completion State
    const [showCompleteForm, setShowCompleteForm] = useState(false);
    const [completionComment, setCompletionComment] = useState('');
    const [adminReply, setAdminReply] = useState('');

    // Edit State
    const [isEditMode, setIsEditMode] = useState(false);
    // Determine effective lead ID: prefer assigned_to, fallback to first assignee
    const leadId = task.assigned_to ? parseInt(task.assigned_to) : (task.Assignees && task.Assignees.length > 0 ? task.Assignees[0].id : null);
    const [editData, setEditData] = useState({
        title: task.title,
        boss_damage: task.boss_damage,
        xp_reward: task.xp_reward,
        priority: task.priority,
        label: task.label || 'FEATURE',
        description: task.description || '',
        deadline: (task.deadline && !isNaN(new Date(task.deadline).getTime())) ? new Date(task.deadline).toISOString().split('T')[0] : '',
        lead_assignee: leadId,
        associate_ids: task.Assignees ? task.Assignees.filter(u => u.id !== leadId).map(u => u.id) : []
    });

    const isAssigned = (task.Assignees && task.Assignees.length > 0) || !!task.User;
    const isMine = (task.Assignees && task.Assignees.some(u => u.id === user?.id)) || (task.User?.id === user?.id);
    const isAdmin = user.role === 'ADMIN';
    const isLeadAssignee = task.assigned_to === user?.id;

    // Subtasks are nested in task.SubTasks
    const subTasks = task.SubTasks || [];

    let badgeClass = 'is-primary';
    if (task.priority === 'HIGH') badgeClass = 'is-error';
    if (task.priority === 'LOW') badgeClass = 'is-success';

    const handleAddSubTask = async (e) => {
        e.preventDefault();
        try {
            await api.createTask({
                title: subTask.title,
                difficulty: subTask.difficulty, // Legacy
                xp_reward: subTask.difficulty, // Side quests give XP based on "points"
                boss_damage: 0, // Side quests don't damage boss directly usually, or maybe small amount? User said "Points to XP", so 0 dmg for now.
                priority: 'MEDIUM', // Default
                label: 'FEATURE', // Default
                boss_id: task.boss_id,
                assignee_ids: subTask.assigned_to ? [parseInt(subTask.assigned_to)] : [], // Fix: use assignee_ids array
                parent_task_id: task.id,
                description: subTask.description || null
            });
            setShowSubForm(false);
            setSubTask({ title: '', difficulty: '', assigned_to: '', description: '' });
        } catch (err) {
            alert(err.message);
        }
    };

    const handleMarkAsDone = async (e) => {
        e.preventDefault();
        try {
            // Call API with PENDING_REVIEW status and comment
            // We use api.updateTask(taskId, data)
            await api.updateTask(task.id, {
                status: 'PENDING_REVIEW',
                completion_comment: completionComment
            });
            setShowCompleteForm(false);
            setCompletionComment('');
        } catch (err) {
            alert('Failed to submit: ' + err.message);
        }
    };

    const handleAdminComplete = async () => {
        if (!isAdmin) return;
        try {
            await onMove(task.id, 'DONE', adminReply);
            setAdminReply('');
        } catch (err) {
            alert('Failed to complete: ' + err.message);
        }
    };

    const handleAdminDeny = async () => {
        if (!isAdmin) return;
        if (!adminReply.trim()) {
            alert('Please provide a reason for denial.');
            return;
        }
        try {
            await onMove(task.id, 'IN_PROGRESS', adminReply);
            setAdminReply('');
        } catch (err) {
            alert('Failed to deny: ' + err.message);
        }
    };

    const handleComplete = async () => {
        try {
            await onMove(task.id, 'PENDING_REVIEW', completionComment);
            setShowCompleteForm(false);
            setCompletionComment('');
        } catch (err) {
            alert('Failed to submit for review: ' + err.message);
        }
    };

    const handleSaveEdit = async () => {
        if (!isAdmin) return;
        try {
            // Combine lead and associates into assignee_ids
            const assignee_ids = [];
            if (editData.lead_assignee) assignee_ids.push(parseInt(editData.lead_assignee));
            editData.associate_ids.forEach(id => assignee_ids.push(parseInt(id)));

            await api.updateTask(task.id, { ...editData, assignee_ids });
            setIsEditMode(false);
        } catch (err) {
            alert('Failed to update quest: ' + err.message);
        }
    };

    const handleCancelEdit = () => {
        const leadId = task.assigned_to || (task.Assignees && task.Assignees.length > 0 ? task.Assignees[0].id : null);
        setEditData({
            title: task.title,
            boss_damage: task.boss_damage,
            xp_reward: task.xp_reward,
            priority: task.priority,
            label: task.label,
            description: task.description || '',
            deadline: task.deadline ? task.deadline.split('T')[0] : '',
            lead_assignee: leadId,
            associate_ids: task.Assignees ? task.Assignees.filter(u => u.id !== leadId).map(u => u.id) : []
        });
        setIsEditMode(false);
    };

    const handleDelete = async () => {
        if (!isAdmin) return;
        if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return;
        try {
            await api.deleteTask(task.id);
            // Parent component will handle UI update via socket event
        } catch (err) {
            console.error('Delete error:', err);
            const errorMsg = err.message || err.error || JSON.stringify(err);
            alert('Failed to delete quest: ' + errorMsg);
        }
    };

    const handleTogglePublic = async () => {
        if (!isAdmin) return;
        try {
            await api.updateTask(task.id, { is_public: !task.is_public });
        } catch (err) {
            console.error('Toggle visibility error:', err);
        }
    };

    const handleEditSideQuest = (sideQuest) => {
        setEditingSideQuestId(sideQuest.id);
        setSideQuestEditData({
            title: sideQuest.title,
            xp_reward: sideQuest.xp_reward || sideQuest.difficulty,
            assigned_to: sideQuest.assigned_to || (sideQuest.Assignees && sideQuest.Assignees.length > 0 ? sideQuest.Assignees[0].id : ''),
            description: sideQuest.description || ''
        });
    };

    const handleSaveSideQuestEdit = async () => {
        if (!editingSideQuestId) return;
        try {
            const assignee_ids = sideQuestEditData.assigned_to ? [parseInt(sideQuestEditData.assigned_to)] : [];
            await api.updateTask(editingSideQuestId, {
                title: sideQuestEditData.title,
                xp_reward: parseInt(sideQuestEditData.xp_reward),
                description: sideQuestEditData.description,
                assignee_ids
            });
            setEditingSideQuestId(null);
            setSideQuestEditData({ title: '', xp_reward: 0, assigned_to: '', description: '' });
        } catch (err) {
            console.error('Update side quest error:', err);
            const errorMsg = err.error || err.message || JSON.stringify(err);
            alert('Failed to update side quest: ' + errorMsg);
        }
    };

    const handleCancelSideQuestEdit = () => {
        setEditingSideQuestId(null);
        setSideQuestEditData({ title: '', xp_reward: 0, assigned_to: '', description: '' });
    };

    const darkInputStyle = { backgroundColor: '#333', color: '#fff', borderColor: '#fff' };

    // Details Modal State
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');

    // Load comments when modal opens
    React.useEffect(() => {
        if (showDetailsModal) {
            loadComments();
        }
    }, [showDetailsModal]);

    const loadComments = async () => {
        try {
            const data = await api.getComments(task.id);
            setComments(data);
        } catch (err) {
            console.error('Failed to load comments:', err);
        }
    };

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            await api.createComment(task.id, newComment);
            setNewComment('');
            loadComments(); // Refresh list
        } catch (err) {
            alert('Failed to post comment: ' + err.message);
        }
    };

    // Helper to render Mark Done Action
    const renderMainAction = () => {
        if (task.status === 'DONE') {
            if (isAdmin || isLeadAssignee) {
                return (
                    <button className="nes-btn is-warning is-small" onClick={() => onMove(task.id, 'IN_PROGRESS')}>
                        Reopen
                    </button>
                );
            }
            return null;
        }

        if (task.status === 'PENDING_REVIEW') {
            return (
                <div style={{ padding: '0.5rem', backgroundColor: '#f0f0f0', borderRadius: '4px', border: '2px solid #ccc' }}>
                    <span className="nes-text is-warning" style={{ display: 'block', marginBottom: '0.5rem' }}>Pending Review...</span>
                    {task.completion_comment && (
                        <div style={{ fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: '#fff', borderRadius: '4px' }}>
                            <strong>Proof of Work:</strong><br />
                            "{task.completion_comment}"
                        </div>
                    )}

                    {isAdmin ? (
                        <div>
                            <textarea
                                className="nes-textarea"
                                placeholder="Add your feedback (required for deny)..."
                                value={adminReply}
                                onChange={e => setAdminReply(e.target.value)}
                                style={{ height: '3rem', minHeight: '3rem', marginBottom: '0.5rem', fontSize: '0.8rem', ...darkInputStyle }}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="nes-btn is-success is-small" onClick={handleAdminComplete}>
                                    ✓ Approve
                                </button>
                                <button className="nes-btn is-error is-small" onClick={handleAdminDeny}>
                                    ✕ Deny
                                </button>
                            </div>
                        </div>
                    ) : (
                        <span style={{ fontSize: '0.7rem' }}>Waiting for GM...</span>
                    )}
                </div>
            );
        }

        // TODO or IN_PROGRESS
        if (isMine || isAdmin) {
            if (task.status === 'TODO') {
                return (
                    <button className="nes-btn is-warning is-small" onClick={() => onMove(task.id, 'IN_PROGRESS')}>
                        Start Quest
                    </button>
                );
            }
            if (task.status === 'IN_PROGRESS') {
                if (isAdmin) {
                    // Admin: feedback form, goes straight to DONE
                    if (showCompleteForm) {
                        return (
                            <div className="nes-container is-rounded is-dark" style={{ padding: '0.5rem' }}>
                                <p style={{ marginBottom: '0.5rem' }}>GM Feedback (optional):</p>
                                <textarea
                                    className="nes-textarea"
                                    value={adminReply}
                                    onChange={e => setAdminReply(e.target.value)}
                                    placeholder="Leave feedback for the team..."
                                    style={{ height: '3rem', minHeight: '3rem', marginBottom: '0.5rem', ...darkInputStyle }}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="nes-btn is-success is-small" onClick={handleAdminComplete}>Complete Quest</button>
                                    <button className="nes-btn is-small" onClick={() => { setShowCompleteForm(false); setAdminReply(''); }}>Cancel</button>
                                </div>
                            </div>
                        );
                    } else {
                        return (
                            <button className="nes-btn is-success is-small" onClick={() => setShowCompleteForm(true)}>
                                Mark as Done
                            </button>
                        );
                    }
                } else {
                    // Non-admin: proof of work form, goes to PENDING_REVIEW
                    if (showCompleteForm) {
                        return (
                            <div className="nes-container is-rounded is-dark" style={{ padding: '0.5rem' }}>
                                <p style={{ marginBottom: '0.5rem' }}>Proof of work:</p>
                                <textarea
                                    className="nes-textarea"
                                    value={completionComment}
                                    onChange={e => setCompletionComment(e.target.value)}
                                    style={{ height: '3rem', minHeight: '3rem', marginBottom: '0.5rem', ...darkInputStyle }}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="nes-btn is-success is-small" onClick={handleComplete}>Submit</button>
                                    <button className="nes-btn is-small" onClick={() => setShowCompleteForm(false)}>Cancel</button>
                                </div>
                            </div>
                        );
                    } else {
                        return (
                            <button className="nes-btn is-success is-small" onClick={() => setShowCompleteForm(true)}>
                                Mark as Done
                            </button>
                        );
                    }
                }
            }
        }

        // Don't show any action button for TODO tasks
        return null;
    };


    // Don't render edit mode for DONE tasks - Logic moved to inside return


    return (
        <div className="nes-container is-rounded" style={{ marginBottom: '0.75rem', padding: '0.75rem', position: 'relative', backgroundColor: 'rgba(15, 15, 50, 0.9)', borderColor: '#5a5a9a', color: '#e0e0ff', fontSize: '0.75rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <span
                        style={{ fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', color: '#209cee', fontSize: '0.85rem' }}
                        onClick={() => setShowDetailsModal(true)}
                        title="Click for Details"
                    >
                        {task.title}
                    </span>
                    {task.is_public && <span className="nes-text is-success" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>(Public)</span>}
                    <div style={{ marginTop: '0.25rem' }}>
                        <span className={`nes-badge ${badgeClass}`} style={{ transform: 'scale(0.75)', transformOrigin: 'left center', display: 'inline-block' }}>
                            <span className="is-dark" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>{task.boss_damage} DMG</span>
                        </span>
                    </div>
                </div>
                {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexShrink: 0 }}>
                        <button
                            className="nes-btn is-warning is-small"
                            onClick={handleTogglePublic}
                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}
                            title={task.is_public ? 'Make Private' : 'Make Public'}
                        >
                            {task.is_public ? '🔓' : '🔒'}
                        </button>
                        {task.status !== 'DONE' && (
                            <button className="nes-btn is-primary is-small" onClick={() => setIsEditMode(true)} style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}>
                                Edit
                            </button>
                        )}
                        <button
                            className="nes-btn is-error is-small"
                            onClick={handleDelete}
                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>



            {/* Description */}
            {task.description && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', fontStyle: 'italic', color: '#555', borderLeft: '3px solid #ddd', paddingLeft: '0.5rem' }}>
                    {task.description.length > 50 ? task.description.substring(0, 50) + '...' : task.description}
                </div>
            )}

            {/* Badges / Info */}
            <div style={{ fontSize: '0.8rem', marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                <span className="nes-text is-primary">#{task.label}</span>
                {task.priority === 'HIGH' && <span className="nes-text is-error" style={{ marginLeft: '0.5rem' }}>High Priority</span>}
                {task.priority === 'MEDIUM' && <span className="nes-text is-warning" style={{ marginLeft: '0.5rem' }}>Medium Priority</span>}
                {task.priority === 'LOW' && <span className="nes-text is-success" style={{ marginLeft: '0.5rem' }}>Low Priority</span>}
            </div>

            {/* Deadline */}
            {task.deadline && task.deadline !== '' && !isNaN(new Date(task.deadline).getTime()) && (
                <div style={{ fontSize: '0.75rem', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                    ⏰ Deadline: {new Date(task.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
            )}

            <div style={{ fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                {task.Assignees && task.Assignees.length > 0 ? (
                    <>
                        <div>
                            Lead Assignee: {task.Assignees.find(u => u.id === leadId)?.username || 'None'}
                        </div>
                        {task.Assignees.filter(u => u.id !== leadId).length > 0 && (
                            <div>
                                Associates: {task.Assignees.filter(u => u.id !== leadId).map(u => u.username).join(', ')}
                            </div>
                        )}
                    </>
                ) : 'Unassigned'}
            </div>

            {/* Show completion comments for DONE quests */}
            {task.status === 'DONE' && (task.completion_comment || task.admin_reply) && (
                <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                    {task.completion_comment && (
                        <div style={{ padding: '0.75rem', backgroundColor: '#e3f2fd', borderLeft: '4px solid #2196f3', marginBottom: '0.5rem', borderRadius: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <strong style={{ color: '#1976d2', fontSize: '0.9rem' }}>Proof of Work</strong>
                                {task.Assignees && task.Assignees.length > 0 && (
                                    <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                        by {task.Assignees[0].username}
                                    </span>
                                )}
                            </div>
                            <span style={{ color: '#000', fontSize: '0.9rem' }}>"{task.completion_comment}"</span>
                        </div>
                    )}
                    {task.admin_reply && (
                        <div style={{ padding: '0.75rem', backgroundColor: '#fff8e1', borderLeft: '4px solid #ffa726', borderRadius: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <strong style={{ color: '#f57c00', fontSize: '0.9rem' }}>GM Feedback</strong>
                                {task.AdminReplier && (
                                    <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                        by {task.AdminReplier.username}
                                    </span>
                                )}
                            </div>
                            <span style={{ color: '#000', fontSize: '0.9rem' }}>"{task.admin_reply}"</span>
                        </div>
                    )}
                </div>
            )}

            {/* Side Quests Area */}
            {subTasks.length > 0 && (
                <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem', borderTop: '2px dashed #ccc', paddingTop: '0.5rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Side Quests ({subTasks.filter(st => st.status === 'DONE').length}/{subTasks.length}):</p>
                    <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                        {subTasks.map(st => {
                            // ... existing side quest rendering (simplified for card view) ...
                            // Only show first 3 side quests in card to save space, rest in modal
                            if (subTasks.indexOf(st) >= 3 && !showDetailsModal) return null;

                            const isSubMine = st.assigned_to === user.id;
                            const isPending = st.status === 'PENDING_REVIEW';
                            const isDone = st.status === 'DONE';
                            const isEditingThis = editingSideQuestId === st.id;

                            if (isEditingThis) return null; // Logic handled in full list

                            return (
                                <li key={st.id} style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                                    <span>
                                        {isDone ? <s>{st.title}</s> : st.title}
                                        {isDone && <span className="nes-text is-success"> ✓</span>}
                                    </span>
                                </li>
                            );
                        })}
                        {subTasks.length > 3 && !showDetailsModal && (
                            <li style={{ listStyle: 'none', fontSize: '0.7rem', color: '#666', fontStyle: 'italic' }}>
                                ... and {subTasks.length - 3} more (click title for details)
                            </li>
                        )}
                    </ul>
                </div>
            )}



            {/* Main Actions */}
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '2px solid #4a4a8a', paddingTop: '0.5rem' }}>
                {renderMainAction()}
            </div>

            {/* DETAILS MODAL */}
            {showDetailsModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 1000
                }}>
                    <dialog className="nes-dialog is-rounded" open style={{ width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

                        {/* Header Area */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #ccc', paddingBottom: '1rem', marginBottom: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>{task.title} <span style={{ fontSize: '1rem', color: '#888' }}>#{task.id}</span></h2>
                                <span className={`nes-text ${task.status === 'DONE' ? 'is-success' : 'is-warning'}`}>
                                    In list: {task.status}
                                </span>
                            </div>
                            <button className="nes-btn is-error" onClick={() => setShowDetailsModal(false)}>X</button>
                        </div>

                        {/* 2-Column Layout */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', flex: 1 }}>

                            {/* LEFT COLUMN (Main Content) - roughly 70% */}
                            <div style={{ flex: '2 1 600px' }}>

                                {/* Description */}
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Description</h3>
                                    <div className="nes-container is-rounded" style={{ minHeight: '100px', backgroundColor: '#fff', color: '#000' }}>
                                        <p>{task.description || 'No description provided.'}</p>
                                    </div>
                                </div>

                                {/* Checklist / Side Quests */}
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Side Quests</h3>
                                        {/* Progress Bar could go here */}
                                        <span>{subTasks.filter(st => st.status === 'DONE').length}/{subTasks.length}</span>
                                    </div>



                                    <div className="nes-container is-rounded" style={{ backgroundColor: '#fff', color: '#000' }}>
                                        {subTasks.length === 0 ? <p>No side quests.</p> : (
                                            <ul className="nes-list is-circle" style={{ margin: 0, paddingLeft: '1.5rem' }}>
                                                {subTasks.map(st => (
                                                    <li key={st.id} style={{ marginBottom: '0.5rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ textDecoration: st.status === 'DONE' ? 'line-through' : 'none' }}>
                                                                {st.title} <span className="nes-text is-success">({st.xp_reward} XP)</span>
                                                            </span>
                                                            <span className={`nes-text ${st.status === 'DONE' ? 'is-success' : 'is-warning'}`}>{st.status}</span>
                                                        </div>
                                                        {st.description && <p style={{ fontSize: '0.8rem', fontStyle: 'italic', margin: '0.25rem 0 0.5rem' }}>{st.description}</p>}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {/* Add Item Input placeholder if needed */}
                                        {(isAdmin || isLeadAssignee) && (
                                            <div style={{ marginTop: '1rem', borderTop: '2px dashed #ccc', paddingTop: '0.5rem' }}>
                                                {!showSubForm ? (
                                                    <button className="nes-btn is-primary is-small" onClick={() => setShowSubForm(true)}>+ Add Side Quest <span>▼</span></button>
                                                ) : (
                                                    <div className="nes-container is-dark" style={{ padding: '0.5rem', marginTop: '0.5rem' }}>
                                                        <div className="nes-field">
                                                            <input placeholder="Title" className="nes-input is-small" value={subTask.title} onChange={e => setSubTask({ ...subTask, title: e.target.value })} style={darkInputStyle} />
                                                        </div>
                                                        <div className="nes-field" style={{ marginTop: '4px' }}>
                                                            <input type="number" placeholder="XP Reward" className="nes-input is-small" value={subTask.difficulty} onChange={e => setSubTask({ ...subTask, difficulty: parseInt(e.target.value) })} style={darkInputStyle} />
                                                        </div>
                                                        <div className="nes-select is-small" style={{ marginTop: '4px' }}>
                                                            <select value={subTask.assigned_to} onChange={e => setSubTask({ ...subTask, assigned_to: e.target.value })} style={darkInputStyle}>
                                                                <option value="">Hero...</option>
                                                                {users && users.map(u => (
                                                                    <option key={u.id} value={u.id}>{u.username}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                                                            <button className="nes-btn is-success is-small" onClick={handleAddSubTask}>Add</button>
                                                            <button className="nes-btn is-error is-small" onClick={() => setShowSubForm(false)}>Cancel</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Activity / Comments */}
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Activity</h3>
                                    <div className="nes-container is-rounded" style={{ backgroundColor: '#f0f0f0', color: '#000' }}>
                                        {/* Activity Timeline - Typed Comments (Proof of Work, Approvals, Denials) */}
                                        {comments.filter(c => c.type && c.type !== 'COMMENT').length > 0 ? (
                                            <div style={{ marginBottom: '1rem' }}>
                                                {comments.filter(c => c.type && c.type !== 'COMMENT').map(comment => {
                                                    let borderColor, bgColor, icon, label;
                                                    if (comment.type === 'PROOF_OF_WORK') {
                                                        borderColor = '#2196f3'; bgColor = '#e3f2fd'; icon = '📋'; label = 'Proof of Work';
                                                    } else if (comment.type === 'APPROVAL') {
                                                        borderColor = '#4caf50'; bgColor = '#e8f5e9'; icon = '✅'; label = 'GM Approved';
                                                    } else if (comment.type === 'DENIAL') {
                                                        borderColor = '#f44336'; bgColor = '#ffebee'; icon = '❌'; label = 'GM Denied';
                                                    } else {
                                                        return null;
                                                    }
                                                    return (
                                                        <div key={comment.id} style={{ marginBottom: '0.75rem', padding: '0.75rem', backgroundColor: bgColor, borderLeft: `4px solid ${borderColor}`, borderRadius: '4px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                                                <strong style={{ color: borderColor, fontSize: '0.9rem' }}>{icon} {label}</strong>
                                                                <span style={{ fontSize: '0.7rem', color: '#666' }}>
                                                                    {comment.User?.username || 'Unknown'} · {new Date(comment.createdAt).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <span style={{ color: '#000', fontSize: '0.9rem' }}>"{comment.content}"</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <>
                                                {/* Fallback: Show task-level proof/feedback if no typed comments exist */}
                                                {task.completion_comment && (
                                                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                                                        <i className="nes-icon coin is-small"></i>
                                                        <div>
                                                            <strong>Proof of Work</strong>
                                                            <p style={{ marginTop: '0.5rem', backgroundColor: '#fff', padding: '0.5rem', borderRadius: '4px' }}>"{task.completion_comment}"</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {task.admin_reply && (
                                                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                                                        <i className="nes-icon star is-small"></i>
                                                        <div>
                                                            <strong>GM Feedback</strong>
                                                            <p style={{ marginTop: '0.5rem', backgroundColor: '#fff', padding: '0.5rem', borderRadius: '4px' }}>"{task.admin_reply}"</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* REGULAR COMMENTS LIST */}
                                        {comments.filter(c => !c.type || c.type === 'COMMENT').length > 0 && (
                                            <div style={{ marginTop: '1rem', borderTop: '2px dashed #ccc', paddingTop: '1rem' }}>
                                                {comments.filter(c => !c.type || c.type === 'COMMENT').map(comment => (
                                                    <div key={comment.id} style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem' }}>
                                                        {/* Avatar */}
                                                        <div style={{ width: '30px', height: '30px', backgroundColor: '#bbb', borderRadius: '4px', flexShrink: 0 }}></div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{comment.User?.username || 'Unknown'} <span style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>({comment.User?.class})</span></span>
                                                                <span style={{ fontSize: '0.7rem', color: '#666' }}>{new Date(comment.createdAt).toLocaleString()}</span>
                                                            </div>
                                                            <div style={{ marginTop: '0.25rem', backgroundColor: '#fff', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', color: '#000' }}>
                                                                {comment.content}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {comments.length === 0 && !task.completion_comment && !task.admin_reply && <p style={{ fontStyle: 'italic', color: '#666' }}>No activity yet.</p>}

                                        {/* Comment Input */}
                                        {(isAssigned || isAdmin) && (
                                            <div style={{ marginTop: '1rem', borderTop: '2px solid #ccc', paddingTop: '1rem' }}>
                                                <form onSubmit={handlePostComment}>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <input
                                                            className="nes-input"
                                                            value={newComment}
                                                            onChange={e => setNewComment(e.target.value)}
                                                            placeholder="Leave a comment..."
                                                            style={{ flex: 1, color: '#000' }}
                                                        />
                                                        <button type="submit" className="nes-btn is-primary">Post</button>
                                                    </div>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>

                            {/* RIGHT COLUMN (Sidebar) - roughly 30% */}
                            <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                                {/* Suggested Actions */}
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Actions</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {/* Move Actions */}
                                        {isAdmin && task.status === 'TODO' && (
                                            <button className="nes-btn is-primary" onClick={() => onMove(task.id, 'IN_PROGRESS')}>Start Quest</button>
                                        )}
                                        {task.status === 'IN_PROGRESS' && (isAdmin || isMine) && (
                                            <button className="nes-btn is-success" onClick={() => setShowCompleteForm(true)}>Mark Done</button>
                                        )}
                                        {/* Edit/Delete moved here */}
                                        {isAdmin && (
                                            <>
                                                <button className="nes-btn" onClick={() => { setIsEditMode(true); setShowDetailsModal(false); }}>Edit Quest</button>
                                                <button className="nes-btn is-error" onClick={() => { handleDelete(); setShowDetailsModal(false); }}>Delete Quest</button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Assignees */}
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Heroes</p>
                                    {task.Assignees && task.Assignees.length > 0 ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {task.Assignees.map(u => (
                                                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: u.id === leadId ? '#f7d51d' : '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '2px solid #000', color: '#000' }}>
                                                    {/* Avatar placeholder or initials */}
                                                    <div style={{ width: '20px', height: '20px', backgroundColor: '#ccc', borderRadius: '50%' }}></div>
                                                    <span style={{ fontWeight: u.id === leadId ? 'bold' : 'normal' }}>{u.username}</span>
                                                    {u.id === leadId && <i className="nes-icon is-small star"></i>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <button className="nes-btn is-small">Validating for Heroes</button>
                                    )}
                                </div>

                                {/* Labels / Priority */}
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Tags</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <span className={`nes-badge`}>
                                            <span className="is-dark">{task.priority}</span>
                                        </span>
                                        <span className={`nes-badge`}>
                                            <span className="is-primary">{task.label}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Rewards */}
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Rewards</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <span className="nes-text is-success">{task.xp_reward || 0} XP</span>
                                        <span className="nes-text is-error">{task.boss_damage || 0} Boss DMG</span>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Dates</p>
                                    {task.deadline && !isNaN(new Date(task.deadline).getTime()) && (
                                        <div style={{ marginBottom: '0.5rem' }}>
                                            <span style={{ display: 'block', fontSize: '0.8rem' }}>Due Date:</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input type="checkbox" className="nes-checkbox" checked={false} readOnly />
                                                <span>{new Date(task.deadline).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ display: 'block', fontSize: '0.8rem' }}>Created:</span>
                                        <span style={{ color: '#888' }}>{new Date(task.createdAt || Date.now()).toLocaleDateString()}</span>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </dialog>
                </div>
            )}

            {/* Modal for Edit Quest */}
            {isEditMode && task.status !== 'DONE' && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="nes-container is-rounded is-white" style={{ backgroundColor: 'white', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0, color: '#000' }}>Edit Quest</h3>
                        <div className="nes-field">
                            <label style={{ color: '#000' }}>Title</label>
                            <input
                                className="nes-input"
                                value={editData.title}
                                onChange={e => setEditData({ ...editData, title: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <div className="nes-field" style={{ flex: 1 }}>
                                <label style={{ color: '#000' }}>Boss Damage</label>
                                <input
                                    type="number"
                                    className="nes-input"
                                    value={editData.boss_damage}
                                    onChange={e => setEditData({ ...editData, boss_damage: parseInt(e.target.value) })}
                                />
                            </div>
                            {task.parent_task_id && (
                                <div className="nes-field" style={{ flex: 1 }}>
                                    <label style={{ color: '#000' }}>XP Reward</label>
                                    <input
                                        type="number"
                                        className="nes-input"
                                        value={editData.xp_reward}
                                        onChange={e => setEditData({ ...editData, xp_reward: parseInt(e.target.value) })}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="nes-field" style={{ marginTop: '0.5rem' }}>
                            <label style={{ color: '#000' }}>Deadline (Optional)</label>
                            <input
                                type="date"
                                className="nes-input"
                                value={editData.deadline}
                                onChange={e => setEditData({ ...editData, deadline: e.target.value })}
                            />
                        </div>
                        <div className="nes-field" style={{ marginTop: '0.5rem' }}>
                            <label style={{ color: '#000' }}>Priority</label>
                            <div className="nes-select">
                                <select value={editData.priority} onChange={e => setEditData({ ...editData, priority: e.target.value })}>
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>
                        </div>
                        <div className="nes-field" style={{ marginTop: '0.5rem' }}>
                            <label style={{ color: '#000' }}>Type</label>
                            <div className="nes-select">
                                <select value={editData.label} onChange={e => setEditData({ ...editData, label: e.target.value })}>
                                    <option value="FEATURE">Feature</option>
                                    <option value="BUG">Bug</option>
                                    <option value="ENHANCEMENT">Enhancement</option>
                                </select>
                            </div>
                        </div>
                        <div className="nes-field" style={{ marginTop: '0.5rem' }}>
                            <label style={{ color: '#000' }}>Lead Assignee (Required)</label>
                            <div className="nes-select">
                                <select
                                    value={editData.lead_assignee || ''}
                                    onChange={e => setEditData({ ...editData, lead_assignee: e.target.value ? parseInt(e.target.value) : null })}
                                >
                                    <option value="">Select Lead...</option>
                                    {users && users.map(u => (
                                        <option key={u.id} value={u.id}>{u.username} ({u.class})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="nes-field" style={{ marginTop: '0.5rem' }}>
                            <label style={{ color: '#000' }}>Associates (Optional)</label>
                            <div style={{ maxHeight: '8rem', overflowY: 'auto', border: '2px solid #000', padding: '0.5rem' }}>
                                {users && users.filter(u => u.id !== editData.lead_assignee).map(u => (
                                    <div key={u.id} style={{ marginBottom: '0.25rem' }}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                className="nes-checkbox"
                                                checked={editData.associate_ids.includes(u.id)}
                                                onChange={() => {
                                                    const newIds = editData.associate_ids.includes(u.id)
                                                        ? editData.associate_ids.filter(id => id !== u.id)
                                                        : [...editData.associate_ids, u.id];
                                                    setEditData({ ...editData, associate_ids: newIds });
                                                }}
                                            />
                                            <span>{u.username} ({u.class})</span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="nes-field" style={{ marginTop: '0.5rem' }}>
                            <label style={{ color: '#000' }}>Description</label>
                            <textarea
                                className="nes-textarea"
                                value={editData.description}
                                onChange={e => setEditData({ ...editData, description: e.target.value })}
                                placeholder="Describe the quest..."
                                style={{ minHeight: '4rem' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                            <button className="nes-btn" onClick={handleCancelEdit}>Cancel</button>
                            <button className="nes-btn is-success" onClick={handleSaveEdit}>Save</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default TaskCard;
