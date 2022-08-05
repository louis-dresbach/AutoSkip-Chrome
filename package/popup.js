let inputSkipIntro = document.getElementById("inputSkipIntro");
let inputSkipOutro = document.getElementById("inputSkipOutro");
let inputAutoStart = document.getElementById("inputAutoStart");

let tableWatchlist = document.getElementById("tableWatchlist");

function rem() {
      // event.target will be the input element.
      var td = event.target.parentNode; 
      td.parentNode.removeChild(td);
}


chrome.storage.sync.get("autoStart", ({ autoStart }) => {
  inputAutoStart.checked = autoStart;
});
chrome.storage.sync.get("skipIntro", ({ skipIntro }) => {
  inputSkipIntro.checked = skipIntro;
});
chrome.storage.sync.get("skipOutro", ({ skipOutro }) => {
  inputSkipOutro.checked = skipOutro;
});
chrome.storage.sync.get("watchlist", ({ watchlist }) => {
	for (var key in watchlist) {
		var row = tableWatchlist.insertRow(0);
		row.style.cursor = "pointer";
		var cell1 = row.insertCell(0);
		var cell2 = row.insertCell(1);
		var cell3 = row.insertCell(2);
		cell1.addEventListener("click", () => { chrome.runtime.sendMessage({openTab: "https://gogoanime.lu/" + key.replace(" ", "-") + "-episode-" + watchlist[key]}); });
		cell2.addEventListener("click", () => { chrome.runtime.sendMessage({openTab: "https://gogoanime.lu/" + key.replace(" ", "-") + "-episode-" + watchlist[key]}); });
		cell3.addEventListener("click", () => { 
			if (confirm("Do you really want to remove "+key+" from your watchlist?") === true) {
				rem();
				delete watchlist[key];
				chrome.storage.sync.set({ watchlist });
			}
		});
		cell1.innerHTML = key;
		cell2.innerHTML = watchlist[key];
		cell3.innerHTML = "DEL";
	}
});

inputSkipIntro.addEventListener("change", () => {
	let skipIntro = inputSkipIntro.checked;
	chrome.storage.sync.set({ skipIntro });
});
inputSkipOutro.addEventListener("change", () => {
	let skipOutro = inputSkipOutro.checked;
	chrome.storage.sync.set({ skipOutro });
});
inputAutoStart.addEventListener("change", () => {
	let autoStart = inputAutoStart.checked;
	chrome.storage.sync.set({ autoStart });
});