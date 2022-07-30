import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

import {PlayIcon, PauseIcon, FastForwardIcon} from "./icons";

function highlight(haystack: string, needle: string) {
  if(needle === "") {
    return <>{haystack}</>;
  }
  const regex = new RegExp(needle, "gi");
  let elems = haystack.split(regex).map(text => <>{text}</>);
  let outputElems = [];
  for(let i = 0; i < elems.length; i++){
    if(i > 0){
      outputElems.push(<strong>{needle}</strong>);
    }
    outputElems.push(elems[i]);
  }
  return outputElems;
}

function formatSeconds(seconds: number){
  let minutes = Math.floor(seconds / 60);
  seconds = seconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

const TabControls = ({
  tab
}: {
  tab: chrome.tabs.Tab 
}) => {
  // TODO: interfaceify
  const [currentMediaEls, setMediaEls] = useState<any[]>([]);
  
  useEffect(() => {
    const messageListener = (msg: any, sender: chrome.runtime.MessageSender, sendResponse: any) => {
      if(!sender.tab || sender.tab.id !== tab.id) return;
      switch(msg.type){
        case "listMedia":
          setMediaEls(msg.media);
          break;
        default:
          break;
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  });

  return (
    <div style={{borderColor: "black", borderWidth: "1px", borderStyle: "solid", padding: "1rem"}}>
    {currentMediaEls.map((mediaElData: any) => {
      function sendToggle(){
        chrome.tabs.sendMessage(tab.id!,{
          type: "toggleMedia",
          uid: mediaElData.uid
        });
      }
      function sendSkip(){
        chrome.tabs.sendMessage(tab.id!,{
          type: "skipMedia",
          uid: mediaElData.uid
        });
      }
      function buildMediaRelativeSeekCallback(offset: number){
          return function(ev: any){
            chrome.tabs.sendMessage(tab.id!,{
              type: "seekRelMedia",
              uid: mediaElData.uid,
              seekRel: offset
            });
          }
      }

      function changeVolume(ev: any){
        let decimalVolume = ev.target.value/100;
        chrome.tabs.sendMessage(tab.id!,{
          type: "setVolume",
          uid: mediaElData.uid,
          volume: decimalVolume
        });
      }

      return <div key={mediaElData.uid}>
        <progress value={mediaElData.currentTime} max={mediaElData.duration}> Progress {formatSeconds(mediaElData.currentTime)} </progress> <br />
        <div title={mediaElData.uid}>{mediaElData.currentTime}/{mediaElData.duration}</div>
        <div style={{width: "2rem",height:"auto", display: "inline-block" }} onClick={sendToggle}>{mediaElData.paused ? <PlayIcon />:<PauseIcon />} </div>
        <div style={{width: "2rem",height:"auto", display: "inline-block"}} onClick={sendSkip}><FastForwardIcon/></div>
        <br />
        <div style={{display: "inline-block"}}  className="seek-button" onClick={buildMediaRelativeSeekCallback(-30)}>-30</div>
        <div style={{display: "inline-block"}}  className="seek-button" onClick={buildMediaRelativeSeekCallback(-30)}>-15</div>
        <div style={{display: "inline-block"}}  className="seek-button" onClick={buildMediaRelativeSeekCallback(-30)}>-5</div>
        <div style={{display: "inline-block"}}  className="seek-button" onClick={buildMediaRelativeSeekCallback(5)}>+5</div>
        <div style={{display: "inline-block"}}  className="seek-button" onClick={buildMediaRelativeSeekCallback(15)}>+15</div>
        <div style={{display: "inline-block"}}  className="seek-button" onClick={buildMediaRelativeSeekCallback(30)}>+30</div>
        <br />
        <div>Volume:</div>
        <input type="range" min="0" max="100" onInput={changeVolume} value={mediaElData.volume * 100}></input>
      </div>;
    })}
    </div>
  )
};

const Popup = () => {
  const [count, setCount] = useState(0);
  const [currentURL, setCurrentURL] = useState<string>();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentSelectedTab, setSelectedTab] = useState<chrome.tabs.Tab | null>(null);
  const [currentTabs, setTabs] = useState<chrome.tabs.Tab[]>([]);

  useEffect(() => {
    chrome.action.setBadgeText({ text: count.toString() });
  }, [count]);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      setCurrentURL(tabs[0].url);
    });
    chrome.runtime.sendMessage({
      type: "lastSearchQuery"
    });
    let updateInterval = setInterval(() => {
      // Update!
      chrome.tabs.query({}).then(tabs => {
        setTabs(tabs);
      });
    }, 25);
    return () => clearInterval(updateInterval);
  }, []);

  /*const changeBackground = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs[0];
      if (tab.id) {
        chrome.tabs.sendMessage(
          tab.id,
          {
            color: "#555555",
          },
          (msg) => {
            console.log("result message:", msg);
          }
        );
      }
    });
  };*/
  
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    switch(msg.type){
      case "lastSearchQueryResponse":
        setSearchQuery(msg.query);
        break;
      default:
        // console.log("Unknown Message");
        break;
    }
  });



  return (
    <>
      <ul style={{ minWidth: "700px" }}>
        <li>Current Tab's URL: {currentURL}</li>
        <li>Last updated: {new Date().toLocaleTimeString()}</li>
      </ul>
      <input type="text" style={{width: "100%"}} onChange={(ev) => {
        setSearchQuery(ev.target.value || "");
        if(true){ // TODO: Replace with config option
          chrome.runtime.sendMessage({
            type: "setLastSearchQuery",
            query: ev.target.value
          });
        }
      }} value={searchQuery}></input>
      <ul>
        { currentTabs.filter(tab => tab.title && tab.title.toLowerCase && tab.title.toLowerCase().includes(searchQuery.toLowerCase())).map(tab => {
          return <li key={tab.id || tab.sessionId} onClick={(ev) => {

            if(ev.ctrlKey){
              chrome.tabs.update(tab.id!, {
                active: true
              });
              return;
            }else if(ev.shiftKey){
              chrome.tabs.duplicate(tab.id!);
            }

            setSelectedTab(tab);
            location.hash = "#configure_active";

            if(tab.id) chrome.tabs.sendMessage(tab.id, {
              type: "selfSelected"
            });

            chrome.runtime.sendMessage({
              type: "selectTab",
              tabId: tab.id
            });

            let configActiveEl = document.getElementById("configure_active");
            if(!configActiveEl) {
              return;
            }
            // configActiveEl.scrollTo();
            configActiveEl.scrollIntoView();
          }}>{highlight(tab.title || "Unknown Tab?", searchQuery)} {tab.audible && <strong> (playing audio )</strong>}</li>
        })}
      </ul>
      <div id="configure_active">
        {currentSelectedTab ? <>
          <h1>Selected tab: {currentSelectedTab.title}</h1>
          <TabControls tab={currentSelectedTab}></TabControls>
        </>: <>Please select a tab from the above listing. </>}
      </div>
    </>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById("root")
);
