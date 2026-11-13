  Roam Research Plugin to extract saved tweet text into your graph. Works with both twitter.com and x.com links.
  
  To set up the format of your extracted tweet a simple template system is included, found in the Roam Depot plugin settings panel. For each supported `{OPTION}` the variable will be replaced with the extracted tweet information.

  Options available to the template are `{TWEET}`, `{URL}`, `{AUTHOR_NAME}`, `{AUTHOR_HANDLE}`, `{AUTHOR_URL}`, `{DATE}`, `{NEWLINE}`, `{IMAGES}`.  A default template is included.

  `[[>]] {TWEET} {NEWLINE} [🐦]({URL}) by {AUTHOR_NAME} on [[{DATE}]]`
  


  To trigger the tweet extraction you have two options: Right click plugin or keyboard shortcut

  To trigger via a keyboard shortcut click into the block and hit a `CTRL` + `SHIFT` + `E`.
  
## Threads
  By default `Extract Tweet` extracts the single tweet you linked to. Two switches in the settings panel let it bring in more of the conversation:

  - `Extract Full Thread`: extract the whole thread the tweet belongs to, whichever tweet of the thread you linked to.
  - `Include Replied-to Tweets`: when the tweet is a reply, also extract the tweets it is replying to.

  With either switch on, the oldest tweet replaces the block and the rest are added below it as child blocks, in order. Every tweet is formatted with your template and images follow the `Image Location` setting.

## Auto Extract
  If set, tagged tweets and threads will be automatically extracted when roam loads. Blocks tagged with the `Auto Tweet Extract Tag` (default `tweet-extract`) are extracted the way `Extract Tweet` would, blocks tagged with the `Auto Thread Extract Tag` (default `thread-extract`) always as complete threads. This is particularly useful when using a Quick Caption solution on mobile. When browsing twitter share a tweet to roam and tag the block before sending it. Next time you load up your graph the tweet or thread will be automatically extracted.

## Example 
  <img src="https://github.com/8bitgentleman/roam-depot-tweet-extract/raw/main/example.gif" max-width="400"></img>
