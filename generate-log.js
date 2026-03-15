const fs = require('fs');
const path = require('path');

// Ensure public directory exists
const logsDir = path.join(__dirname, 'public');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'access.log');
const stream = fs.createWriteStream(logFile, { flags: 'w' });

const NOISE_IPS = [
  '45.33.32.156', '198.51.100.23', '172.16.254.1', '10.0.0.45', '192.168.1.105',
  '203.0.113.88', '185.220.101.34', '91.108.4.0', '77.88.8.8', '8.8.4.4',
  '104.21.14.93', '172.67.181.234', '52.84.125.16', '13.107.42.14', '31.13.72.36'
];

const NOISE_PATHS = [
  '/index.php', '/about.html', '/contact.php', '/login.php', '/dashboard.php',
  '/assets/css/main.css', '/assets/js/app.js', '/images/logo.png',
  '/api/users', '/api/products', '/wp-login.php', '/xmlrpc.php',
  '/admin/login', '/.env', '/config.php', '/backup.zip',
  '/robots.txt', '/sitemap.xml', '/favicon.ico'
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
  "curl/7.88.1",
  "python-requests/2.31.0",
  "Googlebot/2.1 (+http://www.google.com/bot.html)",
  "Wget/1.21.3"
];

const RED_HERRING_PAYLOADS = [
  "POST /api/upload?token=dGhpc2lzYWZha2U= HTTP/1.1",
  "POST /api/upload?token=bm90dGhlZmxhZw== HTTP/1.1",
  "POST /api/upload?token=dHJ5aGFyZGVy HTTP/1.1"
];

// Start timestamp: 2025-03-10 00:00:00 UTC
// Middle: 2025-03-11 02:14:00 UTC
let currentTime = new Date('2025-03-10T00:00:00Z').getTime();

function formatDate(ms) {
    const d = new Date(ms);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(d.getUTCDate())}/${months[d.getUTCMonth()]}/${d.getUTCFullYear()}:${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} +0000`;
}

function randItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateNoiseLine(timeOverride) {
    const ip = randItem(NOISE_IPS);
    const dateStr = formatDate(timeOverride || currentTime);
    
    let method = 'GET';
    const methodRand = Math.random();
    if (methodRand > 0.8) {
        if (methodRand > 0.95) method = randItem(['PUT', 'DELETE', 'HEAD']);
        else method = 'POST';
    }

    const pathUrl = randItem(NOISE_PATHS);
    
    let status = 200;
    const statusRand = Math.random();
    if (statusRand > 0.7) {
        if (statusRand < 0.8) status = 304;
        else if (statusRand < 0.9) status = 404;
        else if (statusRand < 0.95) status = 403;
        else status = 500;
    }

    const bytes = randInt(200, 50000);
    const referer = randItem(['-', '-', 'http://google.com', 'http://bing.com', `http://${ip}/login.php`]);
    const ua = randItem(USER_AGENTS);

    return `${ip} - - [${dateStr}] "${method} ${pathUrl} HTTP/1.1" ${status} ${bytes} "${referer}" "${ua}"\n`;
}

