
var autoStart = true;
var skipIntro = true;
var skipOutro = true;

var watchlist = {};

var prevWindowState;

var playerData = {};

var groupwatch = {
	connected : false
};

const sites = [
	"goload.io",
	"videovard.sx",
	"vupload.com",
	"streamz.ws",
	"vidoza.net"
];

const ws = new WebSocket("ws://localhost:8200");

function heartbeat() {
	clearTimeout(this.pingTimeout);
	this.pingTimeout = setTimeout(() => {
		groupwatch.connected = false;
		chrome.storage.sync.set({ groupwatch });
	}, 30000 + 2000);
}

ws.addEventListener("open", () =>{
	groupwatch.connected = true;
	chrome.storage.sync.set({ groupwatch });
	heartbeat();
});
ws.addEventListener("ping", () =>{
	heartbeat();
});

ws.addEventListener('message', function (event) {
	let d = JSON.parse(event.data);
	if (d.event) {
		//console.log(event.data);
		if (d.event === "error") {
			console.error(d.message);
		}
		else if (d.event === "EVENT_JOINGROUP" && d.success === true) {
			groupwatch.roomid = d.idhash;
			groupwatch.url = d.url;
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
		else if (d.event === "EVENT_LEAVEGROUP" && d.success === true) {
			groupwatch.roomid = null;
			chrome.storage.sync.set({ groupwatch });
		}
		else if (d.event === "EVENT_BROADCAST") {
			if (d.message === "__player_play") {
				chrome.tabs.sendMessage(groupwatch.tabid, { player: "play" });
			}
		}
	}
});
ws.addEventListener("close", () =>{
	clearTimeout(this.pingTimeout);
});

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
	if (!groupwatch.connected) {
		return;
	}
	ws.send(JSON.stringify(message));
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
		websocketmessage ({ action: "LEAVEGROUP" });
	}
	else if (request.sendGroupWatch) {
		websocketmessage ({ action: "SENDGROUP", message: request.sendGroupWatch });
	}
	
	else if (request.player_played) {
		websocketmessage ({ action: "SENDGROUP", message: "__player_play" });
	}
	
	else if (request.player_paused) {
		websocketmessage ({ action: "SENDGROUP", message: "__player_pause" });
	}
  }
);