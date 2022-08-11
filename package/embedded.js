// Runs in the tab with the player

const interval = 200;

let aS = false;
let sI = false;
let sO = false;

let t = "";
let e = -1;

let recap = -1;
let opening = -1;
let ending = -1;
let preview = -1;

chrome.storage.sync.get("autoStart", ({ autoStart }) => {
	aS = autoStart;
});
chrome.storage.sync.get("autoFullscreen", ({ autoFullscreen }) => {
	aF = autoFullscreen;
});
chrome.storage.sync.get("skipIntro", ({ skipIntro }) => {
  sI = skipIntro;
});
chrome.storage.sync.get("skipOutro", ({ skipOutro }) => {
  sO = skipOutro;
});
chrome.storage.sync.get("title", ({ title }) => {
	t = title;
	
	if (t !== null) {
		chrome.storage.sync.get("episode", ({ episode }) => {
			e = episode;

			if (e !== null)  {
				// get intro, outro length from database
				// info from https://github.com/jonbarrow/open-anime-timestamps
				// get anime id from title
				fetch(chrome.runtime.getURL("anime-titles.xml"))
				.then((response) => response.text())
				.then((res) => {
					parser = new DOMParser();
					let animeTitles = parser.parseFromString(res, "text/xml");
					let titles = animeTitles.getElementsByTagName("anime");
					
					for (let tit of titles) {
						for (let name of tit.getElementsByTagName("title")) {
							if (name.childNodes[0].nodeValue.toUpperCase() === t.toUpperCase()) {
								// get ep
								let num = tit.getAttribute("aid");
								fetch(chrome.runtime.getURL("timestamps.json"))
								.then((response) => response.json())
								.then((res) => {
									for (let ep of res[num]) {
										if (ep["episode_number"] === Number(e)) {
											//alert(JSON.stringify(ep));
											break;
										}
									}
									});
								break;
							}
						}
					}
				});
			}
		});
	}
});

const d = document.createElement("div");
const si = document.createElement("div");

const parseTime = (input) => {
	let ret = 0;
	let s = input.split(":");
	if(s.length == 3) {
		ret += parseInt(s[0]) * 60;
		ret += parseInt(s[1]) * 60;
		ret += parseInt(s[2]);
	}
	else if(s.length == 2) {
		ret += parseInt(s[0]) * 60;
		ret += parseInt(s[1]);
	}
	return ret;
};

const introLength = parseTime("1:59");
const outroLength = parseTime("1:50");

const nextEp = () => {
	let val = true;
	if (t && e)
		val = "https://gogoanime.lu/" + t.replace(/ /g, "-") + "-episode-" + e;
	chrome.runtime.sendMessage({closeTab: val});
}

const skipIntro = () => {
	window.postMessage({ player: "seek", time: introLength }, "*");
}


const checkTime = () => {
	if (document.visibilityState !== "hidden") {
		let timeElapsed, timeCountDown, timeDuration;
		
		if (window.location.hostname === "goload.io") {
			const te = document.querySelector(".jw-text-elapsed");
			const tc = document.querySelector(".jw-text-countdown");
			const td = document.querySelector(".jw-text-duration");

			if (te && tc && td) {
				timeElapsed = parseTime(te.innerHTML);
				timeCountDown = parseTime(tc.innerHTML);
				timeDuration = parseTime(td.innerHTML);
			}
		}
		else if (window.location.hostname === "vupload.com") {
			const te = document.querySelector(".vjs-current-time-display");
			const td = document.querySelector(".vjs-duration-display");

			if (te && td) {
				timeElapsed = parseTime(te.innerHTML);
				timeDuration = parseTime(td.innerHTML);
				
				timeCountDown = timeDuration - timeElapsed;
			}
		}
			
		if (timeDuration > 0) {			
			// skip intro
			if (timeElapsed < introLength - 5) {
				if (sI) {
					skipIntro();
				}
				else {
					si.style.display = "block";
				}
			}
			else {
				si.style.display = "none";
			}

			// next episode button
			if (outroLength > timeCountDown && timeElapsed > 30) {
				chrome.runtime.sendMessage({ fullscreen: false });
				if (sO) {
					nextEp();
				}
				else {
					d.style.display = "block";
				}
			}
			else {
				d.style.display = "none";
			}
		}
	}
};

const autoplay = () => {
	//console.log("Attempting to autostart the video");
	//send message to injected script to play
	window.postMessage({ player: "play" }, "*");
}

window.onload = function () {
	if (document.visibilityState !== "hidden") {
		if(aF === true) {
			// Make this view fullscreen
			chrome.runtime.sendMessage({ fullscreen: true });
		}

		// auto-click to start
		if(aS === true) {
			autoplay();
		}
	}
	
	d.style.display = "none";
	d.className += "button";
	d.innerHTML = "► " + chrome.i18n.getMessage("next_episode");
	d.addEventListener("click", () => { nextEp(); });
	document.body.appendChild(d);
	
	si.style.display = "none";
	si.className += "button";
	si.innerHTML = "►► " + chrome.i18n.getMessage("skip_intro");
	si.addEventListener("click", () => { skipIntro(); });
	document.body.appendChild(si);
	
	timer = setInterval(checkTime, interval);
}
window.onbeforeunload = function() {
	if (chrome.runtime?.id) {
		let title = null;
		chrome.storage.sync.set({ title });
		let episode = null;
		chrome.storage.sync.set({ episode });
	}
}

function injectScript (filePath, tag) {
	let node = document.getElementsByTagName(tag)[0];
	let script = document.createElement("script");
	script.setAttribute("type", "text/javascript");
	script.setAttribute("src", filePath);
	node.appendChild(script);
}

injectScript(chrome.runtime.getURL("inject.js"), "body");