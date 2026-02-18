const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const adminCreds = JSON.stringify({
  email: 'hossam@sezar.com',
  password: 'Hossam@2026'
});

function login(creds) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Login failed: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(creds);
    req.end();
  });
}

function createDriver(token, password) {
  return new Promise((resolve, reject) => {
    const driverOpts = {
      ...options,
      path: '/api/v1/drivers',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const payload = JSON.stringify({
      name: 'Test Driver',
      email: `testdriver_${Date.now()}@fleet.com`,
      phone: `123456789${Date.now() % 10}`,
      temporaryPassword: password,
      licenseNumber: `D${Date.now()}`
    });

    const req = http.request(driverOpts, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(payload);
    req.end();
  });
}

async function run() {
  try {
    console.log('Logging in as admin...');
    const loginRes = await login(adminCreds);
    const token = loginRes.token || loginRes.accessToken || loginRes.jwt;
    console.log('Got token:', token ? 'YES' : 'NO');

    const passwords = [
      'TempPass123!', // From TC003
      'Driver@1234',  // From TC007
    ];

    for (const pwd of passwords) {
      console.log(`Testing password: ${pwd}`);
      const res = await createDriver(token, pwd);
      console.log(`Status: ${res.statusCode}`);
      console.log(`Body: ${res.body}`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
