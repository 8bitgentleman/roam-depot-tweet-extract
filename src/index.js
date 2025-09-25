/* Original code by matt vogel */
/* v3.0 - Updated to use TweetHunter API */
import fetchJsonp from 'fetch-jsonp';

var defaultTweetTemplate = '[[>]] {TWEET} {NEWLINE} [🐦]({URL}) by {AUTHOR_NAME} on [[{DATE}]]'

const CORS_PROXY_URL = `${window.roamAlphaAPI.constants.corsAnywhereProxyUrl}/`

function getTweetTemplate(extensionAPI) {
  return extensionAPI.settings.get('tweet-template') || defaultTweetTemplate
}

function getimageLocation(extensionAPI) {
  return extensionAPI.settings.get('image-location') || "child block"
}

function getAutoExtractTag(extensionAPI) {
  return extensionAPI.settings.get('auto-extract-tag') || "tweet-extract"
}

const panelConfig = {
  tabTitle: "Tweet Extract",
  settings: [
      {id:     "tweet-template",
       name:   "Tweet Template",
       description: "variables available are {TWEET}, {URL}, {AUTHOR_NAME}, {AUTHOR_HANDLE}, {AUTHOR_URL}, {DATE}, {NEWLINE}, {IMAGES}, {LIKES}, {RETWEETS} as well as all Roam syntax",
       action: {type:        "input",
                placeholder: defaultTweetTemplate,
                }},
      {id:     "image-location",
      name:   "Image Location",
      description: "If there are images attached to a tweet where should they be added",
      action: {type:     "select",
                items:    ["child block", "inline", "skip images"],
                }},
      {id:          "auto-extract",
      name:        "Auto Extract",
      description: "When Roam loads if there are blocks tagged with the `Auto Tweet Extract Tag` they will be automatically extracted. Useful with Quick Capture solutions.",
      action:      {type:     "switch"}},
      {id:     "auto-extract-tag",
      name:   "Auto Tweet Extract Tag",
      description: "",
      action: {type:        "input",
                placeholder: "tweet-extract",
                onChange:    (evt) => { 
                  template = evt.target.value;
                }}}
  ]
};

// SpinnerUI functions remain unchanged
function addSpinner(blockUID) {
  const MySpinner = React.createElement(
    window.Blueprint.Core.Spinner,
    { intent: "primary", size: Blueprint.Core.SpinnerSize.SMALL },
    null
  );

  // Get all div and textarea elements
  const elements = document.querySelectorAll('div, textarea');

  // Iterate over all elements
  for(let i = 0; i < elements.length; i++) {
      const element = elements[i];

      // Check if id contains "block-input" and blockUID
      if(element.id.includes('block-input') && element.id.includes(blockUID)) {
          // Create a new spinner
          const tweetSpinner = document.createElement('div');
          tweetSpinner.className = "tweet-extract-pending";
          tweetSpinner.style.marginRight = "10px";
          tweetSpinner.style.marginTop = "5px";
          tweetSpinner.style.width = "24px";
          ReactDOM.render(MySpinner, tweetSpinner);

          // If the element is a textarea, insert the spinner before the parent of the parent of the element
          if(element.tagName.toLowerCase() === 'textarea') {
              element.parentNode.parentNode.insertBefore(tweetSpinner, element.parentNode);
          } else {
              // Otherwise, insert the spinner before the element
              element.parentNode.insertBefore(tweetSpinner, element);
          }
          break;
      }
  }
}

function removeSpinner(blockUID) {
  // Get all div elements with class "tweet-extract-pending"
  const divs = document.getElementsByClassName('tweet-extract-pending');

  // Iterate over all divs in reverse order (to avoid issues with live HTMLCollection)
  for(let i = divs.length - 1; i >= 0; i--) {
      const div = divs[i];

      // Check if the next sibling div has class "rm-autocomplete__wrapper" or contains the specific id
      const nextDiv = div.nextElementSibling;
      if(nextDiv) {
          if(nextDiv.id.includes('block-input') && nextDiv.id.includes(blockUID)) {
            console.log('regular block')
              // Remove the div if it's above the correct block
              console.log(div);
              div.parentNode.removeChild(div);
          } else if(nextDiv.classList.contains('rm-autocomplete__wrapper')) {
            console.log('text area open')
              // Check the first child of the next div for a div with id that contains "block-input" and blockUID
              const firstChildDiv = nextDiv.firstChild;
              console.log(firstChildDiv)
              if(firstChildDiv && firstChildDiv.id.includes('block-input') && firstChildDiv.id.includes(blockUID)) {
                  // Remove the div
                  console.log(div);
                  div.parentNode.removeChild(div);
              }
          }
      }
  }
}

