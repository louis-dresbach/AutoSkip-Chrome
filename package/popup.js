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

function rendercan() {
	let trashcan = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	trashcan.setAttribute("fill", "black");
	trashcan.setAttribute("viewBox", "0 0 120 120");
	trashcan.setAttribute("stroke", "none");
	trashcan.setAttribute("height", "1.1em");
	trashcan.setAttribute("width", "1em");
	trashcan.style.margin = ".1em";
	let trashcanPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	trashcanPath.setAttribute("d", "M11.17,37.16H94.65a8.4,8.4,0,0,1,2,.16,5.93,5.93,0,0,1,2.88,1.56,5.43,5.43,0,0,1,1.64,3.34,7.65,7.65,0,0,1-.06,1.44L94,117.31v0l0,.13,0,.28v0a7.06,7.06,0,0,1-.2.9v0l0,.06v0a5.89,5.89,0,0,1-5.47,4.07H17.32a6.17,6.17,0,0,1-1.25-.19,6.17,6.17,0,0,1-1.16-.48h0a6.18,6.18,0,0,1-3.08-4.88l-7-73.49a7.69,7.69,0,0,1-.06-1.66,5.37,5.37,0,0,1,1.63-3.29,6,6,0,0,1,3-1.58,8.94,8.94,0,0,1,1.79-.13ZM5.65,8.8H37.12V6h0a2.44,2.44,0,0,1,0-.27,6,6,0,0,1,1.76-4h0A6,6,0,0,1,43.09,0H62.46l.3,0a6,6,0,0,1,5.7,6V6h0V8.8h32l.39,0a4.7,4.7,0,0,1,4.31,4.43c0,.18,0,.32,0,.5v9.86a2.59,2.59,0,0,1-2.59,2.59H2.59A2.59,2.59,0,0,1,0,23.62V13.53H0a1.56,1.56,0,0,1,0-.31v0A4.72,4.72,0,0,1,3.88,8.88,10.4,10.4,0,0,1,5.65,8.8Zm42.1,52.7a4.77,4.77,0,0,1,9.49,0v37a4.77,4.77,0,0,1-9.49,0v-37Zm23.73-.2a4.58,4.58,0,0,1,5-4.06,4.47,4.47,0,0,1,4.51,4.46l-2,37a4.57,4.57,0,0,1-5,4.06,4.47,4.47,0,0,1-4.51-4.46l2-37ZM25,61.7a4.46,4.46,0,0,1,4.5-4.46,4.58,4.58,0,0,1,5,4.06l2,37a4.47,4.47,0,0,1-4.51,4.46,4.57,4.57,0,0,1-5-4.06l-2-37Z");
	trashcan.appendChild(trashcanPath);
	return trashcan;
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
		//cell3.innerHTML = chrome.i18n.getMessage("delete_short");
		cell3.appendChild(rendercan());
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


let t, s, e;
const updateCurrent = () => {
	let text = "";
	if (t !== null && t !== undefined) {
		text += "<b>" + chrome.i18n.getMessage("currently_playing") + "</b> <br />" + t + "<br />";
		if (s !== null && s !== undefined && s !== -1)
			text += chrome.i18n.getMessage("season") + " <b>" + s + "</b> | ";
		if (e !== null && e !== undefined)
			text += chrome.i18n.getMessage("episode") + " <b>" + e + "</b><br />";
	}
	
	document.getElementById("current").innerHTML = text;
}

chrome.storage.sync.get("title", ({ title }) => {
	t = title;
	updateCurrent();
});
chrome.storage.sync.get("season", ({ season }) => {
	s = season;
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
		if ("season" in changes) {
			s = changes.season.newValue;
			updateCurrent();
		}
		if ("episode" in changes) {
			e = changes.episode.newValue;
			updateCurrent();
		}
		if ("watchlist" in changes) {
			drawWatchlist(changes.watchlist.newValue);
		}
		if ("autoStart" in changes) {
			inputAutoStart.checked = changes.autoStart.newValue;
		}
		if ("autoFullscreen" in changes) {
			inputAutoFullscreen.checked = changes.autoFullscreen.newValue;
		}
		if ("skipIntro" in changes) {
			inputSkipIntro.checked = changes.skipIntro.newValue;
		}
		if ("skipOutro" in changes) {
			inputSkipOutro.checked = changes.skipOutro.newValue;
		}
		if ("watchlist" in changes) {
			drawWatchlist(changes.watchlist.newValue);
		}
		if ("groupwatch" in changes) {
			drawgroupwatch(changes.groupwatch.newValue);
		}
    }
});

if (document.location.href.toString().includes("?lalala")) {
	document.querySelector("#popup").remove();
}
else {
	document.querySelector("#popup").addEventListener("click", (e) => {
		window.open(window.location.toString() + "?lalala", 'popUpWindow','height=700, width=400, resizable=no, scrollbars=no, toolbar=no, menubar=no, location=no, directories=no, status=yes');
		window.close();
	});
}
var coll = document.getElementsByClassName("collapsible");

for (let i = 0; i < coll.length; i++) {
	coll[i].addEventListener("click", function(e) {
		e.preventDefault();
		this.classList.toggle("active");
		var content = this.nextElementSibling;
		if (content.style.maxHeight){
			content.style.maxHeight = null;
		} 
		else {
			content.style.maxHeight = content.scrollHeight + "px";
		} 
	});
}

const drawgroupwatch = (object) => {
	if (!object || object === null)
		return;
	let gw = document.querySelector("#fieldgroupwatch");
	if (object.roomid) {
		gw.innerHTML = "";
		let p = document.createElement("p");
		p.innerHTML = chrome.i18n.getMessage("in_group") + "<i>" + object.roomid + "</i>";
		gw.appendChild(p);
		let lg = document.createElement("button");
		lg.innerHTML = chrome.i18n.getMessage("leave_group");
		lg.addEventListener("click", function (e) {
			e.preventDefault();
			chrome.runtime.sendMessage({ leaveGroupWatch: true });
		});
		gw.appendChild(lg);
	}
	else {
		gw.innerHTML = "";
		let ng = document.createElement("button");
		ng.innerHTML = "Create new group";
		ng.addEventListener("click", function (e) {
			e.preventDefault();
			chrome.runtime.sendMessage({ createGroupWatch: true });
		});
		gw.appendChild(ng);
		gw.appendChild(document.createElement("br"));
		gw.appendChild(document.createElement("br"));
		let c = document.createElement("center");
		c.innerHTML = chrome.i18n.getMessage("or");
		gw.appendChild(c);
		gw.appendChild(document.createElement("br"));
		let igi = document.createElement("input");
		igi.type = "text";
		igi.className = "inputGroupId";
		igi.placeholder = chrome.i18n.getMessage("enter_group");
		gw.appendChild(igi);
		let jg = document.createElement("button");
		jg.innerHTML = chrome.i18n.getMessage("join_group");
		jg.addEventListener("click", function (e) {
			e.preventDefault();
			chrome.runtime.sendMessage({ joinGroupWatch: document.querySelector(".inputGroupId").value });
		});
		gw.appendChild(jg);
		gw.appendChild(document.createElement("br"));
	}
};

chrome.storage.sync.get("groupwatch", ({ groupwatch }) => {
	drawgroupwatch(groupwatch);
});