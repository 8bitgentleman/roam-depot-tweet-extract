/* Original code by matt vogel */
  /* v2.1  */
import fetchJsonp from 'fetch-jsonp';

var template = '[[>]] {TWEET} {NEWLINE} [🐦]({URL}) by {AUTHOR_NAME} on [[{DATE}]]'
const CORS_PROXY_URL = "https://roam-tweet-extract.glitch.me/"

const panelConfig = {
  tabTitle: "Tweet Extract",
  settings: [
      {id:     "tweet-template",
       name:   "Tweet Template",
       description: "variables available are {TWEET}, {URL}, {AUTHOR_NAME}, {AUTHOR_HANDLE}, {AUTHOR_URL}, {DATE}, {NEWLINE}, {IMAGES} as well as all Roam syntax",
       action: {type:        "input",
                placeholder: "[[>]] {TWEET} {NEWLINE} [🐦]({URL}) by {AUTHOR_HANDLE} on [[{DATE}]]",
                onChange:    (evt) => { 
                  template = evt.target.value;
                }}},
      {id:     "image-location",
      name:   "Image Location",
      description: "If there are images attached to a tweet where should they be added",
      action: {type:     "select",
                items:    ["child block", "inline"],
                }}
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

function getTweetEmbed(tweetURL){
  console.error('Fallback to tweet oembed')
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
  // for some reason settings placeholders are coming in as null on first load.
  // have to load in the default template manually then. This may bite me later on...
  // also dealing with if people completely delete the template by accident
  if(template==null || template==''){
    template = "[[>]] {TWEET} {NEWLINE} [🐦]({URL}) by {AUTHOR_NAME} on {DATE}";
  }
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
    
    const BASE_URL = `${CORS_PROXY_URL}https://tweetpik.com/api/tweets`
    
    async function getData(url) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! Twitter API returns status: ${response.status}`);
        }
        return response.json();
      }
    
      
    let url = `${BASE_URL}/${TWEET_ID}`
    try {
      const tweetData = await getData(url);
      return tweetData;
    } catch (error) {
      // console.error(error);
      return null;
    }
  }

  let tweetURL = getTweetUrl(tweet);
  // let tweetData = await getTweetData(tweetURL);
  // parsing via API has been disabled for now until the API is less volatile 
  // if (tweetData === null) {
  //   tweetData = await getTweetEmbed(tweetURL);
  //   console.log(tweetData)
  // }
  let tweetData = await getTweetEmbed(tweetURL);
  console.log("DATA HERE", tweetData)
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
    
  }
  window.roamAlphaAPI.updateBlock({"block": 
                  {"uid": uid,
                    "string": parsedTweet}})
  // TODO catch errors


}

// move onload to async function
async function onload({extensionAPI}) {
  console.log("load tweet extract plugin")
  // set default setting
  if (!extensionAPI.settings.get('tweet-template')) {
    await extensionAPI.settings.set('tweet-template', template);
  }
  if (!extensionAPI.settings.get('image-location')) {
    await extensionAPI.settings.set('image-location', "child block");
  }

  extensionAPI.settings.panel.create(panelConfig);
  
  // register the hotkey
  extensionAPI.ui.commandPalette.addCommand({label: 'Extract Tweet', 
               callback: () => {
                let block = window.roamAlphaAPI.ui.getFocusedBlock()
    
                if (block != null){
                  extractCurrentBlock(block['block-uid'], template, extensionAPI.settings.get('image-location'))
                }
               },
               "disable-hotkey": false,
               // this is the default hotkey, and can be customized by the user. 
               "default-hotkey": "ctrl-shift-e"})
  
  roamAlphaAPI.ui.blockContextMenu.addCommand({
    label: "Extract Tweet",
    callback: (e) => extractTweet(e['block-uid'], e['block-string'], extensionAPI.settings.get("tweet-template"), extensionAPI.settings.get("image-location"))
  })
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