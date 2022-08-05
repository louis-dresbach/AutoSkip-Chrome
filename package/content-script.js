chrome.storage.sync.get("watchlist", ({ watchlist }) => {
	let currentTitle = window.location.pathname.substring(1).split("-").join(" ");
	let c = currentTitle.split(" episode ");
	if (c.length == 2) {
		watchlist[c[0]] = c[1];
		chrome.storage.sync.set({ watchlist });
	}
});

let divPlayer = document.getElementById("load_anime");

if(divPlayer) {
	let iframe = divPlayer.querySelector('iframe');
	chrome.runtime.sendMessage({openTab: iframe.src});
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.nextEpisode) {
		// Click link to next episode
		document.querySelector(".anime_video_body_episodes_r a").click();
	}
  }
);