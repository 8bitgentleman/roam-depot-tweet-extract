/* Original code by matt vogel */
  /* v2.1  */
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
       description: "variables available are {TWEET}, {URL}, {AUTHOR_NAME}, {AUTHOR_HANDLE}, {AUTHOR_URL}, {DATE}, {NEWLINE}, {IMAGES} as well as all Roam syntax",
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
      description: "When Roam loads if there are blocks tagged with the `Auto Tweet Extract Tag` or `Auto Thread Extract Tag` they will be automatically extracted. Useful with Quick Capture solutions.",
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

// alt tempalte [🐦]({URL}) by [{AUTHOR_NAME}]({AUTHOR_URL}) on [[{DATE}]]: {NEWLINE} {TWEET}
function getInfofromTweetJSON(tweetJSON){
  // preserve newlines
  let htmlString= tweetJSON.html
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

function getTweetEmbed(tweetURL){
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

function extractCurrentBlock(uid, template, imageLocation){
  let query = `[:find ?s .
                  :in $ ?uid
                  :where 
                    [?e :block/uid ?uid]
                    [?e :block/string ?s]
                ]`;

  let block_string = window.roamAlphaAPI.q(query,uid);

  extractTweet(uid, block_string, template, imageLocation);
}

async function extractTweet(uid, tweet, template, imageLocation){
  // add a spinner to show we're doing something
  addSpinner(uid)

  const regex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/;
  var urlRegex = new RegExp(regex, 'ig');
  
  function linkify(text) {
    return text.match(urlRegex);
  } 

  function getTweetUrl(content) {
    let urlsTab = linkify(content);
    if (urlsTab != null) { 
        return urlsTab[urlsTab.length - 1];
    } else { return 0; }
  }

  async function uploadFile(originalUrl) {
    // fetch the file object from the url
    const { file, mimeType } = await fetch(originalUrl)
        .then(async (r) => {
        return {
            file: await r.blob(),
            mimeType: r.headers.get("Content-Type"),
        };
        })
        .then((obj) => obj);
    //create a new File type to prep for upload
    const splits = originalUrl.split("/");
    const lastSplit = splits[splits.length - 1];
    const newFile = new File([file], lastSplit, {
        type: mimeType,
    });
    // upload the new File via roamAlphaAPI
    const uploadTheFile = window.roamAlphaAPI.util.uploadFile;
    const uploadedUrl =
        (await uploadTheFile({
        file: newFile,
        }).then((x) => x)) ?? "file-upload-error";
    
    // grab the markdown for the newly uploaded file
    const MD_IMAGE_REGEX = /\!\[\]\((.*)\)/g;
    const strippedUrl = [...uploadedUrl.matchAll(MD_IMAGE_REGEX)];
    const cleanUrl = strippedUrl?.[0]?.[0] ?? uploadedUrl;

    return cleanUrl;


  }

  async function getTweetData(tweetURL) {
    const TWEET_ID = tweetURL.split("/")[5]
    // If the twitter API is being nice (not crazy rate limiting) I use a CORS proxy to get embeded tweet images. 
    // Because of this sometimes a tweet needs to be extracted multiple times
    
    const BASE_URL = `${CORS_PROXY_URL}https://tweetpik.com/api/v2/tweets?url=`
    
    async function getData(url) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! Twitter API returns status: ${response.status}`);
        }
        return response.json();
      }
    
      
    let url = `${BASE_URL}${tweetURL}`
    const tweetData = await getData(url).then(async (data) => {
      return data;
    });
    return tweetData;
  }

  let tweetURL = getTweetUrl(tweet);
  // parsing via API is skipped if the API is  volatile 
  // I always use the oembed because some info is easier to get there

  let tweetData = await getTweetEmbed(tweetURL);

  try {
    let apiTweetData = await getTweetData(tweetURL);
    if (apiTweetData === null) {
      apiTweetData = await getTweetEmbed(tweetURL);
      console.log("tweetData was null",apiTweetData)
    }
    // choosing the first index for now
    // TODO parse tweet threads 😁
    apiTweetData = apiTweetData[0]
    console.log(apiTweetData)

    // check if media exists
    if (apiTweetData.photos.length > 0) {
      console.log("pictures exist");
      // add to tweetData in correct format (for backwards compatibility)
      let photos = apiTweetData.photos.map((url) => {
        return {
          url: url,
          type: 'photo'
        };
      });
      tweetData.media = photos;

    } 

  } catch (error) {
    console.error("Tweet Extraction API failure. Falling back to simple extraction.");
    console.error(error);
    // handle the error by calling a different function
    tweetData = await getTweetEmbed(tweetURL);
  }

  
  // console.log("DATA HERE", tweetData)

  // extract tweet info
  let tweetText = tweetData.text;
  let tweetDate = tweetData.created_at;
  
  // convert tweet date to roam date format
  let roamDate = new Date(Date.parse(tweetDate));
  roamDate = window.roamAlphaAPI.util.dateToPageTitle(roamDate)

  // parse tweet with template
  var parsedTweet = template.replaceAll('{TWEET}',tweetText);
  
  // {TWEET}, {URL}, {AUTHOR_NAME}, {AUTHOR_HANDLE}, {AUTHOR_URL}, {DATE}, {NEWLINE}, {IMAGES}
  parsedTweet = parsedTweet.replaceAll('{URL}',tweetURL);
  parsedTweet = parsedTweet.replaceAll('{AUTHOR_NAME}',tweetData.name);
  parsedTweet = parsedTweet.replaceAll('{AUTHOR_HANDLE}',tweetData.username);
  parsedTweet = parsedTweet.replaceAll('{AUTHOR_URL}',`https://twitter.com/${tweetData.username}`);
  parsedTweet = parsedTweet.replaceAll('{DATE}',roamDate);
  parsedTweet = parsedTweet.replaceAll('{NEWLINE}', "\n" );

  // insert images
  
  if (tweetData.media) {
    if (imageLocation=='inline') {
      let parsedImages = "";
      for (const key in tweetData.media) { 
        let type = tweetData.media[key].type
        let url = tweetData.media[key].url
        // console.log(type,url);
        if (type=='photo') {
          const cleanedAttachment = await uploadFile(url);
          parsedImages = parsedImages.concat(" ", cleanedAttachment);
        }
      }
      // get all of the images and place them inline 
      parsedTweet = parsedTweet.replaceAll('{IMAGES}',parsedImages);
    } else if (imageLocation=='skip images') {
      // mostly do nothing
      parsedTweet = parsedTweet.replaceAll('{IMAGES}',"");
    } else {
      // if inserting images as children removed unneeded template item
      parsedTweet = parsedTweet.replaceAll('{IMAGES}',"");
      // insert as children blocks
      for (const key in tweetData.media) { 
        let type = tweetData.media[key].type
        let url = tweetData.media[key].url
        // console.log(type,url);
        if (type=='photo') {
          const cleanedAttachment = await uploadFile(url);
    
            window.roamAlphaAPI.createBlock(
          {"location": 
            {"parent-uid": uid, 
            "order": 'last'}, 
          "block": 
            {"string": cleanedAttachment}})
        }
      }
    }
  } else {
    // no images in the tweet so get rid of the variable
    parsedTweet = parsedTweet.replaceAll('{IMAGES}',"");
  }
  window.roamAlphaAPI.updateBlock({"block": 
                  {"uid": uid,
                    "string": parsedTweet}})
  // TODO catch errors

    //remove the spinner
    removeSpinner(uid)
}

function getPageRefs(page){
  let query = `[:find (pull ?refs [:block/string :node/title :block/uid])
                :in $ ?namespace
                :where
                  [?e :node/title ?namespace]
                  [?refs :block/refs ?e]
                ]`;
  
    let result = window.roamAlphaAPI.q(query,page).flat();
    
    return result;
}

// move onload to async function
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