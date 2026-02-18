async function testValidation() {
  const baseUrl = 'http://localhost:3000/api/v1';
  let token = '';

  try {
    console.log('Logging in...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fleet.com',
        password: 'Admin@2024'
      })
    });
    
    if (!loginRes.ok) throw new Error(`Login failed with status ${loginRes.status}`);
    const loginData = await loginRes.json();
    token = loginData.accessToken;

    const testCases = [
      { name: 'Valid: ar', data: { language_preference: 'ar' }, expected: 200 },
      { name: 'Valid: en', data: { language_preference: 'en' }, expected: 200 },
      { name: 'Invalid: fr', data: { language_preference: 'fr' }, expected: 400 },
      { name: 'Invalid: AR (Case)', data: { language_preference: 'AR' }, expected: 400 },
      { name: 'Invalid: ar space', data: { language_preference: 'ar ' }, expected: 400 },
      { name: 'Invalid: injection', data: { language_preference: "ar'; DROP TABLE users;" }, expected: 400 },
      { name: 'Invalid: null', data: { language_preference: null }, expected: 400 },
    ];

    for (const tc of testCases) {
      console.log(`Testing ${tc.name}...`);
      const res = await fetch(`${baseUrl}/drivers/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tc.data)
      });

      if (res.status === tc.expected) {
        console.log(`✅ ${tc.name} PASSED (Status ${res.status})`);
      } else {
        console.log(`❌ ${tc.name} FAILED (Got ${res.status}, Expected ${tc.expected})`);
        if (res.status !== 200) {
            const errBody = await res.json();
            console.log('   Error body:', JSON.stringify(errBody));
        }
      }
    }

  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

testValidation();
