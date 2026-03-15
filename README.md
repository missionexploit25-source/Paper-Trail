# TRACECTF — Paper Trail

## Setup (run in order)
  npm install
  node generate-log.js     ← generates the 50MB access.log (takes ~30 seconds)
  node server.js           ← starts challenge server on port 3000

## For Players
  Visit: http://localhost:3000
  Download the access log from the challenge page
  Investigate the log using grep, strings, CyberChef

## Flag format
  TRACECTF{...}

## Intended solution path
  1. grep for 40x/50x status codes to find attack pattern
  2. grep for POST requests — narrow to /upload.php
  3. Extract data= parameter values from the 4 POST requests
  4. Assemble the 4 Base64 strings in chunk order
  5. Base64 decode the assembled string
  6. Apply ROT13 to the decoded result
  7. Read the flag

## Tools recommended
  grep, strings, CyberChef, curl, Burp Suite