async function writeLog() {
    console.log("Generating log file...");
    
    // SECTION A: NOISE TRAFFIC
    for (let i = 0; i < 400000; i++) {
        const line = generateNoiseLine();
        const canContinue = stream.write(line);
        if (!canContinue) {
            await new Promise(resolve => stream.once('drain', resolve));
        }
        // Advance time by ~100-300ms on average per request
        currentTime += randInt(50, 400);
        
        // Add random red herrings
        if (Math.random() < 0.0001 && i < 399000) {
            const rh = randItem(RED_HERRING_PAYLOADS);
            const rhBytes = randInt(200, 50000);
            const rhUa = randItem(USER_AGENTS);
            const ref = '-';
            const logLine = `10.0.0.99 - - [${formatDate(currentTime)}] "${rh}" 403 ${rhBytes} "${ref}" "${rhUa}"\n`;
            stream.write(logLine);
        }
    }

    // SECTION B: ATTACKER RECON PHASE
    // Fast forward to exactly 2025-03-11 02:14:00 UTC
    currentTime = new Date('2025-03-11T02:14:00Z').getTime();
    
    const attackLines = [
        `192.168.99.47 - - [${formatDate(currentTime)}] "GET /robots.txt HTTP/1.1" 200 ${randInt(200, 1000)} "-" "python-requests/2.31.0"`,
        `192.168.99.47 - - [${formatDate(currentTime += 45000)}] "GET /.env HTTP/1.1" 403 ${randInt(200, 1000)} "-" "python-requests/2.31.0"`,
        `192.168.99.47 - - [${formatDate(currentTime += 23000)}] "GET /config.php HTTP/1.1" 403 ${randInt(200, 1000)} "-" "python-requests/2.31.0"`,
        `192.168.99.47 - - [${formatDate(currentTime += 18000)}] "GET /admin/ HTTP/1.1" 403 ${randInt(200, 1000)} "-" "python-requests/2.31.0"`,
        `192.168.99.47 - - [${formatDate(currentTime += 32000)}] "GET /backup.zip HTTP/1.1" 404 ${randInt(200, 1000)} "-" "python-requests/2.31.0"`,
        `192.168.99.47 - - [${formatDate(currentTime += 41000)}] "GET /wp-login.php HTTP/1.1" 404 ${randInt(200, 1000)} "-" "python-requests/2.31.0"`,
        `192.168.99.47 - - [${formatDate(currentTime += 55000)}] "GET /.git/config HTTP/1.1" 403 ${randInt(200, 1000)} "-" "python-requests/2.31.0"`,
        `192.168.99.47 - - [${formatDate(currentTime += 61000)}] "POST /login.php HTTP/1.1" 401 ${randInt(500, 800)} "-" "python-requests/2.31.0"`,
        `192.168.99.47 - - [${formatDate(currentTime += 3000)}] "POST /login.php HTTP/1.1" 401 ${randInt(500, 800)} "-" "python-requests/2.31.0"`,
        `192.168.99.47 - - [${formatDate(currentTime += 3000)}] "POST /login.php HTTP/1.1" 401 ${randInt(500, 800)} "-" "python-requests/2.31.0"`,
        `192.168.99.47 - - [${formatDate(currentTime += 3000)}] "POST /login.php HTTP/1.1" 200 ${randInt(3000, 5000)} "-" "python-requests/2.31.0"`,
        `192.168.99.47 - - [${formatDate(currentTime += 15000)}] "GET /dashboard.php HTTP/1.1" 200 ${randInt(3000, 5000)} "http://192.168.99.47/login.php" "python-requests/2.31.0"`,
        `192.168.99.47 - - [${formatDate(currentTime += 42000)}] "GET /admin/users.php HTTP/1.1" 200 ${randInt(3000, 5000)} "http://192.168.99.47/dashboard.php" "python-requests/2.31.0"`,
        `192.168.99.47 - - [${formatDate(currentTime += 37000)}] "GET /admin/config.php HTTP/1.1" 200 ${randInt(3000, 5000)} "http://192.168.99.47/admin/users.php" "python-requests/2.31.0"`
    ];

    for (const line of attackLines) {
        stream.write(line + '\n');
        // Add a bit of realistic noise during the 8 minute recon phase to mix it up
        for(let n=0; n<5; n++) {
            stream.write(generateNoiseLine(currentTime + randInt(-10000, 10000)));
        }
    }

    // SECTION C: EXFILTRATION PHASE
    // Need exactly the specified lines at exactly the given times.
    const exfilLines = [
        `192.168.99.47 - - [11/Mar/2025:02:22:47 +0000] "POST /upload.php?chunk=1&data=R0VOUFJQR1N7eTB0Xw==&session=a3f9 HTTP/1.1" 200 312 "http://192.168.99.47/dashboard.php" "python-requests/2.31.0"`,
        `192.168.99.47 - - [11/Mar/2025:02:22:51 +0000] "POST /upload.php?chunk=2&data=NGE0eWxmMWZf&session=a3f9 HTTP/1.1" 200 312 "http://192.168.99.47/dashboard.php" "python-requests/2.31.0"`,
        `192.168.99.47 - - [11/Mar/2025:02:22:54 +0000] "POST /upload.php?chunk=3&data=M2tzeV9xM2cz&session=a3f9 HTTP/1.1" 200 312 "http://192.168.99.47/dashboard.php" "python-requests/2.31.0"`,
        `192.168.99.47 - - [11/Mar/2025:02:22:58 +0000] "POST /upload.php?chunk=4&data=cGczcX0=&session=a3f9 HTTP/1.1" 200 312 "http://192.168.99.47/dashboard.php" "python-requests/2.31.0"`
    ];

    for (const exactLine of exfilLines) {
        stream.write(exactLine + '\n');
    }

    // Cleanup phase
    currentTime = new Date('2025-03-11T02:23:05Z').getTime();
    stream.write(`192.168.99.47 - - [${formatDate(currentTime)}] "DELETE /upload.php?session=a3f9 HTTP/1.1" 200 156 "http://192.168.99.47/dashboard.php" "python-requests/2.31.0"\n`);
    currentTime += 4000;
    stream.write(`192.168.99.47 - - [${formatDate(currentTime)}] "GET /logout.php HTTP/1.1" 302 0 "http://192.168.99.47/dashboard.php" "python-requests/2.31.0"\n`);

    // SECTION D: POST-ATTACK NOISE
    for (let i = 0; i < 100000; i++) {
        const line = generateNoiseLine();
        const canContinue = stream.write(line);
        if (!canContinue) {
            await new Promise(resolve => stream.once('drain', resolve));
        }
        currentTime += randInt(50, 400);

        // More red herrings scattered
        if (Math.random() < 0.0003) {
            const rh = randItem(RED_HERRING_PAYLOADS);
            const rhBytes = randInt(200, 50000);
            const rhUa = randItem(USER_AGENTS);
            const ref = '-';
            const logLine = `10.0.0.99 - - [${formatDate(currentTime)}] "${rh}" 403 ${rhBytes} "${ref}" "${rhUa}"\n`;
            stream.write(logLine);
        }
    }

    stream.end(() => {
        console.log("Log generation complete. File size ~50MB.");
    });
}

writeLog().catch(console.error);
