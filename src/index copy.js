/* Original code by matt vogel */
  /* Source: https://github.com/8bitgentleman/roam-depo-html-table  */
  /* v1  */
  // creates a right click menu plugin which will convert a copied HTML table to a roam table
  // this table was used as reference https://www.w3schools.com/html/html_tables.asp

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
    console.log(urlTweet)

    async function GET(tweetURL) {
        let r = await $.ajax({
          url: "https://publish.twitter.com/oembed?omit_script=1&url=" + tweetURL,
          dataType: "jsonp",
          success: function (data) {
            let tweetData = getInfofromTweet(data.html)
            let tweetText = tweetData[0];
            let tweetDate = tweetData[1];
            // let roamDate = toRoamDate(Date.parse(tweetDate))
            let roamDate = 'test'
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
      console.log(message)
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