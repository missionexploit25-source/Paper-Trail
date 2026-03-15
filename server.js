const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/download/access.log', (req, res) => {
    res.setHeader('Content-Disposition', 'attachment; filename="access.log"');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('X-Challenge-Note', 'The truth is in the POST requests.');
    res.sendFile(path.join(__dirname, 'logs', 'access.log'));
});

app.get('/hint/:level', (req, res) => {
    const level = req.params.level;
    console.log(`[HINT] Level ${level} requested from ${req.ip}`);

    if (level === '1') {
        res.setHeader('X-Investigator-Note', 'grep -c "192.168" access.log');
        return res.json({ hint: "Look carefully at who made the mistakes — and who didn't." });
    }
    
    if (level === '2') {
        res.setHeader('Content-Disposition', 'attachment; filename="server_health_report.txt"');
        res.setHeader('Content-Type', 'text/plain');
        return res.send(`SYSTEM HEALTH REPORT — 2025-03-11
=====================================
CPU: Normal
Memory: Normal
Disk: Normal
Network anomaly detected: 02:14 - 02:23 UTC
Source: Single internal IP, high request rate
Method pattern: Recon → Auth → POST sequence
Recommended action: grep "POST /upload.php" access.log
=====================================
Note: Check the data= parameter values. They look encoded.`);
    }

    if (level === '3') {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', 'inline; filename="debug_screenshot.png"');
        return res.send(`You found a "corrupted" screenshot. Or did you?

The attacker was sloppy. They left breadcrumbs:
  1. IP address: starts with 192.168.99
  2. Tool used: python-requests (check the User-Agent)
  3. They uploaded in chunks — look for chunk=1, chunk=2...
  4. The data= values are Base64. Collect all 4.
  5. Decode Base64 → you get something. But it's still not the flag.
  6. One more step. Think Caesar. Think ROT.`);
    }

    if (level === '4') {
        res.setHeader('Content-Type', 'application/javascript');
        return res.send(`/* 
 * Analytics Snippet v2.1.4 
 * Copyright (c) 2024
 */
!function(){"use strict";var e,t,n,r;function o(e,t){return(o=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e})(e,t)}
function i(e,t){e.prototype=Object.create(t.prototype),e.prototype.constructor=e,o(e,t)}
var a="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{};
function s(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}
/* forensics_key: collect chunks 1-4 from data= params, b64decode, rot13 */
function c(e){var t=typeof e;return null!=e&&("object"==t||"function"==t)}
var u="object"==typeof a&&a&&a.Object===Object&&a,l="typeof window==='object'&&window&&window.Object===Object&&window",f="object"==typeof self&&self&&self.Object===Object&&self,p=u||l||f||Function("return this")();
function d(){for(var e=0,t=arguments.length,n=new Array(t);e<t;e++)n[e]=arguments[e];return n}
function h(){return p.Date.now()}
var v={};v.isObject=c;v.now=h;
var y=0;function m(e){return(y++).toString(36)+Math.random().toString(36).substr(2,10)}
var g=m();v.id=g;
if(typeof window!=="undefined"&&window.document){
  var x=window.document.createElement("script");
  x.type="text/javascript";x.async=!0;
  x.src="https://static.analytics.fake/v2.js";
  var b=window.document.getElementsByTagName("script")[0];
  b.parentNode.insertBefore(x,b);
}}();
`);
    }

    res.status(404).send('Hint not found.');
});

app.post('/submit', (req, res) => {
    const { flag } = req.body;
    
    if (flag === "TRACECTF{l0g_4n4lys1s_3xf1l_d3t3ct3d}") {
        return res.json({
            correct: true,
            message: "INTRUSION CONFIRMED. Flag accepted. Attacker exfiltrated internal credentials.",
            score: 500
        });
    }

    if (flag && flag.startsWith("TRACECTF{")) {
        return res.json({
            correct: false,
            message: "Format is right. Content is wrong. Keep digging."
        });
    }

    return res.json({
        correct: false,
        message: "That doesn't look like a TRACECTF flag."
    });
});

app.listen(PORT, () => {
    console.log(`CTF Paper Trail server running on port ${PORT}`);
});
