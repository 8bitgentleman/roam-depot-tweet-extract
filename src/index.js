/* Original code by matt vogel */
  /* v2.3  */
import fetchJsonp from 'fetch-jsonp';
import { getTweetId, getTweetUrl, fetchThread, selectThread, getTweetText, fillTemplate } from './thread.mjs';

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

function getAutoThreadTag(extensionAPI) {
  return extensionAPI.settings.get('auto-thread-tag') || "thread-extract"
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
      description: "Blocks with this tag are extracted as a single tweet",
      action: {type:        "input",
                placeholder: "tweet-extract"}},
      {id:     "auto-thread-tag",
      name:   "Auto Thread Extract Tag",
      description: "Blocks with this tag are extracted as the whole thread the tweet belongs to",
      action: {type:        "input",
                placeholder: "thread-extract"}}
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

function getBlockString(uid){
  let query = `[:find ?s .
                  :in $ ?uid
                  :where
                    [?e :block/uid ?uid]
                    [?e :block/string ?s]
                ]`;

  return window.roamAlphaAPI.q(query,uid);
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

async function createTweetBlock(parentUID, text){
  let uid = window.roamAlphaAPI.util.generateUID();
  await window.roamAlphaAPI.createBlock(
    {"location":
      {"parent-uid": parentUID,
      "order": 'last'},
    "block":
      {"string": text,
      "uid": uid}})
  return uid;
}

async function uploadPhotos(status) {
  let images = [];
  for (const photo of status.media?.photos ?? []) {
    try {
      images.push(await uploadFile(photo.url));
    } catch (error) {
      // one broken image shouldn't cost the rest of the tweet
      console.error("Image upload failed.", error);
    }
  }
  return images;
}

// Writes tweets (FxTwitter statuses) to Roam with the template, used for a single tweet and for a
// thread alike: the first tweet replaces the block, the rest go in child blocks.
async function writeTweets(uid, tweets, template, imageLocation){
  for (const [index, status] of tweets.entries()) {
    let images = imageLocation == 'skip images' ? [] : await uploadPhotos(status);

    // convert tweet date to roam date format
    let roamDate = new Date(status.created_timestamp * 1000);
    roamDate = window.roamAlphaAPI.util.dateToPageTitle(roamDate)

    // {TWEET}, {URL}, {AUTHOR_NAME}, {AUTHOR_HANDLE}, {AUTHOR_URL}, {DATE}, {NEWLINE}, {IMAGES}
    let parsedTweet = fillTemplate(template, {
      TWEET: getTweetText(status),
      URL: status.url,
      AUTHOR_NAME: status.author.name,
      AUTHOR_HANDLE: status.author.screen_name,
      AUTHOR_URL: `https://twitter.com/${status.author.screen_name}`,
      DATE: roamDate,
      IMAGES: imageLocation == 'inline' ? images.map((image) => " " + image).join("") : ""
    });

    let tweetUID = uid;
    if (index === 0) {
      await window.roamAlphaAPI.updateBlock({"block":
                      {"uid": uid,
                        "string": parsedTweet}})
    } else {
      tweetUID = await createTweetBlock(uid, parsedTweet);
    }

    // images go under the tweet they belong to
    if (imageLocation != 'inline') {
      for (const image of images) {
        await createTweetBlock(tweetUID, image);
      }
    }
  }
}

async function getTweetStatus(tweetID) {
  const response = await fetch(`${CORS_PROXY_URL}https://api.fxtwitter.com/status/${tweetID}`);
  if (!response.ok) {
    throw new Error(`HTTP error! FxTwitter API returns status: ${response.status}`);
  }
  const json = await response.json();
  if (json.code !== 200 || !json.tweet) {
    throw new Error(`FxTwitter error: ${json.code}`);
  }
  return json.tweet;
}

// oembed cuts long tweets off after ~280 characters and has no images, so it only stands in when
// FxTwitter fails. Its data is shaped like an FxTwitter status so it goes through writeTweets too.
async function getTweetStatusFromEmbed(tweetURL) {
  const tweetJSON = await getTweetEmbed(tweetURL);
  return {
    text: tweetJSON.text.replaceAll("{NEWLINE}", "\n"),
    created_timestamp: Date.parse(tweetJSON.created_at) / 1000,
    author: {name: tweetJSON.name, screen_name: tweetJSON.username},
    media: {}
  };
}

async function extractTweet(uid, tweet, template, imageLocation){
  // add a spinner to show we're doing something
  addSpinner(uid)

  try {
    const tweetURL = getTweetUrl(tweet);
    if (!tweetURL) {
      throw new Error(`Could not find a tweet URL in block: ${tweet}`);
    }

    let status;
    try {
      status = await getTweetStatus(getTweetId(tweetURL));
    } catch (error) {
      console.error("FxTwitter API failure, falling back to oembed.", error);
      status = await getTweetStatusFromEmbed(tweetURL);
    }

    // {URL} is the link that was in the block
    await writeTweets(uid, [{...status, url: tweetURL}], template, imageLocation);
  } catch (error) {
    console.error("Tweet extraction failed.", error);
  } finally {
    //remove the spinner
    removeSpinner(uid)
  }
}

async function getThreadPage(tweetID) {
  const response = await fetch(`${CORS_PROXY_URL}https://api.fxtwitter.com/2/thread/${tweetID}`);
  if (!response.ok) {
    throw new Error(`HTTP error! FxTwitter API returns status: ${response.status}`);
  }
  return response.json();
}

async function extractThread(uid, tweet, template, imageLocation){
  // add a spinner to show we're doing something
  addSpinner(uid)

  try {
    const tweetID = getTweetId(tweet);
    if (!tweetID) {
      throw new Error(`Could not find a tweet URL in block: ${tweet}`);
    }

    // every tweet of the thread, oldest first, no matter which one was linked
    const conversation = await fetchThread(tweetID, getThreadPage);
    await writeTweets(uid, selectThread(conversation, tweetID), template, imageLocation);
  } catch (error) {
    console.error("Thread extraction failed.", error);
  } finally {
    //remove the spinner
    removeSpinner(uid)
  }
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

// the two ways to extract a block: just the linked tweet, or the whole thread it belongs to
const EXTRACT_COMMANDS = [
  {label: "Extract Tweet", extract: extractTweet, defaultHotkey: "ctrl-shift-e"},
  {label: "Extract Tweet Thread", extract: extractThread}
];

// move onload to async function
async function onload({extensionAPI}) {
  console.log("load tweet extract plugin")

  extensionAPI.settings.panel.create(panelConfig);

  for (const command of EXTRACT_COMMANDS) {
    const run = (uid, string) => command.extract(uid, string, getTweetTemplate(extensionAPI), getimageLocation(extensionAPI));

    // register the hotkey
    extensionAPI.ui.commandPalette.addCommand({label: command.label,
                 callback: () => {
                  let block = window.roamAlphaAPI.ui.getFocusedBlock()

                  if (block != null){
                    run(block['block-uid'], getBlockString(block['block-uid']))
                  }
                 },
                 "disable-hotkey": false,
                 // the default hotkey can be customized by the user. Extract Tweet Thread has none
                 // so it can't clash with other extensions, users can set one themselves
                 ...(command.defaultHotkey ? {"default-hotkey": command.defaultHotkey} : {})})

    roamAlphaAPI.ui.blockContextMenu.addCommand({
      label: command.label,
      callback: (e) => run(e['block-uid'], e['block-string'])
    })
  }

  // auto extract
  if (extensionAPI.settings.get('auto-extract')) {
    let threads = await getPageRefs(getAutoThreadTag(extensionAPI));
    // a block with both tags is extracted once, as a thread
    let threadUIDs = new Set(threads.map((thread) => thread.uid));
    let tweets = (await getPageRefs(getAutoExtractTag(extensionAPI))).filter((tweet) => !threadUIDs.has(tweet.uid));

    for (const [blocks, extract] of [[tweets, extractTweet], [threads, extractThread]]) {
      for (const block of blocks) {
        try {
          await extract(block.uid, block.string, getTweetTemplate(extensionAPI), getimageLocation(extensionAPI))
        } catch (error) {
          console.error(error, block)
        }
      }
    }
  }
}

function onunload() {
  console.log("unload tweet extract plugin")

  for (const command of EXTRACT_COMMANDS) {
    roamAlphaAPI.ui.blockContextMenu.removeCommand(
      {label: command.label}
    )
  }
}

export default {
  onload,
  onunload
};
