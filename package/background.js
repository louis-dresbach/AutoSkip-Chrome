
var autoStart = true;
var skipIntro = true;
var skipOutro = true;

var watchlist = {};

var prevWindowState;

var playerData = {};

chrome.runtime.onInstalled.addListener((details) => {
	if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
	  chrome.storage.sync.set({ autoStart });
	  chrome.storage.sync.set({ skipIntro });
	  chrome.storage.sync.set({ skipOutro });
	  chrome.storage.sync.set({ watchlist });
	  chrome.storage.sync.set({ playerData });
	}
});

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
  }
);