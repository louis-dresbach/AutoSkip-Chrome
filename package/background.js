
let autoStart = true;
let skipIntro = true;
let skipOutro = true;

let watchlist = {};

let prevWindowState;

let playerData = {};

let groupwatch = {};

const sites = [
	"goload.io",
	"videovard.sx",
	"vupload.com",
	"streamz.ws",
	"vidoza.net"
];

let ws = null;
let wsQueue = []; // Queue sending messages in this while we are connected

const initWs = () => {
	if (ws !== null) {
		return;
	}
	ws = new WebSocket("wss://k3i.de:8080");

	ws.addEventListener("open", () =>{
		chrome.storage.sync.set({ groupwatch });
		while (typeof (i = wsQueue.shift()) !== 'undefined') {
			ws.send(i);
		}
	});
	
	ws.addEventListener('message', function (event) {
		let d = JSON.parse(event.data);
		if (d.event) {
			//console.log(event.data);
			if (d.event === "error") {
				console.log(d.message);
			}
			else if (d.event === "EVENT_JOINGROUP" && d.success === true) {
				joingroup(d);
			}
			else if (d.event === "EVENT_LEAVEGROUP" && d.success === true) {
				groupwatch.roomid = null;
				chrome.storage.sync.set({ groupwatch });
			}
			else if (d.event === "EVENT_BROADCAST") {
				let m = d.message;
				if (d.message.action) {
					m = d.message.action;
				}
				if (m === "__player_play") {
					chrome.tabs.sendMessage(groupwatch.tabid, { player: "play" });
				}
				else if (m === "__player_pause") {
					chrome.tabs.sendMessage(groupwatch.tabid, { player: "pause" });
				}
				else if (m === "__player_seek") {
					chrome.tabs.sendMessage(groupwatch.tabid, { player: "seek", time: d.message.time });
				}
			}
			else if (d.event === "EVENT_NEWURL") {
				var old = groupwatch.url;
				chrome.tabs.query({ url: d.url }, (tabs) => {
					// if we already have a tab with the new url, close the other one
					if (tabs.length > 0) {
						chrome.tabs.query({ url: old }, (ttabs) => {
							if (ttabs.length > 0) {
								chrome.tabs.remove(ttabs[0].id);
							}
						});
						groupwatch.tabid = tabs[0].id;
						chrome.tabs.update(tabs[0].id, { active: true });
					}
					else {
						chrome.tabs.query({ url: old }, (tabs) => {
							if (tabs.length > 0) {
								groupwatch.tabid = tabs[0].id;
								chrome.tabs.update(tabs[0].id, { active: true, url: d.url });
							}
							else {
								chrome.tabs.create({ url: d.url }, (tab) => {
									groupwatch.tabid = tab.id;
								});
							}
						});
					}
				});
				
				groupwatch.url = d.url;
				chrome.storage.sync.set({ groupwatch });
			}
		}
	});
	ws.addEventListener("close", () => {
		ws = null;
		groupwatch = {};
		chrome.storage.sync.set({ groupwatch });
	});
};

chrome.storage.sync.get("groupwatch", ({ groupwatch }) => {
	if (groupwatch.roomid && groupwatch.url) {
		websocketmessage ({ action: "JOINGROUP", group: groupwatch.roomid });
	}
});

const joingroup = (data) => {
	initWs();

	groupwatch.roomid = data.idhash;
	groupwatch.url = data.url;
	chrome.storage.sync.set({ groupwatch });
	
	chrome.tabs.query({ url: groupwatch.url }, (tabs) => {
		if (tabs.length > 0) {
			groupwatch.tabid = tabs[0].id;
			chrome.tabs.update(tabs[0].id, { active: true });
		}
		else {
			chrome.tabs.create({ url: groupwatch.url }, (tab) => {
				groupwatch.tabid = tab.id;
			});
		}
	});
}


chrome.runtime.onInstalled.addListener((details) => {
	if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
	  chrome.storage.sync.set({ autoStart });
	  chrome.storage.sync.set({ skipIntro });
	  chrome.storage.sync.set({ skipOutro });
	  chrome.storage.sync.set({ watchlist });
	  chrome.storage.sync.set({ playerData });
	}
});

