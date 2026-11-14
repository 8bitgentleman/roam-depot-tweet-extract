  Roam Research Plugin to extract saved tweet text into your graph. Works with both twitter.com and x.com links.
  
  To set up the format of your extracted tweet a simple template system is included, found in the Roam Depot plugin settings panel. For each supported `{OPTION}` the variable will be replaced with the extracted tweet information.

  Options available to the template are `{TWEET}`, `{URL}`, `{AUTHOR_NAME}`, `{AUTHOR_HANDLE}`, `{AUTHOR_URL}`, `{DATE}`, `{NEWLINE}`, `{IMAGES}`.  A default template is included.

  `[[>]] {TWEET} {NEWLINE} [🐦]({URL}) by {AUTHOR_NAME} on [[{DATE}]]`
  


  To trigger the tweet extraction you have two options: Right click plugin or keyboard shortcut

  To trigger via a keyboard shortcut click into the block and hit a `CTRL` + `SHIFT` + `E`.
  
## Threads
  `Extract Tweet` always extracts just the linked tweet, even when it is part of a thread. To extract the complete thread instead, use `Extract Tweet Thread`, from the right click menu or the command palette. It extracts the whole thread the tweet belongs to, whichever tweet of the thread you linked to: the first tweet replaces the block and the rest of the thread is added below it as child blocks, in order. It has no keyboard shortcut by default; you can set one in Roam's hotkey settings.

## Auto Extract
  If set, tagged tweets and threads will be automatically extracted when roam loads. This is particularly useful when using a Quick Caption solution on mobile. When browsing twitter share a tweet to roam and tag the block before sending it. Next time you load up your graph the tweet or thread will be automatically extracted.

  Blocks tagged with the `Auto Tweet Extract Tag` (`#tweet-extract` by default) are extracted as a single tweet, and blocks tagged with the `Auto Thread Extract Tag` (`#thread-extract` by default) as the whole thread.

## Example 
  <img src="https://github.com/8bitgentleman/roam-depot-tweet-extract/raw/main/example.gif" max-width="400"></img>
