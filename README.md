  Roam Research Plugin to extract saved tweet text into your graph. Works with both twitter.com and x.com links.
  
  To set up the format of your extracted tweet a simple template system is included, found in the Roam Depot plugin settings panel. For each supported `{OPTION}` the variable will be replaced with the extracted tweet information.

  Options available to the template are `{TWEET}`, `{URL}`, `{AUTHOR_NAME}`, `{AUTHOR_HANDLE}`, `{AUTHOR_URL}`, `{DATE}`, `{NEWLINE}`, `{IMAGES}`.  A default template is included.

  `[[>]] {TWEET} {NEWLINE} [🐦]({URL}) by {AUTHOR_NAME} on [[{DATE}]]`
  


  To trigger the tweet extraction you have two options: Right click plugin or keyboard shortcut

  To trigger via a keyboard shortcut click into the block and hit a `CTRL` + `SHIFT` + `E`.
  
## Threads
  To extract a complete thread use `Extract Tweet Thread`, from the right click menu or the command palette, on a block that links to any tweet in the thread. The first tweet of the thread replaces the block and the rest of the thread is added below it as child blocks, in order. Every tweet is formatted with your template and images follow the `Image Location` setting.

  If the linked tweet is a reply to someone else, the tweets it is replying to are extracted as well. There is no default keyboard shortcut for threads, you can set one in Roam's hotkey settings.

## Auto Extract
  If set, tagged tweets and threads will be automatically extracted when roam loads. Blocks tagged with the `Auto Tweet Extract Tag` (default `tweet-extract`) are extracted as single tweets, blocks tagged with the `Auto Thread Extract Tag` (default `thread-extract`) as complete threads. This is particularly useful when using a Quick Caption solution on mobile. When browsing twitter share a tweet to roam and tag the block before sending it. Next time you load up your graph the tweet or thread will be automatically extracted.

## Example 
  <img src="https://github.com/8bitgentleman/roam-depot-tweet-extract/raw/main/example.gif" max-width="400"></img>
