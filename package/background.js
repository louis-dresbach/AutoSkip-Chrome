
let autoStart = true;
let skipIntro = true;
let skipOutro = true;

let watchlist = {};

let prevWindowState;

chrome.runtime.onInstalled.addListener((details) => {
	if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
	  chrome.storage.sync.set({ autoStart });
	  chrome.storage.sync.set({ skipIntro });
	  chrome.storage.sync.set({ skipOutro });
	  chrome.storage.sync.set({ watchlist });
	}
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.openTab) {
		chrome.tabs.query({ url: request.openTab }, (tabs) => {
			if (tabs.length > 0) {
				chrome.tabs.update(tabs[0].id, {active: true});
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
		chrome.tabs.remove(sender.tab.id);
	}
	else if (request.fullscreen) {
		if (request.fullscreen === true) {
			// make window fullscreen
			chrome.windows.getCurrent().then((window) => {
				chrome.windows.update(window.id, { state: "fullscreen" });
				prevWindowState = window.state;
			});
		}
		else {
			// get out of fullscreen
			chrome.windows.getCurrent().then((window) => {
				let newState = "normal";
				if (prevWindowState) {
					newState = prevWindowState;
				}
				chrome.windows.update(window.id, { state: newState });
			});
		}
	}
  }
);