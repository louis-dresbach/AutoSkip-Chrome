let inputSkipIntro = document.getElementById("inputSkipIntro");
let inputSkipOutro = document.getElementById("inputSkipOutro");
let inputAutoStart = document.getElementById("inputAutoStart");
let inputAutoFullscreen = document.getElementById("inputAutoFullscreen");

let tableWatchlist = document.getElementById("tableWatchlist");

document.querySelectorAll('[data-locale]').forEach(elem => {
	elem.innerText = chrome.i18n.getMessage(elem.dataset.locale)
});

function rem() {
      // event.target will be the input element.
      var td = event.target.parentNode; 
      td.parentNode.removeChild(td);
}

const drawWatchlist = (watchlist) => {
	tableWatchlist.innerHTML = "";
	for (let key in watchlist) {
		var row = tableWatchlist.insertRow(0);
		row.style.cursor = "pointer";
		var cell1 = row.insertCell(0);
		var cell2 = row.insertCell(1);
		var cell3 = row.insertCell(2);
		cell1.addEventListener("click", () => { chrome.runtime.sendMessage({ openTab: watchlist[key]["url"] }); });
		cell2.addEventListener("click", () => { chrome.runtime.sendMessage({ openTab: watchlist[key]["url"] }); });
		cell3.addEventListener("click", () => { 
			if (confirm(chrome.i18n.getMessage("delete_confirm", key)) === true) {
				rem();
				delete watchlist[key];
				chrome.storage.sync.set({ watchlist });
			}
		});
		cell1.innerHTML = key;
		
		let ep = "";
		let s = watchlist[key]["season"];
		if (s !== undefined && s !== null && s !== -1) {
			ep += "S" + s + "E";
		}
		ep += watchlist[key]["episode"]
		cell2.innerHTML = ep;
		cell3.innerHTML = chrome.i18n.getMessage("delete_short");
	}
}


chrome.storage.sync.get("autoStart", ({ autoStart }) => {
  inputAutoStart.checked = autoStart;
});
chrome.storage.sync.get("autoFullscreen", ({ autoFullscreen }) => {
  inputAutoFullscreen.checked = autoFullscreen;
});
chrome.storage.sync.get("skipIntro", ({ skipIntro }) => {
  inputSkipIntro.checked = skipIntro;
});
chrome.storage.sync.get("skipOutro", ({ skipOutro }) => {
  inputSkipOutro.checked = skipOutro;
});
chrome.storage.sync.get("watchlist", ({ watchlist }) => {
	drawWatchlist(watchlist);
});

inputAutoStart.addEventListener("change", () => {
	let autoStart = inputAutoStart.checked;
	chrome.storage.sync.set({ autoStart });
});
inputAutoFullscreen.addEventListener("change", () => {
	let autoFullscreen = inputAutoFullscreen.checked;
	chrome.storage.sync.set({ autoFullscreen });
});
inputSkipIntro.addEventListener("change", () => {
	let skipIntro = inputSkipIntro.checked;
	chrome.storage.sync.set({ skipIntro });
});
inputSkipOutro.addEventListener("change", () => {
	let skipOutro = inputSkipOutro.checked;
	chrome.storage.sync.set({ skipOutro });
});


let t, e;
const updateCurrent = () => {
	if (t !== null && t !== undefined && e !== null && e !== undefined) 
		document.getElementById("current").innerHTML = "<b>" + chrome.i18n.getMessage("currently_playing") + "</b> <br />" + t + "<br />" + e;
	else
		document.getElementById("current").innerHTML = "";
}

chrome.storage.sync.get("title", ({ title }) => {
	t = title;
	updateCurrent();
});
chrome.storage.sync.get("episode", ({ episode }) => {
	e = episode;
	updateCurrent();
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area == "sync") {
		if ("title" in changes) {
			t = changes.title.newValue;
			updateCurrent();
		}
		if ("episode" in changes) {
			e = changes.episode.newValue;
			updateCurrent();
		}
		if ("watchlist" in changes) {
			drawWatchlist(changes.watchlist.newValue);
		}
    }
});