#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage : ./start.sh [--frontend-only]\nPORT=5550 HOST=127.0.0.1 ./start.sh\nDémarre Vite et Ollama (localhost:11434). Ctrl+C arrête les processus créés ici.');
  process.exit(0);
}
if (args.some(arg => arg !== '--frontend-only')) {
  console.error('Option inconnue. Utilisez --help.'); process.exit(1);
}
const port = Number(process.env.PORT || 5550), host = process.env.HOST || '127.0.0.1';
const children = new Set();
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  const deadline = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
  }, 4000);
  Promise.all([...children].map(child => new Promise(resolve => child.once('exit', resolve))))
    .then(() => { clearTimeout(deadline); process.exit(code); });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
function launch(command, arguments_, env = process.env) {
  const child = spawn(command, arguments_, { cwd: root, env, stdio: 'inherit' });
  children.add(child);
  child.on('error', error => {
    children.delete(child);
    console.error(`Impossible de démarrer ${command} : ${error.message}`);
    stop(1);
  });
  child.on('exit', code => {
    children.delete(child);
    if (!stopping) { console.error(`${command} s’est arrêté (${code}).`); stop(1); }
  });
  return child;
}
async function ollamaReady() {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags', {signal: AbortSignal.timeout(1000)});
    return response.ok && Array.isArray((await response.json()).models);
  } catch { return false; }
}
async function freePort(port, host) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(port, host, () => server.close(resolve));
  });
}
try {
  if (Number(process.versions.node.split('.')[0]) < 20) throw Error('Node.js 20 ou supérieur est requis.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('PORT doit être un entier entre 1 et 65535.');
  if (!existsSync(new URL('../node_modules/vite/package.json', import.meta.url))) {
    throw Error(`Dépendances absentes. Exécutez npm ci dans : ${root}`);
  }
  try { await freePort(port, host); }
  catch (error) { throw Error(`Frontend ${host}:${port} indisponible (${error.code}). Arrêtez le serveur existant ou utilisez PORT=5551 ./start.sh.`); }
  if (!args.includes('--frontend-only')) {
    if (await ollamaReady()) {
      console.log('Backend Ollama existant réutilisé : http://127.0.0.1:11434');
    } else {
      await freePort(11434, '127.0.0.1');
      console.log('Démarrage du backend Ollama…');
      launch('ollama', ['serve'], {...process.env, OLLAMA_HOST: '127.0.0.1:11434'});
      const deadline = Date.now() + 30000;
      while (!stopping && !(await ollamaReady())) {
        if (Date.now() > deadline) throw Error('Ollama ne répond pas après 30 secondes. Consultez les erreurs ci-dessus.');
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }
  if (!stopping) {
    console.log('Démarrage du frontend. Ctrl+C pour arrêter cette session.');
    launch(process.execPath, ['scripts/dev.js'], {...process.env, PORT: String(port), HOST: host, STRICT_PORT: '1'});
  }
} catch (error) {
  console.error(error.message);
  stop(1);
}
