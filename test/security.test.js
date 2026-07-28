const assert = require('assert');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const serverPath = path.join(repositoryRoot, 'src', 'web', 'server.js');
const legacyConfigPath = path.join(repositoryRoot, 'src', 'config.js');
const adminUser = 'security-test';
const adminPassword = 'security-test-password';
const baseTestEnvironment = {
  ...process.env,
  TRACKER_REGULAR_URL: 'https://example.com/regular',
  TRACKER_MOBILE_URL: 'https://example.com/mobile'
};

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function request(port, pathname, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      host: '127.0.0.1',
      port,
      path: pathname,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(requestOptions, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });

    req.once('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

function waitForServer(child, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error(`Server did not start. Output: ${output}`));
    }, timeoutMs);

    const inspect = (chunk) => {
      output += chunk.toString();
      if (output.includes('running on')) {
        clearTimeout(timeout);
        resolve();
      }
    };

    child.stdout.on('data', inspect);
    child.stderr.on('data', inspect);
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited before startup with code ${code}. Output: ${output}`));
    });
  });
}

function waitForExit(child, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Process did not exit as expected'));
    }, timeoutMs);

    child.once('exit', (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
}

async function main() {
  const configSource = fs.readFileSync(legacyConfigPath, 'utf8');
  assert.doesNotMatch(
    configSource,
    /TRACKER_EMAIL_(?:SENDER|RECIPIENT|PASSWORD)',\s*'[^']+'/,
    'Sensitive email settings must not have literal fallbacks'
  );

  const missingCredentialsChild = spawn(process.execPath, [serverPath], {
    cwd: repositoryRoot,
    env: {
      ...baseTestEnvironment,
      TRACKER_WEB_ADMIN_USER: '',
      TRACKER_WEB_ADMIN_PASSWORD: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const missingCredentialsExit = await waitForExit(missingCredentialsChild);
  assert.notStrictEqual(
    missingCredentialsExit,
    0,
    'The management server must fail closed without credentials'
  );

  const port = await reservePort();
  const child = spawn(process.execPath, [serverPath], {
    cwd: repositoryRoot,
    env: {
      ...baseTestEnvironment,
      HOST: '127.0.0.1',
      PORT: String(port),
      TRACKER_WEB_ADMIN_USER: adminUser,
      TRACKER_WEB_ADMIN_PASSWORD: adminPassword
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForServer(child);

    const health = await request(port, '/health');
    assert.strictEqual(health.statusCode, 200);
    assert.deepStrictEqual(JSON.parse(health.body), { status: 'ok' });

    const unauthorized = await request(port, '/api/status');
    assert.strictEqual(unauthorized.statusCode, 401);
    assert.match(unauthorized.headers['www-authenticate'], /^Basic /);

    const authorization = `Basic ${Buffer.from(
      `${adminUser}:${adminPassword}`
    ).toString('base64')}`;

    const authorized = await request(port, '/api/status', {
      headers: { Authorization: authorization }
    });
    assert.strictEqual(authorized.statusCode, 200);
    assert.strictEqual(authorized.headers['cache-control'], 'no-store');

    const missingMutationHeader = await request(port, '/api/stop', {
      method: 'POST',
      headers: { Authorization: authorization }
    });
    assert.strictEqual(missingMutationHeader.statusCode, 403);

    const crossSiteMutation = await request(port, '/api/stop', {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Sec-Fetch-Site': 'cross-site',
        'X-Tracker-Admin': '1'
      }
    });
    assert.strictEqual(crossSiteMutation.statusCode, 403);

    const authorizedMutation = await request(port, '/api/stop', {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'X-Tracker-Admin': '1'
      }
    });
    assert.strictEqual(authorizedMutation.statusCode, 200);
  } finally {
    child.kill();
    await waitForExit(child).catch(() => {});
  }

  console.log('Security regression tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
