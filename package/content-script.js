/* 
// 
// Runs on the website that has a link/iframe to the videoplayer
// 
*/
let title, season, episode;

function readTitle () {
	if (gogoanime.includes(window.location.hostname)) {
		let currentTitle = window.location.pathname.substring(1).split("-").join(" ");
		let c = currentTitle.split(" episode ");
		if (c.length > 0) {
			title = capitalize(c[0]);
			if (c.length == 2) {
				season = -1;
				episode = parseInt(c[1]);
			}
		}
	}
	else if (bs.includes(window.location.hostname)) {
		let res = /serie\/([^\/]*)\/.*\/[^\/]*-Episode-([\d]*)[^\/]*\//g.exec(window.location.pathname);
		if (res && res.length === 3) {
			title = capitalize(res[1].split("-").join(" "));
			season = -1;
			episode = parseInt(res[2]);
		}
		else {
			res = /serie\/([^\/]*)\/([\d*])*\/([\d*]*).*\/.*/g.exec(window.location.pathname);
			if (res && res.length === 4) {
				title = capitalize(res[1].split("-").join(" "));
				season = parseInt(res[2]);
				episode = parseInt(res[3]);
			}
		}
	}
	else if (window.location.hostname === "www.crunchyroll.com") {
		let res = /\/[^\/]*\/([^\/]*)\/episode-([\d]*)-/g.exec(window.location.pathname);
		if (res && res.length === 3) {
			title = capitalize(res[1].split("-").join(" "));
			season = -1;
			episode = parseInt(res[2]);
		}
	}

	chrome.storage.sync.set({ title });
	chrome.storage.sync.set({ season });
	chrome.storage.sync.set({ episode });

	chrome.storage.sync.get("watchlist", ({ watchlist }) => {
		if (title && episode) {
			watchlist[title] = {
				"season": 	season,
				"episode": 	episode,
				"url": 		window.location.toString()
			};
			chrome.storage.sync.set({ watchlist });
		}
	});
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.nextEpisode) {
		// Click link to next episode
		if (gogoanime.includes(window.location.hostname)) {
			document.querySelector(".anime_video_body_episodes_r a").click();
		}
		else if (bs.includes(window.location.hostname)) {
			let a = document.querySelector("#episodes li.active").nextElementSibling.getElementsByTagName("a");
			if (a.length === 1) {
				a[0].click();
			}
		}
	}
  }
);

window.onload = function () {
	readTitle();
	if (bs.includes(window.location.hostname)) {
		let hosts = [/*"streamzz"*/, "vupload", "videovard", "vidoza", "streamtape"]; // our preferred hosts that work with this plugins
		let tabs = document.querySelector(".hoster-tabs");
		
		if (tabs) {
			// Default host is in our list
			if (!hosts.includes(tabs.querySelector("li.active").innerText.trim().toLowerCase())) {
				// Select the first host we find
				for (let tab of tabs.getElementsByTagName("li")) {
					if (hosts.includes(tab.innerText.trim().toLowerCase())) {
						let a = tab.getElementsByTagName("a");
						if (a.length === 1) {
							a[0].click();
							break;
						}
					}
				}
			}
		}
	}
	
	let theFrame = null;
	
	document.querySelectorAll("iframe").forEach((f) => {
		if (f.src) {
			let u = new URL(f.src);
			if (_jw.includes(u.hostname) || _vjs.includes(u.hostname)) {
				chrome.runtime.sendMessage({ setData: true, url: u, value: { title: title, season: season, episode: episode, host: window.location.toString() }});
				theFrame = f;
				return;
			}
		}
	});
	
	if (theFrame !== null) {
		document.addEventListener("keydown", (event) => {
			if (event.isComposing || event.keyCode === 229) {
				return;
			}
			
			if (event.code === "Space" && !(document.activeElement instanceof HTMLInputElement)) {
				readTitle ();
				chrome.runtime.sendMessage({ openTab: theFrame.src });
				event.preventDefault();
			}
		});
	}
}