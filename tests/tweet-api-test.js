// tweet-api-test.js
const fetch = require('node-fetch');

const CORS_PROXY_URL = 'https://roam-tweet-extract.glitch.me/';
const BASE_URL = `https://tweethunter.io/api/thread?tweetId=`;

const testTweets = [
    '1884354207324500135',        // Test x.com variant
];

async function testTweetAPI(tweetURL) {
    console.log(`\nTesting URL: ${tweetURL}`);
    
    try {
        const response = await fetch(`${BASE_URL}${tweetURL}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Tweet-Extract-Test/1.0'
            }
        });

        console.log('Status:', response.status);
        console.log('Headers:', Object.fromEntries(response.headers));

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response Data:', JSON.stringify(data, null, 2));

        // Test specific data points
        if (Array.isArray(data) && data.length > 0) {
            const tweet = data[0];
            console.log('\nValidating tweet data:');
            console.log('- Has photos:', Array.isArray(tweet.photos));
            console.log('- Has text:', typeof tweet.text === 'string');
            console.log('- Has created_at:', typeof tweet.created_at === 'string');
        }

        return {
            success: true,
            data: data
        };

    } catch (error) {
        console.error('Error testing tweet:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function runTests() {
    console.log('Starting API Tests');
    console.log('=================');
    console.log('CORS Proxy URL:', CORS_PROXY_URL);
    
    const results = [];
    
    for (const tweetURL of testTweets) {
        const result = await testTweetAPI(tweetURL);
        results.push({
            url: tweetURL,
            ...result
        });
    }

    console.log('\nTest Summary');
    console.log('============');
    results.forEach(result => {
        console.log(`${result.url}: ${result.success ? '✅ Passed' : '❌ Failed'}`);
        if (!result.success) {
            console.log(`  Error: ${result.error}`);
        }
    });
}

// Run as standalone script
if (require.main === module) {
    runTests().catch(console.error);
}

// Export for use in test framework
module.exports = {
    testTweetAPI,
    runTests
};