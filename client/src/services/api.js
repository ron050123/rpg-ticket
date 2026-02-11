const API_URL = 'http://localhost:5322/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const api = {
    login: async (creds) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(creds)
        });
        if (!res.ok) throw await res.json();
        return res.json();
    },
    register: async (data) => {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw await res.json();
        return res.json();
    },
    getUsers: async () => {
        const res = await fetch(`${API_URL}/auth/users`, { headers: getHeaders() });
        if (!res.ok) throw await res.json();
        return res.json();
    },
    getBoss: async () => {
        const res = await fetch(`${API_URL}/bosses/active`, { headers: getHeaders() });
        if (!res.ok) throw await res.json();
        return res.json();
    },
    createBoss: async (data) => {
        const res = await fetch(`${API_URL}/bosses`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw await res.json();
        return res.json();
    },
    getBosses: async () => {
        const res = await fetch(`${API_URL}/bosses`, { headers: getHeaders() });
        if (!res.ok) throw await res.json();
        return res.json();
    },
    getAllBosses: async () => {
        const res = await fetch(`${API_URL}/bosses`, { headers: getHeaders() });
        if (!res.ok) throw await res.json();
        return res.json();
    },
    updateBoss: async (id, data) => {
        const res = await fetch(`${API_URL}/bosses/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw await res.json();
        return res.json();
    },
    deleteBoss: async (id) => {
        const res = await fetch(`${API_URL}/bosses/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw await res.json();
        return res.json();
    },
    getTasks: async () => {
        const res = await fetch(`${API_URL}/tasks`, { headers: getHeaders() });
        if (!res.ok) throw await res.json();
        return res.json();
    },
    createTask: async (data) => {
        const res = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw await res.json();
        return res.json();
    },
    updateTask: async (id, data) => {
        const res = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw await res.json();
        return res.json();
    },
    deleteTask: async (id) => {
        const res = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw await res.json();
        return res.json();
    },
    // Comments
    getComments: async (taskId) => {
        const res = await fetch(`${API_URL}/comments/${taskId}`, { headers: getHeaders() });
        if (!res.ok) throw await res.json();
        return res.json();
    },
    createComment: async (taskId, content) => {
        const res = await fetch(`${API_URL}/comments/${taskId}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ content })
        });
        if (!res.ok) throw await res.json();
        return res.json();
    }
};
