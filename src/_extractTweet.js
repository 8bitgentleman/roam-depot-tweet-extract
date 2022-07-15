/*
 * Copyright(c) 2021 Matt Vogel - adapted from Fabrice Gallet 's Tweet Extactor
 * released October 7 th, 2021
 * See the LICENSE file (MIT).
 */

import toRoamDate from "roamjs-components/date/toRoamDate";

async function extractTweet(message){

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

  function getInfofromTweet(htmlString){
    let htmlObject = document.createElement('div');
    htmlObject.innerHTML = htmlString;
    
    let paragraph = htmlObject.querySelector("p")
    let text = paragraph.innerText || paragraph.textContent;
    
    let links = htmlObject.querySelectorAll("a")
    let lastLink = links[links.length - 1]
    
    return [text, lastLink.text]
  }

  let urlTweet = getTweetUrl(message)

  async function GET(tweetURL) {
    let r = await $.ajax({
      url: "https://publish.twitter.com/oembed?omit_script=1&url=" + tweetURL,
      dataType: "jsonp",
      success: function (data) {
        let tweetData = getInfofromTweet(data.html)
        let tweetText = tweetData[0];
        let tweetDate = tweetData[1];
        let roamDate = toRoamDate(Date.parse(tweetDate))
        message = `[[>]] ${tweetText}\n[🐦](${tweetURL}) by ${data.author_name} on [[${roamDate}]]`
      }
    });

  }
  try{
    await GET(urlTweet)
  } catch (error) {
    message = "{{⚠ PARSE ERROR ⚠}} " + message
    console.log(error)
  }
  return message
  
}


export default extractTweet;