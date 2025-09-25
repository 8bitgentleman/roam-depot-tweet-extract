// Copy and paste this into your browser console when on a Roam page
(async () => {
    async function testTweetAPIConsole(tweetURL) {
        const CORS_PROXY_URL = 'https://roam-tweet-extract.glitch.me/';
        const BASE_URL = `${CORS_PROXY_URL}https://tweetpik.com/api/v2/tweets?url=`;
        
        console.log(`Testing URL: ${tweetURL}`);
        console.log(`Using proxy: ${CORS_PROXY_URL}`);
        
        try {
            const response = await fetch(`${BASE_URL}${tweetURL}`);
            console.log('Status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
    
            const data = await response.json();
            console.log('Response Data:', data);
            
            // Test specific data points
            if (Array.isArray(data) && data.length > 0) {
                const tweet = data[0];
                console.log('\nValidating tweet data:');
                console.log('- Has photos:', Array.isArray(tweet.photos));
                console.log('- Has text:', typeof tweet.text === 'string');
                console.log('- Has created_at:', typeof tweet.created_at === 'string');
            }
            
            return data;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }
    const data = await testTweetAPIConsole('https://x.com/TylerAlterman/status/1884354207324500135');
    return data;
  })();

