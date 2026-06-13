const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3010;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  // Parse query parameters out first
  let reqUrl = req.url;
  const qIdx = reqUrl.indexOf('?');
  if (qIdx !== -1) {
    reqUrl = reqUrl.substring(0, qIdx);
  }

  let filePath = path.join(__dirname, reqUrl);
  if (filePath === __dirname || filePath === path.join(__dirname, '\\') || filePath === path.join(__dirname, '/')) {
    filePath = path.join(__dirname, 'popup.html');
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Internal Server Error: ' + error.code + '\n');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
