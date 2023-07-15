  Roam Research Plugin to extract saved tweet text into your graph. 
  
  *NOTE: Because of recent changes to Twitter's API, if the API is unstable image extraction is temporarily disabled*
  
  To set up the format of your extracted tweet a simple template system is included, found in the Roam Depot plugin settings panel. For each supported `{OPTION}` the variable will be replaced with the extracted tweet information.

  Options available to the template are `{TWEET}`, `{URL}`, `{AUTHOR_NAME}`, `{AUTHOR_HANDLE}`, `{AUTHOR_URL}`, `{DATE}`, `{NEWLINE}`, `{IMAGES}`.  A default temlpate is included.

  `[[>]] {TWEET} {NEWLINE} [🐦]({URL}) by {AUTHOR_HANDLE} on [[{DATE}]]`
  


  To trigger the tweet extraction you have two options: Right click plugin or keyboard shortcut

  To trigger via a keyboard shortcut click into the block and hit a `CTRL` + `SHIFT` + `E`.
  
## Auto Extract
  If set, tagged tweets and threads will be automatically extracted when roam loads. This is particularly useful when using a Quick Caption solution on mobile. When browsing twitter share a tweet to roam and tag the block before sending it. Next time you load up your graph the tweet or thread will be automatically extracted.

## Example 
  <img src="https://github.com/8bitgentleman/roam-depot-tweet-extract/raw/main/example.gif" max-width="400"></img>
  
## Added Info
To extract images from tweets a simple custom CORS proxy has been utalized. There is _zero_ private data to be concerned about in using the included instance. Only the public tweet URL is sent through the proxy. 

Click the button below and you will get a Glitch Remix of the proxy if you would like to check out the code.

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button-v2.svg)](https://glitch.com/edit/#!/roam-tweet-extract)

        
