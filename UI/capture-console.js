const { WebSocket } = require('ws');
const { spawn } = require('child_process');
const http = require('http');

const CHROME = '/usr/bin/google-chrome';
const PORT = 9222;
const URL = 'http://127.0.0.1:8001/';

async function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getTarget() {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}/json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const tabs = JSON.parse(data);
          resolve(tabs.find(t => t.url === URL) || tabs[0]);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function send(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for ' + method)), 5000);
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        clearTimeout(timeout);
        ws.removeListener('message', handler);
        resolve(msg);
      }
    };
    ws.on('message', handler);
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  const chrome = spawn(CHROME, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${PORT}`,
    URL,
  ]);

  await waitFor(4000);

  const target = await getTarget();
  if (!target) {
    console.log('No target found');
    chrome.kill();
    process.exit(1);
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);

  ws.on('open', async () => {
    try {
      await send(ws, 'Runtime.enable');
      await send(ws, 'Log.enable');
      await waitFor(5000);

      const errorsResult = await send(ws, 'Runtime.evaluate', {
        expression: 'JSON.stringify(window.__nextError || [])',
        returnByValue: true,
      });
      console.log('[window.__nextError]', errorsResult.result && errorsResult.result.value);

      const boundaryResult = await send(ws, 'Runtime.evaluate', {
        expression: 'document.querySelector("#__next_error__") ? document.querySelector("#__next_error__").innerText : "no error boundary"',
        returnByValue: true,
      });
      console.log('[error boundary]', boundaryResult.result && boundaryResult.result.value);

      const consoleErrors = await send(ws, 'Runtime.evaluate', {
        expression: 'JSON.stringify(window.console.error ? "console.error exists" : "no console.error")',
        returnByValue: true,
      });
      console.log('[console.error]', consoleErrors.result && consoleErrors.result.value);
    } catch (err) {
      console.error('Error during evaluation:', err.message);
    }

    ws.close();
    chrome.kill();
    process.exit(0);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    chrome.kill();
    process.exit(1);
  });

  setTimeout(() => {
    console.log('Timeout');
    ws.close();
    chrome.kill();
    process.exit(0);
  }, 20000);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
