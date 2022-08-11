
let title, episode;

function capitalize (str) {
	str = str.toLowerCase();
    str = str.split(" ");

    for (var i = 0; i < str.length; i++) {
        str[i] = str[i][0].toUpperCase() + str[i].substr(1);
    }

    return str.join(" ");
}

if (window.location.hostname === "gogoanime.lu") {
	let currentTitle = window.location.pathname.substring(1).split("-").join(" ");
	let c = currentTitle.split(" episode ");
	if (c.length == 2) {
		title = capitalize(c[0]);
		episode = capitalize(c[1]);
	}
}
else if (window.location.hostname === "bs.to") {
	let res = /serie\/([^\/]*)\/.*\/([^\/]*-Episode-[^\/]*)\//g.exec(window.location.pathname);
	if (res.length === 3) {
		title = capitalize(res[1].split("-").join(" "));
		episode = capitalize(res[2].split("-").join(" "));
	}
}

chrome.storage.sync.set({ title });
chrome.storage.sync.set({ episode });

chrome.storage.sync.get("watchlist", ({ watchlist }) => {
	if (title && episode) {
		watchlist[title] = {
			"episode": episode,
			"domain": window.location.hostname
		};
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