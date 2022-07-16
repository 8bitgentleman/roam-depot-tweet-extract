/* Original code by matt vogel */
  /* v1  */

import fetchJsonp from 'fetch-jsonp';

const panelConfig = {
  tabTitle: "Tweet Extractor",
  settings: [
      {id:     "tweet-template",
       name:   "Tweet Template",
       description: "variables available are {TWEET}, {URL}, {AUTHOR_NAME}, {AUTHOR_URL}, {DATE} as well as all Roam syntax",
       action: {type:        "input",
                placeholder: "[[>]] {TWEET} \n [🐦]({URL}) by {AUTHOR_NAME} on {DATE}",
                onChange:    (evt) => { console.log("Input Changed!", evt); }}}
  ]
};
// [🐦]({URL}) by [{AUTHOR_NAME}]({AUTHOR_URL}) on {DATE}: \n {TWEET}
function getInfofromTweet(htmlString){
  let htmlObject = document.createElement('div');
  htmlObject.innerHTML = htmlString;
  
  let paragraph = htmlObject.querySelector("p")
  let text = paragraph.innerText || paragraph.textContent;
  
  let links = htmlObject.querySelectorAll("a")
  let lastLink = links[links.length - 1]
  
  return [text, lastLink.text]
}

function extractCurrentBlock(uid, template){
  let query = `[:find ?s .
                  :in $ ?uid
                  :where 
                    [?e :block/uid ?uid]
                    [?e :block/string ?s]
                ]`;

  let block_string = window.roamAlphaAPI.q(query,uid);
  console.log(block_string);
  extractTweet(uid, block_string, template);
}

async function extractTweet(uid, tweet, template){
  // for some reason settings placeholders are coming in as null on first load.
  // have to load in the default template manually then. This may bite me later on...
  // also dealing with if people completely delete the template by accident
  if(template==null || template==''){
    template = "[[>]] {TWEET} \n [🐦]({URL}) by {AUTHOR_NAME} on {DATE}";
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
  let tweetURL = getTweetUrl(tweet)

  // let tweetURL = "https://twitter.com/RoamResearch/status/1547823282589642753"
  
  fetchJsonp("https://publish.twitter.com/oembed?omit_script=1&url=" + tweetURL)
    .then(function(response) {
      return response.json()
    }).then(function(json) {
      console.log('parsed json', json)
      let tweetData = getInfofromTweet(json.html)

      let tweetText = tweetData[0];
      let tweetDate = tweetData[1];
      
      let roamDate = new Date(Date.parse(tweetDate));
      roamDate = window.roamAlphaAPI.util.dateToPageTitle(roamDate)
      var parsedTweet = template.replaceAll('{TWEET}',tweetText);

      // {TWEET}, {URL}, {AUTHOR_NAME}, {AUTHOR_URL}, {DATE}
      parsedTweet = parsedTweet.replaceAll('{URL}',tweetURL);
      parsedTweet = parsedTweet.replaceAll('{AUTHOR_NAME}',json.author_name);
      parsedTweet = parsedTweet.replaceAll('{AUTHOR_URL}',json.author_url);
      parsedTweet = parsedTweet.replaceAll('{DATE}',roamDate);

      window.roamAlphaAPI.updateBlock({"block": 
                  {"uid": uid,
                    "string": parsedTweet}})

    }).catch(function(ex) {
      console.log('parsing failed', ex)
      tweet = "{{⚠ PARSE ERROR ⚠}} " + tweet
    })
    

}

// define a handler
function keydown(e) {
  if ((e = e || event).ctrlKey && e.shiftKey && e.key === 'E') {
    console.log(e)
    let block = window.roamAlphaAPI.ui.getFocusedBlock()
    if (block != null){
      extractCurrentBlock(block['block-uid'], extensionAPI.settings.get("tweet-template"))
    }
  }
}

export default {
  onload: ({extensionAPI}) => {
    console.log("load tweet extract plugin")
    
    
    extensionAPI.settings.panel.create(panelConfig);
    
    // register the handler
    window.addEventListener("keydown", keydown);

    roamAlphaAPI.ui.blockContextMenu.addCommand({
      label: "Extract Tweet",
      callback: (e) => extractTweet(e['block-uid'], e['block-string'], extensionAPI.settings.get("tweet-template"))
  })
  },
  onunload: () => {
    console.log("unload tweet extract plugin")

    window.removeEventListener("keydown", keydown);

    roamAlphaAPI.ui.blockContextMenu.removeCommand(
      {label: "Extract Tweet"}
    )
  }
};