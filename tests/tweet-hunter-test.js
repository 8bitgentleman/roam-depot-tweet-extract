// tweet-hunter-test.js
const fetch = require('node-fetch');

const TEST_TWEET_IDS = [
    '1883260099252338870',
];

async function testTweetHunterAPI(tweetId) {
    console.log(`\nTesting Tweet ID: ${tweetId}`);
    
    try {
        const response = await fetch(`https://tweethunter.io/api/thread?tweetId=${tweetId}`, {
            headers: {
                "accept": "application/json",
                "accept-language": "en-US,en;q=0.5",
                "sec-ch-ua": "\"Not A(Brand\";v=\"8\", \"Chromium\";v=\"132\", \"Brave\";v=\"132\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "Referer": "https://tweethunter.io/tweetpik",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            method: "GET"
        });

        console.log('Status:', response.status);
        console.log('Headers:', Object.fromEntries(response.headers));

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response Data:', JSON.stringify(data, null, 2));

        // Validate response structure
        if (data) {
            console.log('\nValidating tweet data:');
            console.log('- Has thread:', Array.isArray(data.thread));
            if (data.thread && data.thread.length > 0) {
                const firstTweet = data.thread[0];
                console.log('- Has text:', typeof firstTweet.text === 'string');
                console.log('- Has media:', Array.isArray(firstTweet.media));
                console.log('- Has created_at:', typeof firstTweet.created_at === 'string');
            }
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
    console.log('Starting TweetHunter API Tests');
    console.log('============================');
    
    const results = [];
    
    for (const tweetId of TEST_TWEET_IDS) {
        const result = await testTweetHunterAPI(tweetId);
        results.push({
            tweetId: tweetId,
            ...result
        });
    }

    console.log('\nTest Summary');
    console.log('============');
    results.forEach(result => {
        console.log(`Tweet ${result.tweetId}: ${result.success ? '✅ Passed' : '❌ Failed'}`);
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
    testTweetHunterAPI,
    runTests
};