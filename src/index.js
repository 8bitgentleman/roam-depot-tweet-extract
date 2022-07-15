/* Original code by matt vogel */
  /* v1  */

import fetchJsonp from 'fetch-jsonp';

function getInfofromTweet(htmlString){
  let htmlObject = document.createElement('div');
  htmlObject.innerHTML = htmlString;
  
  let paragraph = htmlObject.querySelector("p")
  let text = paragraph.innerText || paragraph.textContent;
  
  let links = htmlObject.querySelectorAll("a")
  let lastLink = links[links.length - 1]
  
  return [text, lastLink.text]
}

async function extractTweet(uid, message){
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
  let tweetURL = getTweetUrl(message)

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
      roamDate = window.roamAlphaAPI.util.dateToPageTitle(dateObject)
      console.log(tweetDate)

      message = `[[>]] ${tweetText}\n[🐦](${tweetURL}) by ${json.author_name} on [[${roamDate}]]`

      console.log(uid, message)
      window.roamAlphaAPI.updateBlock({"block": 
                  {"uid": uid,
                    "string": message}})

    }).catch(function(ex) {
      console.log('parsing failed', ex)
      message = "{{⚠ PARSE ERROR ⚠}} " + message
    })
    

}


export default {
  onload: () => {
    console.log("load tweet extract plugin")
    roamAlphaAPI.ui.blockContextMenu.addCommand({
      label: "Extract Tweet",
      callback: (e) => extractTweet(e['block-uid'], e['block-string'])
  })
  },
  onunload: () => {
    console.log("unload tweet extract plugin")
    roamAlphaAPI.ui.blockContextMenu.removeCommand(
      {label: "Extract Tweet"}
    )
  }
};