import defaultOptions from "./defaultsOptions";
import { v4 as uuidv4 } from 'uuid';

let config = defaultOptions;

chrome.storage.sync.get(defaultOptions).then(newConfig => config = (newConfig as typeof config));



function getAllMedia(){
  let videos = document.getElementsByTagName("video");
  let audios = document.getElementsByTagName("audio");
  return [...videos, ...audios];
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  let el = null;
  switch(msg.type){
    case "toggleMedia":
      // @ts-ignore
      el = getAllMedia().find(el => el["uid"] == msg.uid);
      if(el){
        if(el.paused){
          el.play();
        }else{
          el.pause();
        }
        loop(false); // Update!
      }
      break;
    case "skipMedia":
      // @ts-ignore
      el = getAllMedia().find(el => el["uid"] == msg.uid);
      if(el){
        // To the end
        el.currentTime = el.duration - 1;
        loop(false); // Update!
      }
      break;
    case "seekRelMedia":
        // @ts-ignore
        el = getAllMedia().find(el => el["uid"] == msg.uid);
        if(el){
          // To the end
          el.currentTime += msg.seekRel || 0;
          loop(false); // Update!
        }
        break;
    case "setVolume":
        // @ts-ignore
        el = getAllMedia().find(el => el["uid"] == msg.uid);
        if(el){
          // To the end
          el.volume = msg.volume || 0;
          loop(false); // Update!
        }
        break;
    default:
      console.log("Unknown Message");
      break;
  }
});

function loop(reloop = true){
  let audiosAndVideos = getAllMedia();
  audiosAndVideos.forEach(mediaEl => {
    // @ts-ignore
    if(!mediaEl["uid"]) mediaEl["uid"] = uuidv4();
  });

  chrome.runtime.sendMessage({
    type: "listMedia",
    media: audiosAndVideos.map(mediaEl => {
      return {
        // @ts-ignore
        uid: mediaEl["uid"] || "",
        src: mediaEl.src,
        title: mediaEl.title,
        paused: mediaEl.paused,
        duration: mediaEl.duration,
        currentTime: mediaEl.currentTime,
        volume: mediaEl.volume,
        muted: mediaEl.muted,
        loop: mediaEl.loop,
        rate: mediaEl.playbackRate,
        readyState: mediaEl.readyState,
        networkState: mediaEl.networkState
      }
    })
  });

  if(reloop) setTimeout(loop,config.tickTimeMS)
}

loop();