function getTweetEmbed(tweetURL) {
  //oembed doesn't work for x.com so swap to twitter.com
  tweetURL = tweetURL.replace(/x\.com\//g, 'twitter.com/');
  // fallback function to get limited tweet data, no media included
  return fetchJsonp("https://publish.twitter.com/oembed?omit_script=1&url=" + tweetURL)
    .then(function(response) {
      return response.json()
    }).then(function(json) {
      return getInfofromTweetJSON(json)
    })
}

function getInfofromTweetJSON(tweetJSON) {
  // preserve newlines
  let htmlString = tweetJSON.html
  htmlString = htmlString.replaceAll("<br>", "{NEWLINE}");

  let htmlObject = document.createElement('div');
  htmlObject.innerHTML = htmlString;
  
  let paragraph = htmlObject.querySelector("p")

  let text = paragraph.innerText || paragraph.textContent;
  let links = htmlObject.querySelectorAll("a")
  let lastLink = links[links.length - 1]

  tweetJSON.text = text;
  tweetJSON.created_at = lastLink.innerText;
  tweetJSON.name = tweetJSON.author_name
  tweetJSON.username = tweetJSON.author_url.split('/').pop()
  return tweetJSON
}

async function getTweetHunterData(tweetURL) {
  // Extract tweet ID from URL
  const TWEET_ID = tweetURL.split("/")[5];
  const CORS_PROXY_URL = window.roamAlphaAPI.constants.corsAnywhereProxyUrl;
  
  try {
    const response = await fetch(`${CORS_PROXY_URL}https://tweethunter.io/api/thread?tweetId=${TWEET_ID}`, {
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

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching from TweetHunter:", error);
    throw error;
  }
}

async function uploadFile(originalUrl) {
  try {
    const response = await fetch(originalUrl);
    const blob = await response.blob();
    const mimeType = response.headers.get("Content-Type");
    
    const splits = originalUrl.split("/");
    const lastSplit = splits[splits.length - 1];
    const newFile = new File([blob], lastSplit, { type: mimeType });
    
    const uploadTheFile = window.roamAlphaAPI.util.uploadFile;
    const uploadedUrl = await uploadTheFile({ file: newFile }) ?? "file-upload-error";
    
    const MD_IMAGE_REGEX = /\!\[\]\((.*)\)/g;
    const strippedUrl = [...uploadedUrl.matchAll(MD_IMAGE_REGEX)];
    const cleanUrl = strippedUrl?.[0]?.[0] ?? uploadedUrl;

    return cleanUrl;
  } catch (error) {
    console.error("Error uploading file:", error);
    return "file-upload-error";
  }
}

async function extractTweet(uid, tweet, template, imageLocation) {
  addSpinner(uid);

  try {
    // Extract URL from tweet text
    const regex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    const urls = tweet.match(regex);
    const tweetURL = urls ? urls[urls.length - 1] : null;

    if (!tweetURL) {
      throw new Error("No valid tweet URL found in text");
    }

    // Try TweetHunter API first
    let tweetData;
    try {
      const tweetThread = await getTweetHunterData(tweetURL);
      // Process all tweets in the thread if they exist
      if (tweetThread.length > 1) {
        // First tweet goes in the current block
        tweetData = tweetThread[0];
        // Rest of the thread goes in child blocks
        for (let i = 1; i < tweetThread.length; i++) {
          const childTweet = tweetThread[i];
          await window.roamAlphaAPI.createBlock({
            location: {
              'parent-uid': uid,
              order: 'last'
            },
            block: {
              string: template
                .replaceAll('{TWEET}', childTweet.textHtml.replace(/<[^>]*>/g, ''))
                .replaceAll('{URL}', childTweet.url)
                .replaceAll('{AUTHOR_NAME}', childTweet.handler.replace('@', ''))
                .replaceAll('{AUTHOR_HANDLE}', childTweet.handler)
                .replaceAll('{AUTHOR_URL}', `https://twitter.com/${childTweet.handler.replace('@', '')}`)
                .replaceAll('{DATE}', window.roamAlphaAPI.util.dateToPageTitle(new Date(childTweet.datetime)))
                .replaceAll('{NEWLINE}', '\n')
                .replaceAll('{LIKES}', childTweet.likes.toString())
                .replaceAll('{RETWEETS}', childTweet.retweets.toString())
                .replaceAll('{IMAGES}', '') // Images will be added as child blocks if needed
            }
          });
          
          // Add images for child tweets if they exist
          if (childTweet.photos && childTweet.photos.length > 0 && imageLocation !== 'skip images') {
            for (const photoUrl of childTweet.photos) {
              const cleanedAttachment = await uploadFile(photoUrl);
              await window.roamAlphaAPI.createBlock({
                location: {
                  'parent-uid': uid,
                  order: 'last'
                },
                block: {
                  string: cleanedAttachment
                }
              });
            }
          }
        }
      }
      tweetData = tweetThread[0]; // Process first tweet
      
      // Convert TweetHunter format to match our expected format
      tweetData = {
        text: tweetData.textHtml.replace(/<[^>]*>/g, ''), // Strip HTML tags
        url: tweetData.url,
        name: tweetData.handler.replace('@', ''),
        username: tweetData.handler.replace('@', ''),
        created_at: tweetData.datetime,
        media: tweetData.photos.map(url => ({ type: 'photo', url })),
        likes: tweetData.likes,
        retweets: tweetData.retweets
      };
    } catch (error) {
      console.log("TweetHunter API failed, falling back to oembed", error);
      tweetData = await getTweetEmbed(tweetURL);
    }

    if (!tweetData) {
      throw new Error("No tweet data received");
    }

    // Convert tweet date to Roam format
    const roamDate = window.roamAlphaAPI.util.dateToPageTitle(new Date(tweetData.datetime));

    // Extract pure text from HTML (remove emoji img tags etc)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = tweetData.textHtml;
    const tweetText = tempDiv.textContent || tempDiv.innerText;

    // Parse tweet with template
    let parsedTweet = template
      .replaceAll('{TWEET}', tweetText)
      .replaceAll('{URL}', tweetData.url)
      .replaceAll('{AUTHOR_NAME}', tweetData.handler.replace('@', ''))
      .replaceAll('{AUTHOR_HANDLE}', tweetData.handler)
      .replaceAll('{AUTHOR_URL}', `https://twitter.com/${tweetData.handler.replace('@', '')}`)
      .replaceAll('{DATE}', roamDate)
      .replaceAll('{NEWLINE}', '\n')
      .replaceAll('{LIKES}', tweetData.likes.toString())
      .replaceAll('{RETWEETS}', tweetData.retweets.toString());

    // Handle images based on imageLocation setting
    if (tweetData.photos && tweetData.photos.length > 0) {
      if (imageLocation === 'inline') {
        let parsedImages = "";
        for (const photoUrl of tweetData.photos) {
          const cleanedAttachment = await uploadFile(photoUrl);
          parsedImages = parsedImages.concat(" ", cleanedAttachment);
        }
        parsedTweet = parsedTweet.replaceAll('{IMAGES}', parsedImages);
      } else if (imageLocation === 'skip images') {
        parsedTweet = parsedTweet.replaceAll('{IMAGES}', "");
      } else {
        // Default: child blocks
        parsedTweet = parsedTweet.replaceAll('{IMAGES}', "");
        for (const photoUrl of tweetData.photos) {
          const cleanedAttachment = await uploadFile(photoUrl);
          await window.roamAlphaAPI.createBlock({
            location: {
              'parent-uid': uid,
              order: 'last'
            },
            block: {
              string: cleanedAttachment
            }
          });
        }
      }
    } else {
      parsedTweet = parsedTweet.replaceAll('{IMAGES}', "");
    }

    // Update the block with parsed tweet
    await window.roamAlphaAPI.updateBlock({
      block: {
        uid: uid,
        string: parsedTweet
      }
    });

  } catch (error) {
    console.error("Error extracting tweet:", error);
    // Update block to show error
    await window.roamAlphaAPI.updateBlock({
      block: {
        uid: uid,
        string: `Error extracting tweet: ${error.message}`
      }
    });
  } finally {
    removeSpinner(uid);
  }
}

// The rest of the code (getPageRefs, onload, onunload) remains unchanged
function getPageRefs(page) {
  let query = `[:find (pull ?refs [:block/string :node/title :block/uid])
  :in $ ?namespace
  :where
    [?e :node/title ?namespace]
    [?refs :block/refs ?e]
  ]`;

let result = window.roamAlphaAPI.q(query,page).flat();

return result;
}

async function onload({extensionAPI}) {
  console.log("load tweet extract plugin")

  extensionAPI.settings.panel.create(panelConfig);
  
  // register the hotkey
  extensionAPI.ui.commandPalette.addCommand({label: 'Extract Tweet', 
               callback: () => {
                let block = window.roamAlphaAPI.ui.getFocusedBlock()
    
                if (block != null){
                  extractCurrentBlock(block['block-uid'], getTweetTemplate(extensionAPI), getimageLocation(extensionAPI))
                }
               },
               "disable-hotkey": false,
               // this is the default hotkey, and can be customized by the user. 
               "default-hotkey": "ctrl-shift-e"})
  
  roamAlphaAPI.ui.blockContextMenu.addCommand({
    label: "Extract Tweet",
    callback: (e) => extractTweet(e['block-uid'], e['block-string'], getTweetTemplate(extensionAPI), getimageLocation(extensionAPI))
  })
   // auto extract
   if (extensionAPI.settings.get('auto-extract')) {
    let tweets = await getPageRefs(getAutoExtractTag(extensionAPI));
  
    // single tweets
    for (const tweet of tweets) {
      try {
        await extractTweet(
          tweet.uid,
          tweet.string,
          getTweetTemplate(extensionAPI),
          getimageLocation(extensionAPI)
        )
      } catch (error) {
        console.error(error, tweet)
      }
        
    }
  }
}

function onunload() {
  console.log("unload tweet extract plugin")

  roamAlphaAPI.ui.blockContextMenu.removeCommand(
    {label: "Extract Tweet"}
  )
}

export default {
  onload,
  onunload
};