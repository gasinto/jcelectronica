// ============================================
//  JC Electrónica — Servidor Local
//  Node.js PURO — sin dependencias externas
//  Ejecutar: node server.js
//  Después abrir: http://localhost:3000
// ============================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
  // Ruta del archivo solicitado
  let reqPath = decodeURIComponent(req.url.split('?')[0]); // sacar query params + decodificar

  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // 404
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>404 - Archivo no encontrado</h1><p>${reqPath}</p>`);
      } else {
        // Error del sistema
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>Error del servidor</h1><p>${err.message}</p>`);
      }
      return;
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║     JC Electrónica — Servidor Local     ║');
  console.log('  ╠══════════════════════════════════════════╣');
  console.log('  ║                                         ║');
  console.log(`  ║  ►  http://localhost:${PORT}/               ║`);
  console.log(`  ║  ►  http://localhost:${PORT}/catalogo.html ║`);
  console.log(`  ║  ►  http://localhost:${PORT}/servicios.html║`);
  console.log(`  ║  ►  http://localhost:${PORT}/gestion.html  ║`);
  console.log('  ║                                         ║');
  console.log('  ║  Para salir: Ctrl + C                   ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});
