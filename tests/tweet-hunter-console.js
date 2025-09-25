// Copy and paste this into your browser console

async function testTweetHunterConsole(tweetId) {
    console.log(`Testing Tweet ID: ${tweetId}`);
    
    try {
        const response = await fetch(`https://tweethunter.io/api/thread?tweetId=${tweetId}`, {
            headers: {
                "accept": "application/json",
                "accept-language": "en-US,en;q=0.5",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "Referer": "https://tweethunter.io/tweetpik",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            method: "GET"
        });

        console.log('Status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);
        
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
        
        return data;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// Example usage:
// testTweetHunterConsole('1884354207324500135');