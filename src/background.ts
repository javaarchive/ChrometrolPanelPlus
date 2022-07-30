import natural from "natural";

function polling() {
  // console.log("polling");
  setTimeout(polling, 1000 * 30);
}

let lastSearchQuery = "";
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  switch(msg.type){
    case "lastSearchQuery":
      chrome.runtime.sendMessage({type: "lastSearchQueryResponse", query: lastSearchQuery || ""});
      break;
    case "setLastSearchQuery":
      if(!msg.query) return;
      lastSearchQuery = msg.query;
      break;
    default:
      // console.log("Unknown Message");
      break;
  }
});

function doNLP(input: string){

}

const searches = [
  "https://www.google.com/search?q={QUERY}",
  "https://searx.be/search?q={QUERY}&categories=general",
  "https://duckduckgo.com/?q={QUERY}",
  "https://www.bing.com/search?q={QUERY}",
  "https://www.startpage.com/do/search?q={QUERY}",
  "https://www.yandex.com/search/?text={QUERY}",
  "https://www.baidu.com/s?wd={QUERY}",
  "https://www.qwant.com/?q={QUERY}",
  "https://neeva.com/search?q={QUERY}",
  "https://search.brave.com/search?q={QUERY}&source=web",
  "https://www.ecosia.org/search?method=index&q={QUERY}",
  "https://se.search.yahoo.com/search?p={QUERY}&fr=yfp-t&fr2=p%3Afp%2Cm%3Asb&ei=UTF-8&fp=1"
];

chrome.omnibox.onInputEntered.addListener((text: string, disposition) => {
  // Tabmania Time!
  // TODO: Allow customisation of searches
  if(text.startsWith("please ")){
    doNLP(text);
    return;
  }
  searches.forEach(urlTemplate => {
    let fullUrl = urlTemplate.replace("{QUERY}", encodeURIComponent(text));
    chrome.tabs.create({
      url: fullUrl,
      index: 999999, // end
      active: false
    });
    chrome.tabs.query({active:true, currentWindow: true}).then(activeTabs => chrome.tabs.remove(activeTabs[0].id!));
  });
});

polling();
