/* 
// 
// Background process
// 
*/

let autoStart = true;
let skipIntro = true;
let skipOutro = true;

let watchlist = {};

let prevWindowState;

let playerData = new Map();

let groupwatch = {};

const sites = [
	"goload.io",//gogoanime sites
	"gogohd.net",
	
	"videovard.sx",//bs sites
	"vupload.com",
	"streamz.ws",
	"vidoza.net",
	
	"myplayer.sbs",//animedao sites
	"aniplay.sbs"
];

let ws = null;
let wsQueue = []; // Queue sending messages in this while we are connected

const updateWatchlist = (data) => {
	if (!data.title || !data.season || !data.episode) 
		return;
	
	chrome.storage.sync.get("watchlist", ({ watchlist }) => {
		watchlist[data.title] = {
			"season": 	data.season,
			"episode": 	data.episode,
			"url": 		data.host
		};
		chrome.storage.sync.set({ watchlist });
	});
}

const initWs = () => {
	if (ws !== null) {
		return;
	}
	ws = new WebSocket("wss://k3i.de:8080");

	ws.addEventListener("open", () =>{
		chrome.storage.sync.set({ groupwatch });
		let i;
		while (typeof (i = wsQueue.shift()) !== 'undefined') {
			ws.send(i);
		}
	});
	
	ws.addEventListener('message', function (event) {
		let d = JSON.parse(event.data);
		if (d.event) {
			console.log(d);
			if (d.event === "error") {
				// Just in case we think we are in a group, but the server tells us otherwise
				if (groupwatch.roomid && (d.code === 10 || d.code === 12)) {
					if (groupwatch.roomid) {
						groupwatch = {};
						chrome.storage.sync.set({ groupwatch });
					}
				}
				else {
					chrome.notifications.create({ type: "basic", title: "AutoSkip error", message: d.message, iconUrl: "Icon128px.png" });
				}
			}
			else if (d.event === "EVENT_JOINGROUP") {
				joingroup(d);
			}
			else if (d.event === "EVENT_LEAVEGROUP") {
				chrome.notifications.create({ type: "basic", title: "AutoSkip", message: "Left group " + groupwatch.roomid, iconUrl: "Icon128px.png" });
				groupwatch.roomid = null;
				chrome.storage.sync.set({ groupwatch });
			}
			else if (d.event === "EVENT_BROADCAST") {
				let m = d.message;
				if (d.message.action) {
					m = d.message.action;
				}
				if (m === "__player_play") {
					chrome.tabs.sendMessage(groupwatch.tabid, { player: "play", time: d.message.time });
				}
				else if (m === "__player_pause") {
					chrome.tabs.sendMessage(groupwatch.tabid, { player: "pause", time: d.message.time });
				}
				else if (m === "__player_seek") {
					chrome.tabs.sendMessage(groupwatch.tabid, { player: "seek", time: d.message.time });
				}
			}
			else if (d.event === "EVENT_NEWURL") {
				var old = groupwatch.url;
				if (d.playerData) {
					playerData.set(d.url, d.playerData);
					updateWatchlist(d.playerData);
				}
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
						// Otherwise load the new URL in the old tab
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
	ws.addEventListener("close", (e) => {
		chrome.notifications.create({ type: "basic", title: "AutoSkip", message: "WebSocket was disconnected: " + e.code, iconUrl: "Icon128px.png" });
		ws = null;
		groupwatch = {};
		chrome.storage.sync.set({ groupwatch });
	});
};

chrome.storage.sync.get("groupwatch", ({ groupwatch }) => {
	if (groupwatch && groupwatch.roomid) {
		let id = groupwatch.roomid;
		groupwatch.roomid = null;
		websocketmessage ({ action: "JOINGROUP", group: id });
	}
});

const joingroup = (data) => {
	initWs();
	
	chrome.notifications.create({ type: "basic", title: "AutoSkip", message: "Joined group " + data.idhash, iconUrl: "Icon128px.png" });

	groupwatch.roomid = data.idhash;
	groupwatch.url = data.url;
	chrome.storage.sync.set({ groupwatch });
	
	if (data.playerData) {
		playerData.set(data.url, data.playerData);
		updateWatchlist(data.playerData);
	}
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
		chrome.storage.sync.set({ groupwatch });
	}
	else {
		// reload all open tabs
		const mani = chrome.runtime.getManifest();
		for (let i=0; i<mani["content_scripts"].length; i++) {
			chrome.tabs.query({url:mani["content_scripts"][i]["matches"]}, (tabs) => {
				if (tabs.length > 0) {
					for (const t of tabs) {
						chrome.tabs.reload(t.id);
					}
				}
			});
		}
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

const inGroup = () => {
	return ("roomid" in groupwatch && groupwatch.roomid !== null);
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
	//console.log ("Received message " + JSON.stringify(request));
    if (request.openTab) {
		chrome.tabs.query({ url: request.openTab }, (tabs) => {
			if (tabs.length > 0) {
				if (typeof sender.tab !== "undefined" && typeof sender.tab.id !== "undefined")
					chrome.tabs.update(tabs[0].id, { active: true, openerTabId: sender.tab.id || null });
				else
					chrome.tabs.update(tabs[0].id, { active: true });
			}
			else {
				if (sender.tab)
					chrome.tabs.create({ url: request.openTab, index: sender.tab.index + 1, openerTabId: sender.tab.id });
				else
					chrome.tabs.create({ url: request.openTab });
			}
			
			updateCurrentFromURL(request.openTab);
		});
	}
	else if (request.closeTab) {
		// console.log(sender.tab);
		if(playerData.has(sender.tab.url) && playerData.get(sender.tab.url).host) {
			chrome.tabs.query({ url: playerData.get(sender.tab.url).host }, (tabs) => {
				if (tabs.length > 0) {
					chrome.tabs.sendMessage(tabs[0].id, {nextEpisode: true});
					chrome.tabs.update(tabs[0].id, {active: true});
				}
			});
		}
		else if (sender.tab.openerTabId) {
			chrome.tabs.sendMessage(sender.tab.openerTabId, {nextEpisode: true});
			chrome.tabs.update(sender.tab.openerTabId, {active: true});
		}
		chrome.tabs.remove(sender.tab.id);
	}
	else if (request.fullscreen === true) {
		// make window fullscreen
		chrome.windows.get(sender.tab.windowId, (window) => {
			if (window.state !== "fullscreen") {
				chrome.windows.update(window.id, { state: "fullscreen" });
				prevWindowState = window.state;
			}
		});
	}
	else if (request.fullscreen === false) {
		// get out of fullscreen
		chrome.windows.get(sender.tab.windowId, (window) => {
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
					if (playerData.has(u.href)) {
						websocketmessage ({ action: "NEWGROUP", url: u.href, playerData: playerData.get(u.href) });
					}
					else {
						websocketmessage ({ action: "NEWGROUP", url: u.href });
					}
				}
				else {
					chrome.notifications.create({ type: "basic", title: "AutoSkip error", message: "You can only create a new groupwatch in a supported tab", iconUrl: "Icon128px.png" });
				}
			}
		});
	}
	else if (request.joinGroupWatch) {
		websocketmessage ({ action: "JOINGROUP", group: request.joinGroupWatch });
	}
	else if (request.leaveGroupWatch) {
		if (inGroup())
			websocketmessage ({ action: "LEAVEGROUP" });
	}
	
	else if (request.player_loaded) {
		if (inGroup()) {
			if (groupwatch.url !== request.url) {
				if (playerData.has(request.url)) {
					websocketmessage ({ action: "NEWURL", url: request.url, playerData: playerData.get(request.url) });
				}
				else {
					websocketmessage ({ action: "NEWURL", url: request.url });
				}
			}
		}
	}
	else if (request.player_played) {
		if (inGroup()) 
			websocketmessage ({ action: "SENDGROUP", message: { action: "__player_play", time: request.player_played }});
	}
	else if (request.player_paused) {
		if (inGroup())
			websocketmessage ({ action: "SENDGROUP", message: { action: "__player_pause", time: request.player_paused }});
	}
	else if (request.player_seeked) {
		if (inGroup())
			websocketmessage ({ action: "SENDGROUP", message: { action: "__player_seek", time: request.player_seeked }});
	}
	
	else if (request.setData) {
		//console.log(request);
		playerData.set(request.url, request.value);
	}
  }
);

const updateCurrentFromURL = (url) => {
	let title 	= null;
	let season 	= null;
	let episode = null;
	
	if (url !== null) {
		if (playerData.has(url)) {
			title = playerData.get(url).title;
			season = playerData.get(url).season;
			episode = playerData.get(url).episode;
		}
	}
	
	chrome.storage.sync.set({ title });
	chrome.storage.sync.set({ season });
	chrome.storage.sync.set({ episode });
};

chrome.tabs.onActivated.addListener((info) => {
	chrome.tabs.get(info.tabId, (tab) => {
		if (tab.status === "loading") {
			if (tab.pendingUrl && tab.pendingUrl !== "") {
				updateCurrentFromURL(tab.pendingUrl);
			}
		}
		else if (tab.status && tab.status === "complete") {
			if (tab.url !== "") {
				updateCurrentFromURL(tab.url);
			}
		}
	});
});