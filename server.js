import { createServer } from 'http';
import { createReadStream, existsSync } from 'fs';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = join(__dirname, 'dist');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2',
};

function sendFile(res, filePath) {
  const ext = extname(filePath).toLowerCase();
  const contentType = contentTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(res);
}

const server = createServer((req, res) => {
  const requestPath = req.url?.split('?')[0] || '/';

  if (requestPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end('{"status":"ok"}');
    return;
  }

  const safePath = normalize(requestPath).replace(/^([.][.][/\\])+/, '');
  const filePath = join(distDir, safePath === '/' ? 'index.html' : safePath);

  if (existsSync(filePath)) {
    sendFile(res, filePath);
    return;
  }

  const spaIndex = join(distDir, 'index.html');
  if (existsSync(spaIndex)) {
    sendFile(res, spaIndex);
    return;
  }

  res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Build output not found. Ensure the dist folder is deployed.');
});

const port = Number(process.env.PORT || 8080);
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
