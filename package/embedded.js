// Runs in the tab with the player

const interval = 200;

let aS = false;
let sI = false;
let sO = false;

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

// get intro, outro length from database

const lengths = {
	"one piece": {
		"intro": "1:30",
		"outro": "1:50"
	},
	"default": {
		"intro": "1:30",
		"outro": "1:00"
	}
}

const introLength = parseTime("4:48");
const outroLength = parseTime("1:50");

const nextEp = () => {
	chrome.runtime.sendMessage({closeTab: true});
}

const skipIntro = () => {
	window.postMessage({ player: "seek", time: introLength }, "*");
}


const checkTime = () => {
		if (document.visibilityState !== "hidden") {
		let timeElapsed, timeCountDown, timeDuration;

		const te = document.querySelector(".jw-text-elapsed");
		const tc = document.querySelector(".jw-text-countdown");
		const td = document.querySelector(".jw-text-duration");

		if (te && tc && td) {
			timeElapsed = parseTime(te.innerHTML);
			timeCountDown = parseTime(tc.innerHTML);
			timeDuration = parseTime(td.innerHTML);
			
			if (timeDuration > 0) {
				//console.log("Time: " + timeElapsed + " : " + timeDuration);
				
				
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
	d.innerHTML = "► Next episode";
	d.addEventListener("click", () => { nextEp(); });
	document.body.appendChild(d);
	
	si.style.display = "none";
	si.className += "button";
	si.innerHTML = "Skip Intro";
	si.addEventListener("click", () => { skipIntro(); });
	document.body.appendChild(si);
	
	timer = setInterval(checkTime, interval);
}

function injectScript (filePath, tag) {
	let node = document.getElementsByTagName(tag)[0];
	let script = document.createElement("script");
	script.setAttribute("type", "text/javascript");
	script.setAttribute("src", filePath);
	node.appendChild(script);
}

injectScript(chrome.runtime.getURL("inject.js"), "body");