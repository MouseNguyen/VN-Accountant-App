
const fs = require('fs');
const path = require('path');

const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

async function testApiKey() {
    let apiKey = process.env.GOOGLE_CLOUD_API_KEY;

    if (!apiKey) {
        try {
            const envPath = path.resolve(__dirname, '../.env');
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/GOOGLE_CLOUD_API_KEY=["']?([^"'\n\r]+)["']?/);
            if (match) {
                apiKey = match[1];
            }
        } catch (e) {
            console.error('Could not read .env file', e);
        }
    }

    if (!apiKey) {
        console.error('❌ GOOGLE_CLOUD_API_KEY not found in .env or process.env');
        return;
    }

    console.log('🔑 Testing API Key:', apiKey.substring(0, 10) + '...');

    // 1x1 pixel white image (base64)
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

    const requestBody = {
        requests: [
            {
                image: {
                    content: base64Image,
                },
                features: [
                    {
                        type: 'TEXT_DETECTION',
                        maxResults: 1,
                    },
                ],
            },
        ],
    };

    try {
        const response = await fetch(`${GOOGLE_VISION_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ API Request Failed:', response.status);
            console.error('⚠️ Error Details:', JSON.stringify(data, null, 2));
        } else {
            console.log('✅ API Connection Successful!');
            if (data.responses && data.responses[0].error) {
                console.error('❌ Logic Error:', data.responses[0].error.message);
            } else {
                console.log('✅ API returned valid response (even if no text found, which is expected for 1px image).');
            }
        }

    } catch (error) {
        console.error('❌ Network/System Error:', error);
    }
}

testApiKey();
