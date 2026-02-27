import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from '../services/api';
import HPBar from '../components/HPBar';
import TaskCard from '../components/TaskCard';
import BossArena from '../components/BossArena';
import { useAuth } from '../context/AuthContext';

const socket = io('http://localhost:5322');

const BattleView = () => {
    const { user, updateUser } = useAuth();
    const [showRewards, setShowRewards] = useState(false);
    const [boss, setBoss] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [showBossForm, setShowBossForm] = useState(false);
    const [users, setUsers] = useState([]);
    const [notification, setNotification] = useState(null);
    const [rewards, setRewards] = useState([]);
    const [showRewardForm, setShowRewardForm] = useState(false);
    const [editingReward, setEditingReward] = useState(null);
    const [rewardFormData, setRewardFormData] = useState({ name: '', cost: 0, description: '', image_url: '' });
    const [showBossReminder, setShowBossReminder] = useState(false);
    const [showVictoryPopup, setShowVictoryPopup] = useState(false);
    const [victoryDismissed, setVictoryDismissed] = useState(false);

    const [allBosses, setAllBosses] = useState([]);
    const [selectedBossId, setSelectedBossId] = useState(null); // Track which boss is selected
    const [activeTab, setActiveTab] = useState('battle'); // 'battle' | 'timeline'

    // Notification system
    const [notifications, setNotifications] = useState([]);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const addNotification = (message, type = 'info') => {
        const notif = { id: Date.now() + Math.random(), message, type, time: new Date() };
        setNotifications(prev => [notif, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
    };

    // Form state
    const [newTask, setNewTask] = useState({
        title: '',
        difficulty: 10,
        xp_reward: 0, // Main quests give no XP directly
        boss_damage: 10,
        priority: 'MEDIUM',
        label: 'FEATURE',
        lead_assignee: '', // Single user ID for lead
        associate_ids: [], // Array of additional assignee IDs
        description: '',
        deadline: '' // Quest deadline
    });

    const [newBoss, setNewBoss] = useState({
        name: '',
        image_url: '',
        start_date: '',
        deadline: '',
        tasks: []
    });

    // Edit Boss State
    const [showEditBossForm, setShowEditBossForm] = useState(false);
    const [editBossData, setEditBossData] = useState({
        id: null,
        name: '',
        current_hp: 0,
        total_hp: 0,
        image_url: '',
        start_date: '',
        deadline: ''
    });

    // Initial Data Load
    useEffect(() => {
        loadData();
        loadUsers();
        loadAllBosses();
        loadRewards();
        loadNotifications();
    }, []);

    // Socket Listeners
    useEffect(() => {
        console.log("Setting up socket listeners");
        socket.on('connect', () => console.log('Connected to battle server'));
        socket.on('boss_updated', (updatedBoss) => {
            setBoss(prev => (prev && prev.id === updatedBoss.id ? updatedBoss : prev));
            loadAllBosses(); // Refresh list
        });
        socket.on('boss_created', (newBoss) => {
            setBoss(newBoss);
            loadAllBosses();
        });

        socket.on('task_created', (task) => {
            if (!task.parent_task_id) {
                setTasks(prev => [...prev, task]);
            }
            // Notify assignees about new assignment
            if (task.Assignees && task.Assignees.some(a => a.id === user.id)) {
                addNotification(`📋 You've been assigned to quest "${task.title}"`, 'assignment');
            }
            // Notify GM about new task creation
            if (user.role === 'ADMIN' && task.title) {
                addNotification(`📋 New quest created: "${task.title}"`, 'info');
            }
        });

        socket.on('task_updated', (updatedTask) => {
            setTasks(prev => {
                const oldTask = prev.find(t => t.id === updatedTask.id);
                // Generate notification if status changed
                if (oldTask && oldTask.status !== updatedTask.status) {
                    const isMyTask = updatedTask.Assignees && updatedTask.Assignees.some(a => a.id === user.id);
                    if (updatedTask.status === 'IN_PROGRESS') {
                        if (isMyTask || user.role === 'ADMIN') {
                            addNotification(`⚔️ Quest "${updatedTask.title}" is now in progress`, 'status');
                        }
                    } else if (updatedTask.status === 'PENDING_REVIEW') {
                        if (user.role === 'ADMIN') {
                            addNotification(`📝 Quest "${updatedTask.title}" submitted for review`, 'review');
                        }
                    } else if (updatedTask.status === 'DONE') {
                        if (isMyTask || user.role === 'ADMIN') {
                            addNotification(`✅ Quest "${updatedTask.title}" has been completed!`, 'success');
                        }
                    }
                }
                return prev.map(t => t.id === updatedTask.id ? updatedTask : t);
            });
        });

        socket.on('task_deleted', (data) => {
            setTasks(prev => prev.filter(t => t.id !== data.taskId));
        });

        socket.on('damage_dealt', (data) => console.log(`Dealt ${data.damage} damage!`));

        socket.on('friend_joined', (data) => {
            addNotification(`🤝 A friend joined quest "${data.taskTitle}"!`, 'social');
            setNotification(`A Friend has joined in helping your quest: ${data.taskTitle}!`);
            setTimeout(() => setNotification(null), 5000);
        });

        socket.on('reward_redeemed', (data) => {
            if (user.role === 'ADMIN') {
                addNotification(`🎁 ${data.username} redeemed ${data.item} for ${data.cost} XP`, 'reward');
                setNotification(`User ${data.username} redeemed ${data.item} for ${data.cost} XP!`);
                setTimeout(() => setNotification(null), 5000);
            }
        });

        socket.on('quest_denied', (data) => {
            if (data.leadAssigneeId === user.id) {
                addNotification(`⚠️ Quest "${data.taskTitle}" was denied: ${data.reason}`, 'denied');
                setNotification(`⚠️ Quest "${data.taskTitle}" was denied: ${data.reason}`);
                setTimeout(() => setNotification(null), 8000);
            }
        });

        socket.on('boss_deleted', (data) => {
            setAllBosses(prev => prev.filter(b => b.id !== data.id));
            if (selectedBossId === data.id) {
                setBoss(null);
                setSelectedBossId(null);
            }
        });

        return () => {
            socket.off('connect');
            socket.off('boss_updated');
            socket.off('task_created');
            socket.off('task_updated');
            socket.off('task_deleted');
            socket.off('boss_created');
            socket.off('boss_deleted');
            socket.off('damage_dealt');
            socket.off('friend_joined');
            socket.off('reward_redeemed');
            socket.off('quest_denied');
        };
    }, [user.role, selectedBossId]); // Removed allBosses to prevent loop



    const loadData = async () => {
        try {
            // Fetch all bosses
            const bossesList = await api.getAllBosses();
            setAllBosses(bossesList || []);

            // Set the first boss as active, or keep the currently selected one
            if (bossesList && bossesList.length > 0) {
                if (!selectedBossId || !bossesList.find(b => b.id === selectedBossId)) {
                    setSelectedBossId(bossesList[0].id);
                    setBoss(bossesList[0]);
                } else {
                    const currentBoss = bossesList.find(b => b.id === selectedBossId);
                    setBoss(currentBoss);
                }
            } else {
                setBoss(null);
                setSelectedBossId(null);
            }
        } catch (e) {
            console.log("No bosses found or error", e);
            setAllBosses([]);
            setBoss(null);
        }

        try {
            const taskList = await api.getTasks();
            setTasks(taskList);
        } catch (e) { console.error(e); }
    };

    const loadUsers = async () => {
        try {
            const usersList = await api.getUsers();
            setUsers(usersList);
        } catch (e) { console.error(e); }
    };

    const loadAllBosses = async () => {
        try {
            const list = await api.getBosses();
            setAllBosses(list);
            // Reminder logic: if admin and no bosses, show reminder
            if (user.role === 'ADMIN' && list.length === 0) {
                setShowBossReminder(true);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Effect to auto-select boss if none selected but list exists
    useEffect(() => {
        if (!boss && allBosses.length > 0) {
            setBoss(allBosses[0]);
            setSelectedBossId(allBosses[0].id);
        } else if (boss && !allBosses.find(b => b.id === boss.id)) {
            // Current boss was removed
            if (allBosses.length > 0) {
                setBoss(allBosses[0]);
                setSelectedBossId(allBosses[0].id);
            } else {
                setBoss(null);
                setSelectedBossId(null);
            }
        }
    }, [allBosses, boss]); // Run whenever list or current boss changes

    // Check for Victory - triggers when all tasks for this boss are completed
    useEffect(() => {
        if (boss && boss.total_hp > 0) {
            const bossTasks = tasks.filter(t => t.boss_id === boss.id);
            const allCompleted = bossTasks.length > 0 && bossTasks.every(t => t.status === 'DONE');
            if (allCompleted && !victoryDismissed) {
                setShowVictoryPopup(true);
            } else if (!allCompleted) {
                // A task was reopened — reset so popup can show again
                setVictoryDismissed(false);
                setShowVictoryPopup(false);
            }
        }
    }, [boss, tasks, victoryDismissed]);

    // Reset dismissal when switching bosses
    useEffect(() => {
        setVictoryDismissed(false);
        setShowVictoryPopup(false);
    }, [selectedBossId]);

    const loadRewards = async () => {
        try {
            const list = await api.getRewards();
            setRewards(list);
        } catch (e) { console.error(e); }
    };

    const loadNotifications = async () => {
        try {
            const saved = await api.getNotifications();
            // Convert DB notifications to the format used by the client
            const mapped = saved.map(n => ({
                id: n.id,
                message: n.message,
                type: n.type,
                time: new Date(n.createdAt)
            }));
            setNotifications(mapped);
            setUnreadCount(saved.filter(n => !n.read).length);
        } catch (e) { console.error('Failed to load notifications:', e); }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            // Combine lead assignee and associates
            const assignee_ids = [];
            if (newTask.lead_assignee) assignee_ids.push(parseInt(newTask.lead_assignee));
            newTask.associate_ids.forEach(id => assignee_ids.push(parseInt(id)));

            await api.createTask({
                ...newTask,
                boss_id: boss ? boss.id : null,
                assignee_ids
            });
            setShowTaskForm(false);
            setNewTask({
                title: '',
                difficulty: 10,
                xp_reward: 0,
                boss_damage: 10,
                priority: 'MEDIUM',
                label: 'FEATURE',
                lead_assignee: '',
                associate_ids: [],
                description: '',
                deadline: ''
            });
        } catch (err) {
            console.error('Create task error:', err);
            const errorMsg = err.message || err.error || JSON.stringify(err);
            alert('Failed to create quest: ' + errorMsg);
        }
    };

    const handleCreateBoss = async (e) => {
        e.preventDefault();
        try {
            // Process tasks to combine lead and associates
            const processedTasks = (newBoss.tasks || []).map(t => {
                const assignee_ids = [];
                if (t.lead_assignee) assignee_ids.push(parseInt(t.lead_assignee));
                if (t.associate_ids && Array.isArray(t.associate_ids)) {
                    t.associate_ids.forEach(id => assignee_ids.push(parseInt(id)));
                }
                return { ...t, assignee_ids };
            });

            // Validate total HP > 0
            const totalHP = processedTasks.reduce((sum, t) => sum + (parseInt(t.boss_damage) || 0), 0);
            if (totalHP <= 0) {
                alert('Total Boss HP must be greater than 0. Please add at least one quest with damage.');
                return;
            }

            await api.createBoss({ ...newBoss, tasks: processedTasks });
            setShowBossForm(false);
            setNewBoss({ name: '', image_url: '', start_date: '', deadline: '', tasks: [] });
            loadAllBosses();
        } catch (err) {
            console.error('Create boss error:', err);
            const msg = err.message || err.error || JSON.stringify(err);
            alert('Failed to summon boss: ' + msg);
        }
    };

    const handleEditBossClick = () => {
        if (!boss) return;
        setEditBossData({
            id: boss.id,
            name: boss.name,
            current_hp: boss.current_hp,
            total_hp: boss.total_hp,
            image_url: boss.image_url || '',
            start_date: boss.start_date ? boss.start_date.split('T')[0] : '',
            deadline: boss.deadline ? boss.deadline.split('T')[0] : ''
        });
        setShowEditBossForm(true);
    };

    const handleUpdateBoss = async (e) => {
        e.preventDefault();
        try {
            await api.updateBoss(editBossData.id, editBossData);
            setShowEditBossForm(false);
            loadAllBosses();
        } catch (err) {
            alert('Failed to update boss: ' + err.message);
        }
    };

    const handleDeleteBoss = async () => {
        if (!boss) return;
        if (!window.confirm(`Are you sure you want to delete ${boss.name}?`)) {
            return;
        }

        try {
            await api.deleteBoss(boss.id);
            setSelectedBossId(null);
            setBoss(null);
            loadAllBosses();
        } catch (err) {
            console.error('Delete boss error:', err);
            // err is the JSON object thrown by the API (either {error: "..."} or {message: "..."})
            const errorMsg = err.error || err.message || JSON.stringify(err);
            alert('Failed to delete boss: ' + errorMsg);
        }
    };

    const handleMoveTask = async (taskId, status, extraComment) => {
        const data = { status };
        if (extraComment) {
            if (status === 'PENDING_REVIEW') {
                data.completion_comment = extraComment;
            } else {
                data.admin_reply = extraComment;
            }
        }
        await api.updateTask(taskId, data);
    };

    const toggleAssignee = (userId) => {
        setNewTask(prev => ({
            ...prev,
            associate_ids: prev.associate_ids.includes(userId)
                ? prev.associate_ids.filter(id => id !== userId)
                : [...prev.associate_ids, userId]
        }));
    };

    // Filter tasks
    // Filter tasks by selected boss
    // Rewards Logic
    const handleExchange = async (reward) => {
        if (user.xp < reward.cost) {
            alert("Not enough XP!");
            return;
        }
        if (!window.confirm(`Exchange ${reward.cost} XP for ${reward.name}?`)) return;

        try {
            const res = await api.exchangeXP({ userId: user.id, item: reward.name, cost: reward.cost });
            alert(res.message);
            updateUser({ ...user, xp: res.newXP });
        } catch (err) {
            alert(err.message || "Exchange failed");
        }
    };

    const handleSaveReward = async (e) => {
        e.preventDefault();
        try {
            if (editingReward) {
                await api.updateReward(editingReward.id, rewardFormData);
            } else {
                await api.createReward(rewardFormData);
            }
            setShowRewardForm(false);
            setEditingReward(null);
            setRewardFormData({ name: '', cost: 0, description: '', image_url: '' });
            loadRewards();
        } catch (err) {
            alert('Failed to save reward: ' + err.message);
        }
    };

    const handleDeleteReward = async (id) => {
        if (!window.confirm('Are you sure you want to delete this reward?')) return;
        try {
            await api.deleteReward(id);
            loadRewards();
        } catch (err) {
            alert('Failed to delete reward: ' + err.message);
        }
    };

    const visibleTasks = tasks.filter(t => {
        // If a boss is selected, only show tasks for that boss
        if (selectedBossId) {
            return t.boss_id === selectedBossId;
        }
        // If no boss is selected, show tasks with no boss (general quests)?
        // Or show nothing? Showing orphaned tasks is confusing if not intended.
        // Let's only show orphaned tasks if specifically requested or if they possess a specific flag?
        // Current behavior: Show orphaned tasks.
        // User asked: "why is it that when aaa is deleted all of these tasks popped up?"
        // This implies they didn't expect it.
        // Let's hide them for now unless they are specifically "General Quests" (which we don't have a clear concept for yet).
        // OR, better: Only show them if we are in a "No Boss" state explicitly.
        // But since we are auto-selecting bosses now, this might be less of an issue.
        return t.boss_id === null;
    });

    const todoTasks = visibleTasks.filter(t => t.status === 'TODO');
    const wipTasks = visibleTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'PENDING_REVIEW');
    const doneTasks = visibleTasks.filter(t => t.status === 'DONE');

    const isAdmin = user.role === 'ADMIN';

    return (
        <div style={{ position: 'relative', minHeight: '100vh' }}>
            {/* FULL-SCREEN BOSS ARENA BACKGROUND */}
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}>
                <BossArena boss={boss} userClass={user?.class} />
            </div>

            {notification && (
                <div style={{
                    position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999,
                    backgroundColor: '#fff', border: '4px solid black', padding: '1rem', width: '300px'
                }} className="nes-container is-rounded is-dark">
                    <p style={{ marginBottom: 0 }}>
                        <i className="nes-icon heart is-small"></i> {notification}
                    </p>
                </div>
            )}

            {/* CONTENT OVERLAY */}
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '1650px', margin: '0 auto', padding: '0 15px', paddingTop: '60vh' }}>
                {/* Player Info */}
                <div style={{ marginBottom: '1rem', paddingTop: '0.5rem' }}>
                    <span className="nes-text is-primary">Player: {user.username}</span>
                    {isAdmin && <span className="nes-text is-error" style={{ marginLeft: '1rem' }}>(GM)</span>}
                    <span className="nes-text is-warning" style={{ marginLeft: '1rem' }}>Lvl {user.level}</span>
                    <span className="nes-text is-success" style={{ marginLeft: '1rem' }}>{user.class}</span>
                    <span className="nes-text" style={{ marginLeft: '1rem', color: '#fff' }}>XP: {user.xp}</span>
                </div>

                {/* Tabs & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <button className={`nes-btn ${activeTab === 'battle' ? 'is-primary' : ''}`} onClick={() => setActiveTab('battle')} style={{ marginRight: '1rem' }}>Battle View</button>
                        <button className={`nes-btn ${activeTab === 'timeline' ? 'is-primary' : ''}`} onClick={() => setActiveTab('timeline')}>Timeline View</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button className="nes-btn is-warning" onClick={() => setShowRewards(true)}>Rewards</button>
                        {/* Notification Bell */}
                        <div style={{ position: 'relative' }}>
                            <button
                                className="nes-btn"
                                onClick={() => {
                                    setShowNotifDropdown(!showNotifDropdown);
                                    if (!showNotifDropdown) {
                                        setUnreadCount(0);
                                        api.markNotificationsRead().catch(e => console.error(e));
                                    }
                                }}
                                style={{ position: 'relative', fontSize: '0.85rem' }}
                            >
                                🔔{unreadCount > 0 && (
                                    <span style={{
                                        position: 'absolute', top: '-8px', right: '-8px',
                                        backgroundColor: '#e76e55', color: '#fff',
                                        borderRadius: '50%', width: '22px', height: '22px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.65rem', fontWeight: 'bold', border: '2px solid #212529'
                                    }}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            {showNotifDropdown && (
                                <div style={{
                                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                                    width: '360px', maxHeight: '400px', overflowY: 'auto',
                                    zIndex: 500, border: '4px solid #F7D51D',
                                    borderRadius: '8px', backgroundColor: '#212529'
                                }}>
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '0.75rem 1rem', borderBottom: '2px solid #444'
                                    }}>
                                        <span style={{ color: '#F7D51D', fontWeight: 'bold', fontSize: '0.85rem' }}>Notifications</span>
                                        {notifications.length > 0 && (
                                            <button
                                                className="nes-btn is-small"
                                                onClick={() => {
                                                    setNotifications([]);
                                                    api.clearNotifications().catch(e => console.error(e));
                                                }}
                                                style={{ fontSize: '0.6rem', padding: '2px 8px' }}
                                            >Clear</button>
                                        )}
                                    </div>
                                    {notifications.length === 0 ? (
                                        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#888', fontSize: '0.8rem' }}>
                                            No notifications yet
                                        </div>
                                    ) : (
                                        notifications.map(n => (
                                            <div key={n.id} style={{
                                                padding: '0.6rem 1rem',
                                                borderBottom: '1px solid #333',
                                                color: '#ddd', fontSize: '0.75rem',
                                                transition: 'background 0.2s'
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2a2f35'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <div>{n.message}</div>
                                                <div style={{ color: '#666', fontSize: '0.6rem', marginTop: '4px' }}>
                                                    {new Date(n.time).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <button className="nes-btn is-error" onClick={() => localStorage.clear() || window.location.reload()}>Logout</button>
                    </div>
                </div>

                {
                    activeTab === 'battle' ? (
                        <>
                            {/* Boss Controls */}
                            <div style={{ marginBottom: '1rem' }}>
                                {/* Boss Tabs (if multiple bosses) */}
                                {allBosses.length > 1 && (
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                        {allBosses.map(b => (
                                            <button
                                                key={b.id}
                                                className={`nes-btn ${selectedBossId === b.id ? 'is-primary' : 'is-disabled'}`}
                                                onClick={() => { setSelectedBossId(b.id); setBoss(b); }}
                                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                            >
                                                {b.name}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* HP Bar - full width */}
                                {boss ? (
                                    <div style={{ width: '100%' }}>
                                        <HPBar boss={boss} />
                                    </div>
                                ) : (
                                    <span className="nes-text" style={{ fontSize: '0.8rem', color: '#aaa' }}>No Active Boss</span>
                                )}

                                {/* All action buttons below HP bar, aligned left */}
                                {isAdmin && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {boss && <button className="nes-btn is-success" onClick={() => setShowTaskForm(true)} style={{ fontSize: '0.75rem' }}>+ New Quest</button>}
                                            <button className="nes-btn is-primary" onClick={() => setShowBossForm(true)} style={{ fontSize: '0.75rem' }}>Summon Boss</button>
                                        </div>
                                        {boss && (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="nes-btn is-warning" onClick={handleEditBossClick} style={{ fontSize: '0.75rem' }}>Edit Boss</button>
                                                <button className="nes-btn is-error" onClick={handleDeleteBoss} style={{ fontSize: '0.75rem' }}>Delete Boss</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Task Board */}
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                <div className="nes-container with-title" style={{ flex: '1 1 calc(33.333% - 0.67rem)', minWidth: '280px', backgroundColor: 'rgba(10, 10, 46, 0.85)', borderColor: '#4a4a8a', color: '#e0e0ff' }}>
                                    <p className="title" style={{ backgroundColor: 'rgba(10, 10, 46, 0.95)', color: '#6af' }}>To Do</p>
                                    {todoTasks.map(t => <TaskCard key={t.id} task={t} onMove={handleMoveTask} users={users} onNotify={setNotification} />)}
                                    {todoTasks.length === 0 && <p style={{ fontSize: '0.7rem', color: '#6a6aaa', fontStyle: 'italic' }}>No quests</p>}
                                </div>
                                <div className="nes-container with-title" style={{ flex: '1 1 calc(33.333% - 0.67rem)', minWidth: '280px', backgroundColor: 'rgba(10, 10, 46, 0.85)', borderColor: '#4a4a8a', color: '#e0e0ff' }}>
                                    <p className="title" style={{ backgroundColor: 'rgba(10, 10, 46, 0.95)', color: '#fa4' }}>In Progress</p>
                                    {wipTasks.map(t => <TaskCard key={t.id} task={t} onMove={handleMoveTask} users={users} onNotify={setNotification} />)}
                                    {wipTasks.length === 0 && <p style={{ fontSize: '0.7rem', color: '#6a6aaa', fontStyle: 'italic' }}>No quests</p>}
                                </div>
                                <div className="nes-container with-title" style={{ flex: '1 1 calc(33.333% - 0.67rem)', minWidth: '280px', backgroundColor: 'rgba(10, 10, 46, 0.85)', borderColor: '#4a4a8a', color: '#e0e0ff' }}>
                                    <p className="title" style={{ backgroundColor: 'rgba(10, 10, 46, 0.95)', color: '#4f4' }}>Completed</p>
                                    {doneTasks.map(t => <TaskCard key={t.id} task={t} onMove={handleMoveTask} users={users} onNotify={setNotification} />)}
                                    {doneTasks.length === 0 && <p style={{ fontSize: '0.7rem', color: '#6a6aaa', fontStyle: 'italic' }}>No quests</p>}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Timeline View - Calendar */
                        <div className="nes-container with-title" style={{ backgroundColor: 'rgba(10, 10, 46, 0.85)', borderColor: '#4a4a8a', color: '#e0e0ff' }}>
                            <p className="title" style={{ backgroundColor: 'rgba(10, 10, 46, 0.95)', color: '#6af' }}>Boss Timeline Calendar</p>
                            {allBosses.length === 0 ? <p style={{ color: '#6a6aaa' }}>No bosses recorded.</p> : (
                                <div style={{ padding: '0.5rem' }}>
                                    {(() => {
                                        // Calculate date range for calendar
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);

                                        const bossDates = allBosses.flatMap(b => [
                                            b.start_date ? new Date(b.start_date) : null,
                                            b.deadline ? new Date(b.deadline) : null
                                        ]).filter(d => d && !isNaN(d.getTime()));

                                        const minDate = bossDates.length > 0
                                            ? new Date(Math.min(...bossDates.map(d => d.getTime())))
                                            : new Date(today.getFullYear(), today.getMonth(), 1);

                                        const maxDate = bossDates.length > 0
                                            ? new Date(Math.max(...bossDates.map(d => d.getTime())))
                                            : new Date(today.getFullYear(), today.getMonth() + 3, 0);

                                        // Add significant padding for visibility
                                        minDate.setDate(minDate.getDate() - 15); // Increased left padding
                                        maxDate.setDate(maxDate.getDate() + 15); // Increased right padding

                                        const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24))); // Ensure at least 1 day
                                        const dayWidth = 60; // Slightly wider
                                        const totalWidth = Math.max(totalDays * dayWidth, 800); // Ensure min width
                                        const contentHeight = (allBosses.length * 70) + 60;

                                        return (
                                            <div style={{ overflowX: 'auto', width: '100%', maxWidth: '100%', margin: '0 auto', border: '1px solid #4a4a8a', borderRadius: '4px', backgroundColor: 'rgba(5, 5, 30, 0.8)', position: 'relative' }}>
                                                <div style={{ position: 'relative', width: `${totalWidth}px`, minWidth: '100%', height: `${contentHeight}px` }}>

                                                    {/* BACKGROUND GRID (Vertical Lines) */}
                                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
                                                        {Array.from({ length: totalDays + 1 }).map((_, i) => {
                                                            const current = new Date(minDate);
                                                            current.setDate(minDate.getDate() + i);
                                                            const isWeekStart = current.getDay() === 1; // Monday
                                                            return (
                                                                <div key={i} style={{
                                                                    position: 'absolute',
                                                                    left: `${i * dayWidth}px`,
                                                                    top: 0,
                                                                    bottom: 0,
                                                                    borderLeft: isWeekStart ? '1px solid #4a4a8a' : '1px dashed #2a2a5a',
                                                                    backgroundColor: (current.getDay() === 0 || current.getDay() === 6) ? 'rgba(100,100,255,0.05)' : 'transparent'
                                                                }} />
                                                            );
                                                        })}
                                                    </div>

                                                    {/* TIME AXIS (Sticky Header) */}
                                                    <div style={{
                                                        height: '40px',
                                                        borderBottom: '2px solid #4a4a8a',
                                                        position: 'sticky',
                                                        top: 0,
                                                        backgroundColor: 'rgba(10, 10, 40, 0.95)',
                                                        zIndex: 20,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                    }}>
                                                        {Array.from({ length: totalDays + 1 }).map((_, i) => {
                                                            const current = new Date(minDate);
                                                            current.setDate(minDate.getDate() + i);
                                                            // Show label every Monday (1) and start of month
                                                            const showLabel = current.getDay() === 1 || current.getDate() === 1;

                                                            if (!showLabel) return null;

                                                            return (
                                                                <div key={i} style={{
                                                                    position: 'absolute',
                                                                    left: `${i * dayWidth + 5}px`,
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 'bold',
                                                                    color: '#8a8acc',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* BOSS BARS */}
                                                    <div style={{ position: 'relative', zIndex: 10, paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                        {allBosses.map(boss => {
                                                            const startDate = boss.start_date ? new Date(boss.start_date) : today;
                                                            const endDate = boss.deadline ? new Date(boss.deadline) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

                                                            const startOffset = Math.max(0, (startDate - minDate) / (1000 * 60 * 60 * 24));
                                                            const duration = Math.max(1, (endDate - startDate) / (1000 * 60 * 60 * 24)); // Min 1 day duration

                                                            const left = startOffset * dayWidth;
                                                            const width = duration * dayWidth;

                                                            // Determine status color
                                                            let bgColor, status;
                                                            if (boss.current_hp === 0) {
                                                                bgColor = '#e76e55'; // Red
                                                                status = '💀 DEFEATED';
                                                            } else if (boss.deadline && new Date(boss.deadline) < today) {
                                                                bgColor = '#f7d51d'; // Yellow
                                                                status = '⏰ EXPIRED';
                                                            } else {
                                                                bgColor = '#92cc41'; // Green
                                                                status = '⚔️ ACTIVE';
                                                            }

                                                            return (
                                                                <div key={boss.id} style={{ position: 'relative', height: '50px' }}>
                                                                    <div
                                                                        className="nes-container is-rounded"
                                                                        style={{
                                                                            position: 'absolute',
                                                                            left: `${left}px`,
                                                                            width: `${Math.max(width, dayWidth)}px`, // Ensure at least 1 day width visible
                                                                            height: '50px',
                                                                            backgroundColor: bgColor,
                                                                            color: status === '⏰ EXPIRED' ? '#000' : '#fff',
                                                                            padding: '0.25rem 0.5rem',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            justifyContent: 'center',
                                                                            cursor: 'pointer',
                                                                            border: '2px solid #000',
                                                                            whiteSpace: 'nowrap',
                                                                            overflow: 'hidden',
                                                                            zIndex: 15,
                                                                            boxShadow: '2px 2px 0px rgba(0,0,0,0.2)'
                                                                        }}
                                                                        title={`${boss.name}\n${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\nHP: ${boss.current_hp}/${boss.total_hp}`}
                                                                        onClick={() => {
                                                                            setSelectedBossId(boss.id);
                                                                            setActiveTab('battle');
                                                                        }}
                                                                    >
                                                                        <div style={{ fontWeight: 'bold', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{boss.name}</div>
                                                                        <div style={{ fontSize: '0.7rem' }}>{status}</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* TODAY MARKER */}
                                                    {today >= minDate && today <= maxDate && (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                left: `${((today - minDate) / (1000 * 60 * 60 * 24)) * dayWidth}px`,
                                                                top: '40px', // Below header
                                                                bottom: 0,
                                                                width: '2px',
                                                                backgroundColor: '#209cee',
                                                                zIndex: 30,
                                                                pointerEvents: 'none',
                                                                boxShadow: '0 0 4px rgba(32, 156, 238, 0.5)'
                                                            }}
                                                        >
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: '-25px',
                                                                left: '-20px',
                                                                backgroundColor: '#209cee',
                                                                color: '#fff',
                                                                padding: '2px 4px',
                                                                borderRadius: '4px',
                                                                fontSize: '0.6rem',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                TODAY
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    )
                }

                {/* Rewards Modal */}
                {
                    showRewards && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
                            <div className="nes-container is-rounded is-white" style={{ backgroundColor: 'white', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h2>XP Rewards Store</h2>
                                    {isAdmin && (
                                        <button className="nes-btn is-success is-small" onClick={() => {
                                            setEditingReward(null);
                                            setRewardFormData({ name: '', cost: 0, description: '', image_url: '' });
                                            setShowRewardForm(true);
                                        }}>+ Add Reward</button>
                                    )}
                                </div>
                                <p>Current XP: <span className="nes-text is-success">{user.xp}</span></p>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                    {rewards.map(reward => (
                                        <div key={reward.id} className="nes-container is-centered with-title" style={{ position: 'relative' }}>
                                            <p className="title">{reward.name}</p>
                                            {reward.image_url && <img src={reward.image_url} alt={reward.name} style={{ width: '50px', height: '50px', objectFit: 'contain' }} />}
                                            <p>{reward.cost} XP</p>
                                            {reward.description && <p style={{ fontSize: '0.8rem', color: '#666' }}>{reward.description}</p>}

                                            <button
                                                className={`nes-btn ${user.xp >= reward.cost ? 'is-primary' : 'is-disabled'}`}
                                                onClick={() => user.xp >= reward.cost && handleExchange(reward)}
                                                disabled={user.xp < reward.cost}
                                                style={{ marginBottom: '0.5rem' }}
                                            >
                                                Exchange
                                            </button>

                                            {isAdmin && (
                                                <div style={{ borderTop: '1px dashed #ccc', paddingTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                    <button className="nes-btn is-warning is-small" onClick={() => {
                                                        setEditingReward(reward);
                                                        setRewardFormData({ name: reward.name, cost: reward.cost, description: reward.description || '', image_url: reward.image_url || '' });
                                                        setShowRewardForm(true);
                                                    }}>Edit</button>
                                                    <button className="nes-btn is-error is-small" onClick={() => handleDeleteReward(reward.id)}>Del</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                                    <button className="nes-btn" onClick={() => setShowRewards(false)}>Close</button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Modal for Reward Form */}
                {showRewardForm && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 110 }}>
                        <div className="nes-container is-rounded is-white" style={{ backgroundColor: 'white', maxWidth: '500px', width: '90%' }}>
                            <h2>{editingReward ? 'Edit Reward' : 'New Reward'}</h2>
                            <form onSubmit={handleSaveReward}>
                                <div className="nes-field">
                                    <label>Name</label>
                                    <input className="nes-input" value={rewardFormData.name} onChange={e => setRewardFormData({ ...rewardFormData, name: e.target.value })} required />
                                </div>
                                <div className="nes-field">
                                    <label>Cost (XP)</label>
                                    <input type="number" className="nes-input" value={rewardFormData.cost} onChange={e => setRewardFormData({ ...rewardFormData, cost: parseInt(e.target.value) })} required min="1" />
                                </div>
                                <div className="nes-field">
                                    <label>Description</label>
                                    <input className="nes-input" value={rewardFormData.description} onChange={e => setRewardFormData({ ...rewardFormData, description: e.target.value })} />
                                </div>
                                <div className="nes-field">
                                    <label>Image URL</label>
                                    <input className="nes-input" value={rewardFormData.image_url} onChange={e => setRewardFormData({ ...rewardFormData, image_url: e.target.value })} placeholder="https://..." />
                                </div>
                                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <button type="button" className="nes-btn" onClick={() => setShowRewardForm(false)}>Cancel</button>
                                    <button type="submit" className="nes-btn is-primary">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Boss Reminder Modal */}
                {showBossReminder && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 120 }}>
                        <div className="nes-container is-rounded is-white" style={{ backgroundColor: 'white', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
                            <h2 style={{ color: '#e76e55' }}>Warning!</h2>
                            <p>The realm has no active Boss!</p>
                            <p>Heroes are getting restless. Calculate HP and summon a new threat immediately!</p>
                            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                <button className="nes-btn is-primary" onClick={() => {
                                    setShowBossReminder(false);
                                    setShowBossForm(true);
                                }}>Summon Boss</button>
                                <button className="nes-btn" onClick={() => setShowBossReminder(false)}>Later</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal for New Task */}
                {
                    showTaskForm && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
                            <div className="nes-container is-rounded is-white" style={{ backgroundColor: 'white', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                                <h2>New Quest</h2>
                                <form onSubmit={handleCreateTask}>
                                    <div className="nes-field">
                                        <label>Title</label>
                                        <input className="nes-input" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} required />
                                    </div>

                                    <div className="nes-field">
                                        <label>Boss Damage</label>
                                        <input type="number" className="nes-input" value={newTask.boss_damage} onChange={e => setNewTask({ ...newTask, boss_damage: parseInt(e.target.value) })} min="0" />
                                    </div>
                                    {/* Lead Assignee */}
                                    <div className="nes-field">
                                        <label>Lead Assignee (Required)</label>
                                        <div className="nes-select">
                                            <select
                                                value={newTask.lead_assignee}
                                                onChange={e => setNewTask({ ...newTask, lead_assignee: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Lead...</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.username} ({u.class})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Associates */}
                                    <div className="nes-field">
                                        <label>Associates (Optional)</label>
                                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '2px solid black', padding: '0.5rem' }}>
                                            {users.filter(u => u.id !== parseInt(newTask.lead_assignee)).map(u => (
                                                <div key={u.id}>
                                                    <label>
                                                        <input
                                                            type="checkbox"
                                                            className="nes-checkbox"
                                                            checked={newTask.associate_ids.includes(u.id)}
                                                            onChange={() => toggleAssignee(u.id)}
                                                        />
                                                        <span>{u.username} ({u.class})</span>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="nes-field">
                                        <label>Description (Optional)</label>
                                        <textarea
                                            className="nes-textarea"
                                            value={newTask.description}
                                            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                            placeholder="Describe the quest..."
                                            style={{ minHeight: '4rem' }}
                                        />
                                    </div>

                                    <div className="nes-field">
                                        <label>Deadline (Optional)</label>
                                        <input
                                            type="date"
                                            className="nes-input"
                                            value={newTask.deadline}
                                            onChange={e => setNewTask({ ...newTask, deadline: e.target.value })}
                                        />
                                    </div>

                                    <div className="nes-field">
                                        <label>Priority</label>
                                        <div className="nes-select">
                                            <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                                                <option value="LOW">Low</option>
                                                <option value="MEDIUM">Medium</option>
                                                <option value="HIGH">High</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="nes-field">
                                        <label>Type</label>
                                        <div className="nes-select">
                                            <select value={newTask.label} onChange={e => setNewTask({ ...newTask, label: e.target.value })}>
                                                <option value="FEATURE">Feature</option>
                                                <option value="BUG">Bug</option>
                                                <option value="ENHANCEMENT">Enhancement</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                                        <button type="button" className="nes-btn" onClick={() => setShowTaskForm(false)}>Cancel</button>
                                        <button type="submit" className="nes-btn is-primary">Create</button>
                                    </div>
                                </form>
                            </div>
                        </div >
                    )
                }

                {/* Modal for New Boss (With Dates & Dynamic Tasks) */}
                {
                    showBossForm && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
                            <div className="nes-container is-rounded is-white" style={{ backgroundColor: 'white', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                                <h2>Summon/Schedule Boss</h2>
                                <form onSubmit={handleCreateBoss}>
                                    <div className="nes-field">
                                        <label>Name</label>
                                        <input className="nes-input" value={newBoss.name} onChange={e => setNewBoss({ ...newBoss, name: e.target.value })} required />
                                    </div>

                                    <div className="nes-field">
                                        <label>Start Date (Optional)</label>
                                        <input type="date" className="nes-input" value={newBoss.start_date} onChange={e => setNewBoss({ ...newBoss, start_date: e.target.value })} />
                                    </div>

                                    <div className="nes-field">
                                        <label>Deadline (Optional)</label>
                                        <input type="date" className="nes-input" value={newBoss.deadline} onChange={e => setNewBoss({ ...newBoss, deadline: e.target.value })} />
                                    </div>

                                    <div className="nes-field">
                                        <label>Image URL (Optional)</label>
                                        <input className="nes-input" value={newBoss.image_url} onChange={e => setNewBoss({ ...newBoss, image_url: e.target.value })} placeholder="https://..." />
                                    </div>

                                    <div style={{ marginTop: '1rem', borderTop: '2px dashed #000', paddingTop: '1rem' }}>
                                        <h3>Initial Quests</h3>
                                        <p style={{ fontSize: '0.8rem' }}>Add quests to define the Boss's Total HP.</p>

                                        {newBoss.tasks && newBoss.tasks.map((t, idx) => (
                                            <div key={idx} className="nes-container is-rounded" style={{ padding: '0.5rem', marginBottom: '0.5rem' }}>
                                                {/* Header */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontWeight: 'bold' }}>Quest #{idx + 1}</span>
                                                    <button type="button" className="nes-btn is-error is-small" onClick={() => {
                                                        const updatedTasks = newBoss.tasks.filter((_, i) => i !== idx);
                                                        setNewBoss({ ...newBoss, tasks: updatedTasks });
                                                    }}>X</button>
                                                </div>

                                                {/* Title */}
                                                <div className="nes-field">
                                                    <label style={{ fontSize: '0.8rem' }}>Title</label>
                                                    <input className="nes-input is-small" value={t.title} onChange={e => {
                                                        const updatedTasks = [...newBoss.tasks];
                                                        updatedTasks[idx].title = e.target.value;
                                                        setNewBoss({ ...newBoss, tasks: updatedTasks });
                                                    }} required />
                                                </div>

                                                {/* Damage */}
                                                <div style={{ marginTop: '0.5rem' }}>
                                                    <label style={{ fontSize: '0.8rem', color: '#666' }}>Boss HP Contribution (DMG)</label>
                                                    <input type="number" className="nes-input is-small" value={t.boss_damage} onChange={e => {
                                                        const updatedTasks = [...newBoss.tasks];
                                                        updatedTasks[idx].boss_damage = parseInt(e.target.value) || 0;
                                                        setNewBoss({ ...newBoss, tasks: updatedTasks });
                                                    }} />
                                                </div>

                                                {/* Lead Assignee */}
                                                <div className="nes-field" style={{ marginTop: '0.5rem' }}>
                                                    <label style={{ fontSize: '0.8rem' }}>Lead Assignee</label>
                                                    <div className="nes-select is-small">
                                                        <select value={t.lead_assignee || ''} onChange={e => {
                                                            const updatedTasks = [...newBoss.tasks];
                                                            updatedTasks[idx].lead_assignee = e.target.value;
                                                            setNewBoss({ ...newBoss, tasks: updatedTasks });
                                                        }} required>
                                                            <option value="">Select Lead...</option>
                                                            {users.map(u => (
                                                                <option key={u.id} value={u.id}>{u.username} ({u.class})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Associates */}
                                                <div className="nes-field" style={{ marginTop: '0.5rem' }}>
                                                    <label style={{ fontSize: '0.8rem' }}>Associates</label>
                                                    <div style={{ maxHeight: '100px', overflowY: 'auto', border: '2px solid black', padding: '0.25rem' }}>
                                                        {users.filter(u => u.id !== parseInt(t.lead_assignee)).map(u => (
                                                            <div key={u.id}>
                                                                <label>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="nes-checkbox"
                                                                        checked={(t.associate_ids || []).includes(u.id)}
                                                                        onChange={() => {
                                                                            const updatedTasks = [...newBoss.tasks];
                                                                            const currentIds = updatedTasks[idx].associate_ids || [];
                                                                            if (currentIds.includes(u.id)) {
                                                                                updatedTasks[idx].associate_ids = currentIds.filter(id => id !== u.id);
                                                                            } else {
                                                                                updatedTasks[idx].associate_ids = [...currentIds, u.id];
                                                                            }
                                                                            setNewBoss({ ...newBoss, tasks: updatedTasks });
                                                                        }}
                                                                    />
                                                                    <span style={{ fontSize: '0.8rem' }}>{u.username}</span>
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Description */}
                                                <div className="nes-field" style={{ marginTop: '0.5rem' }}>
                                                    <label style={{ fontSize: '0.8rem' }}>Description</label>
                                                    <textarea className="nes-textarea is-small" value={t.description || ''} onChange={e => {
                                                        const updatedTasks = [...newBoss.tasks];
                                                        updatedTasks[idx].description = e.target.value;
                                                        setNewBoss({ ...newBoss, tasks: updatedTasks });
                                                    }} style={{ minHeight: '3rem' }} />
                                                </div>

                                                {/* Priority & Label */}
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                    <div className="nes-field" style={{ flex: 1 }}>
                                                        <label style={{ fontSize: '0.8rem' }}>Priority</label>
                                                        <div className="nes-select is-small">
                                                            <select value={t.priority || 'MEDIUM'} onChange={e => {
                                                                const updatedTasks = [...newBoss.tasks];
                                                                updatedTasks[idx].priority = e.target.value;
                                                                setNewBoss({ ...newBoss, tasks: updatedTasks });
                                                            }}>
                                                                <option value="LOW">Low</option>
                                                                <option value="MEDIUM">Medium</option>
                                                                <option value="HIGH">High</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="nes-field" style={{ flex: 1 }}>
                                                        <label style={{ fontSize: '0.8rem' }}>Label</label>
                                                        <div className="nes-select is-small">
                                                            <select value={t.label || 'FEATURE'} onChange={e => {
                                                                const updatedTasks = [...newBoss.tasks];
                                                                updatedTasks[idx].label = e.target.value;
                                                                setNewBoss({ ...newBoss, tasks: updatedTasks });
                                                            }}>
                                                                <option value="FEATURE">Feature</option>
                                                                <option value="BUG">Bug</option>
                                                                <option value="ENHANCEMENT">Enhancement</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Task Deadline */}
                                                <div className="nes-field" style={{ marginTop: '0.5rem' }}>
                                                    <label style={{ fontSize: '0.8rem' }}>Task Deadline</label>
                                                    <input type="date" className="nes-input is-small" value={t.deadline ? t.deadline.split('T')[0] : ''} onChange={e => {
                                                        const updatedTasks = [...newBoss.tasks];
                                                        updatedTasks[idx].deadline = e.target.value;
                                                        setNewBoss({ ...newBoss, tasks: updatedTasks });
                                                    }} />
                                                </div>
                                            </div>
                                        ))}

                                        <button type="button" className="nes-btn" onClick={() => {
                                            setNewBoss({
                                                ...newBoss,
                                                tasks: [...(newBoss.tasks || []), {
                                                    title: '',
                                                    xp_reward: 0,
                                                    boss_damage: 10,
                                                    lead_assignee: '',
                                                    associate_ids: [],
                                                    description: '',
                                                    priority: 'MEDIUM',
                                                    label: 'FEATURE',
                                                    deadline: ''
                                                }]
                                            });
                                        }}>+ Add Quest</button>
                                    </div>

                                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                                        <span className="nes-text is-error" style={{ fontSize: '1.2rem' }}>
                                            Total HP: {(newBoss.tasks || []).reduce((sum, t) => sum + (parseInt(t.boss_damage) || 0), 0)}
                                        </span>
                                    </div>

                                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                                        <button type="button" className="nes-btn" onClick={() => setShowBossForm(false)}>Cancel</button>
                                        <button type="submit" className="nes-btn is-error">召喚 (Summon/Schedule)</button>
                                    </div>
                                </form>
                            </div >
                        </div >
                    )
                }

                {/* Modal for Edit Boss */}
                {
                    showEditBossForm && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
                            <div className="nes-container is-rounded is-white" style={{ backgroundColor: 'white', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                                <h2>Edit Boss</h2>
                                <form onSubmit={handleUpdateBoss}>
                                    <div className="nes-field">
                                        <label>Name</label>
                                        <input
                                            className="nes-input"
                                            value={editBossData.name}
                                            onChange={e => setEditBossData({ ...editBossData, name: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="nes-field">
                                        <label>Image URL (Optional)</label>
                                        <input
                                            className="nes-input"
                                            value={editBossData.image_url}
                                            onChange={e => setEditBossData({ ...editBossData, image_url: e.target.value })}
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div className="nes-field">
                                        <label>Start Date (Optional)</label>
                                        <input
                                            type="date"
                                            className="nes-input"
                                            value={editBossData.start_date}
                                            onChange={e => setEditBossData({ ...editBossData, start_date: e.target.value })}
                                        />
                                    </div>

                                    <div className="nes-field">
                                        <label>Deadline (Optional)</label>
                                        <input
                                            type="date"
                                            className="nes-input"
                                            value={editBossData.deadline}
                                            onChange={e => setEditBossData({ ...editBossData, deadline: e.target.value })}
                                        />
                                    </div>

                                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                                        <button type="button" className="nes-btn" onClick={() => setShowEditBossForm(false)}>Cancel</button>
                                        <button type="submit" className="nes-btn is-warning">Update Boss</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }
                {/* Victory Popup */}
                {showVictoryPopup && boss && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 }}>
                        <div className="nes-container is-rounded is-centered is-dark" style={{ backgroundColor: '#212529', color: '#fff', maxWidth: '600px', width: '90%', border: '4px solid #F7D51D' }}>
                            <i className="nes-icon trophy is-large"></i>
                            <h2 style={{ color: '#F7D51D', marginTop: '1rem' }}>VICTORY!</h2>
                            <p style={{ fontSize: '1.2rem' }}>The Boss <strong>{boss.name}</strong> has been defeated!</p>

                            <div style={{ margin: '2rem 0', textAlign: 'left' }}>
                                <p style={{ borderBottom: '2px solid #fff', paddingBottom: '0.5rem' }}>Heroes of the Realm:</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {(() => {
                                        // Get all tasks for this boss (all contributed to defeating it)
                                        const bossTasks = tasks.filter(t => t.boss_id === boss.id);
                                        const contributorIds = new Set();

                                        bossTasks.forEach(t => {
                                            if (t.Assignees && Array.isArray(t.Assignees)) {
                                                t.Assignees.forEach(u => contributorIds.add(u.id));
                                            }
                                            if (t.assigned_to) contributorIds.add(t.assigned_to);
                                        });

                                        if (contributorIds.size === 0) {
                                            // Fallback: show all non-admin users if no specific assignees found
                                            const allHeroes = users.filter(u => u.role !== 'ADMIN');
                                            if (allHeroes.length === 0) return <p>No specific heroes recorded.</p>;
                                            return allHeroes.map(u => (
                                                <span key={u.id} className="nes-badge">
                                                    <span className="is-warning">{u.username}</span>
                                                </span>
                                            ));
                                        }

                                        return Array.from(contributorIds).map(id => {
                                            const u = users.find(user => user.id === id);
                                            if (!u) return null;
                                            return (
                                                <span key={u.id} className="nes-badge">
                                                    <span className="is-warning">{u.username}</span>
                                                </span>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                                <button className="nes-btn" onClick={() => {
                                    setShowVictoryPopup(false);
                                    setVictoryDismissed(true);
                                }}>Close</button>
                                {isAdmin && (
                                    <button className="nes-btn is-error" onClick={() => {
                                        handleDeleteBoss();
                                        // No need to close explicitly as deleting boss triggers null boss state
                                    }}>Delete Boss</button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BattleView;