function websocketmessage (message) {
	initWs();
	if (ws.readyState === 1) {
		// Send message if we are connected
		ws.send(JSON.stringify(message));
	}
	else {
		// Else queue it
		wsQueue.push(JSON.stringify(message));
	}
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
	//console.log ("Received message " + JSON.stringify(request));
    if (request.openTab) {
		chrome.tabs.query({ url: request.openTab }, (tabs) => {
			if (tabs.length > 0) {
				if (typeof sender.tab !== "undefined" && typeof sender.tab.id !== "undefined")
					chrome.tabs.update(tabs[0].id, { active: true, openerTabId: sender.tab.id });
				else
					chrome.tabs.update(tabs[0].id, { active: true });
			}
			else {
				if (sender.tab)
					chrome.tabs.create({ url: request.openTab, index: sender.tab.index+1, openerTabId: sender.tab.id });
				else
					chrome.tabs.create({ url: request.openTab });
			}
		});
	}
	else if (request.closeTab) {
		if (sender.tab.openerTabId) {
			chrome.tabs.sendMessage(sender.tab.openerTabId, {nextEpisode: true});
			chrome.tabs.update(sender.tab.openerTabId, {active: true});
		}
		else {
			chrome.tabs.query({ url: request.openTab }, (tabs) => {
				if (tabs.length > 0) {
					chrome.tabs.sendMessage(tabs[0].id, {nextEpisode: true});
					chrome.tabs.update(tabs[0].id, {active: true});
				}
			});
		}
		chrome.tabs.remove(sender.tab.id);
	}
	else if (request.fullscreen === true) {
		// make window fullscreen
		chrome.windows.getCurrent().then((window) => {
			if (window.state !== "fullscreen") {
				chrome.windows.update(window.id, { state: "fullscreen" });
				prevWindowState = window.state;
			}
		});
	}
	else if (request.fullscreen === false) {
		// get out of fullscreen
		chrome.windows.getCurrent().then((window) => {
			if (window.state === "fullscreen") {
				let newState = "normal";
				if (prevWindowState) {
					newState = prevWindowState;
				}
				chrome.windows.update(window.id, { state: newState });
			}
		});
	}
	else if (request.createGroupWatch) {
		// Only works if current tab is a supported site
		chrome.tabs.query({ active: true, lastFocusedWindow: true }).then((tabs) => {
			if (tabs.length > 0) {
				let u = new URL(tabs[0].url);
				if (sites.includes(u.hostname)) {
					websocketmessage ({ action: "NEWGROUP", url: u.href });
				}
			}
		});
	}
	else if (request.joinGroupWatch) {
		websocketmessage ({ action: "JOINGROUP", group: request.joinGroupWatch });
	}
	else if (request.leaveGroupWatch) {
		if (typeof groupwatch.roomid !== undefined && groupwatch.roomid !== null) 
			websocketmessage ({ action: "LEAVEGROUP" });
	}
	else if (request.sendGroupWatch) {
		if (typeof groupwatch.roomid !== undefined && groupwatch.roomid !== null) 
			websocketmessage ({ action: "SENDGROUP", message: request.sendGroupWatch });
	}
	
	else if (request.player_loaded) {
		if (typeof groupwatch.roomid !== undefined && groupwatch.roomid !== null) {
			if (groupwatch.url !== request.url) {
				websocketmessage ({ action: "NEWURL", url: request.url });
			}
		}
	}
	else if (request.player_played) {
		if (typeof groupwatch.roomid !== undefined && groupwatch.roomid !== null) 
			websocketmessage ({ action: "SENDGROUP", message: "__player_play" });
	}
	else if (request.player_paused) {
		if (typeof groupwatch.roomid !== undefined && groupwatch.roomid !== null) 
			websocketmessage ({ action: "SENDGROUP", message: "__player_pause" });
	}
	else if (request.player_seeked) {
		if (typeof groupwatch.roomid !== undefined && groupwatch.roomid !== null) 
			websocketmessage ({ action: "SENDGROUP", message: { action: "__player_seek", time: request.player_seeked }});
	}
  }
);