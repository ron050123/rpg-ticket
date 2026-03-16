const http = require('http');

const data = JSON.stringify({
    username: 'ligktit',
    password: '123456',
    role: 'USER',
    class: 'Warrior',
    appearance: {
        head: 'knight_helm',
        body: 'plate_armor',
        weapon: 'broadsword'
    }
});

const options = {
    hostname: 'localhost',
    port: 5322,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        if (res.statusCode === 201) {
            console.log('Account "ligktit" created successfully!');
        } else {
            console.error('Failed to create account:', body);
        }
    });
});

req.on('error', (error) => {
    console.error('Request error:', error.message);
});

req.write(data);
req.end();