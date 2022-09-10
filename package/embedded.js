/* 
// 
// Runs in the tab with the player
// 
*/

if (window.self !== window.top) {
	// If we are in an iframe, open a new tab with current page
	chrome.runtime.sendMessage({ openTab: window.location.toString() });
}
else {
	let aS = false;
	let aF = false;
	let sI = false;
	let sO = false;

	let t = "";
	let aid = -1;

	let timestamps = {};

	const interval = 2000;
	let vTries = 0;
	let vMaxTries = 30;

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
		if (title !== null) {
			t = title;
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
						if (name.childNodes[0].nodeValue.split("-").join("").toUpperCase() === title.toUpperCase()) {
							aid = tit.getAttribute("aid");
							fetch(chrome.runtime.getURL("timestamps.json"))
							.then((response) => response.json())
							.then((ress) => {
								// This means all episodes have the same timestamps
								if ("all" in ress[aid]) {
									timestamps = ress[aid]["all"];
								}
								else {
									chrome.storage.sync.get("season", ({ season }) => {
										chrome.storage.sync.get("episode", ({ episode }) => {
											for (let k of Object.keys(ress[aid])) {
												let rese = /episodes (\d*)-(\d*)/g.exec(k);
												if (rese.length === 3) {
													if (Number(rese[1]) <= Number(episode) && Number(episode) <= Number(rese[2])) {
														alert();
														timestamps = ress[aid][k];
														break;
													}
												}
												let resee = /episode (\d*)/g.exec(k);
												if (resee.length === 3) {
													if (Number(resee[1]) == Number(episode)) {
														alert();
														timestamps = ress[aid][k];
														break;
													}
												}
												let ress = /seasons (\d*)-(\d*)/g.exec(k);
												if (ress.length === 3) {
													if (Number(rese[1]) <= Number(season) && Number(season) <= Number(rese[2])) {
														alert();
														timestamps = ress[aid][k];
														break;
													}
												}
											}
										});
									});
								}
								
								if (!timestamps["opening"] && _DEBUG) {
									alert("Add timestamps for " + title + "\r\nAID: " + aid);
								}
							});
							break;
						}
					}
				}
			});
		}
	});

	const d = document.createElement("div");
	const si = document.createElement("div");
	
	const sendmes = (mes) => {
		try {
			chrome.runtime.sendMessage(mes);
		}
		catch (e) {
			if (e.name === "Error" && e.message === "Extension context invalidated.") {
				location.reload();
			}
			else {
				console.log (e.message);
			}
		}
	}

	const nextEp = () => {
		sendmes({ fullscreen: false });
		sendmes({ closeTab: true });
	}

	const skipIntro = () => {
		if (timestamps["opening"]) {
			window.postMessage({ player: "seek", time: timestamps["opening"]["start"] + timestamps["opening"]["length"] - 1 }, "*");
		}
	}


	const checkTime = () => {
		if (document.visibilityState !== "hidden") {
			let timeElapsed, timeCountDown, timeDuration;
			
			if (_jw.includes(window.location.hostname)) {
				const te = document.querySelector(".jw-text-elapsed");
				const tc = document.querySelector(".jw-text-countdown");
				const td = document.querySelector(".jw-text-duration");

				if (te && tc && td) {
					timeElapsed = parseTime(te.innerHTML);
					timeCountDown = parseTime(tc.innerHTML);
					timeDuration = parseTime(td.innerHTML);
				}
			}
			else if (_vjs.includes(window.location.hostname)) {
				const te = document.querySelector(".vjs-current-time-display");
				const td = document.querySelector(".vjs-duration-display");

				if (te && td) {
					timeElapsed = parseTime(te.innerHTML);
					timeDuration = parseTime(td.innerHTML);
					
					timeCountDown = timeDuration - timeElapsed;
				}
			}
			else if (window.location.hostname === "streamtape.com") {
				const te = document.querySelector(".plyr__time--current");
				const td = document.querySelector(".plyr__time--duration");

				if (te && td) {
					timeElapsed = parseTime(te.innerHTML);
					timeDuration = parseTime(td.innerHTML);
					
					timeCountDown = timeDuration - timeElapsed;
				}
			}
			
			
			if (timeDuration > 1 && timestamps["opening"]) {
				// skip intro
				if (timestamps["opening"]["start"] > -1 && timeElapsed > timestamps["opening"]["start"] && timeElapsed < timestamps["opening"]["start"] + timestamps["opening"]["length"] - 5) {
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
				if (timestamps["outro"]["length"] > -1 && timestamps["outro"]["length"] > timeCountDown && timeElapsed > 30) {
					sendmes({ fullscreen: false });
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
			if (timeCountDown > 0 && timeCountDown < 5) {
				nextEp();
			}
		}
	};

	const findV = () => {
		if (vTries >= vMaxTries)
			return;
		vTries++;
		
		let v = document.getElementsByTagName("video");
		if (v.length > 0) {
			v[0].focus();
			v[0].addEventListener("pause", function (e) {
				sendmes({ player_paused: v[0].currentTime });
				if (aF === true) {
					sendmes({ fullscreen: false });
				}
			});
			v[0].addEventListener("ratechange", function (e) {
				sendmes({ player_ratechanged: v[0].playbackRate });
			});/*
			v[0].addEventListener("stalled", function (e) {
				//sendmes({ player_paused: v[0].currentTime });
			});
			v[0].addEventListener("waiting", function (e) {
				//sendmes({ player_paused: v[0].currentTime });
			});*/
			v[0].addEventListener("play", function (e) {
				sendmes({ player_played: v[0].currentTime });
				if (aF === true) {
					sendmes({ fullscreen: true });
				}
			});
			v[0].addEventListener("seeked", function (e) {
				sendmes({ player_seeked: v[0].currentTime });
			});
			if (document.visibilityState !== "hidden") {
				sendmes({ player_loaded: true, url: window.location.toString() });
				if(aS === true) {
					//send message to injected script to play
					window.postMessage({ player: "play" }, "*");
				}
				if(aF === true) {
					// Make this view fullscreen
					sendmes({ fullscreen: true });
				}
			}
		}
		else {
			setTimeout(function() {
				findV();
			}, interval);
		}
	}

	window.onload = function () {
		findV();
		
		d.style.display = "none";
		d.className += "autoskipper_button";
		d.innerHTML = "► " + chrome.i18n.getMessage("next_episode");
		d.addEventListener("click", () => { nextEp(); });
		document.body.appendChild(d);
		
		si.style.display = "none";
		si.className += "autoskipper_button";
		si.innerHTML = "►► " + chrome.i18n.getMessage("skip_intro");
		si.addEventListener("click", () => { skipIntro(); });
		document.body.appendChild(si);
		
		document.body.addEventListener('keydown', function (e) {
			switch (e.code) {
				case "KeyS":
					skipIntro();
					break;
				case "KeyN":
					nextEp();
					break;
				case "KeyD":
					if (_DEBUG) {
						alert(`${t} [${aid}]
${JSON.stringify(timestamps)}
`); 
					}
					break;
			}
		});
		
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

	chrome.storage.onChanged.addListener((changes, area) => {
		if (area == "sync") {
			if ("autoFullscreen" in changes) {
				aF = changes.autoFullscreen.newValue;
			}
			if ("skipIntro" in changes) {
				sI = changes.skipIntro.newValue;
			}
			if ("skipOutro" in changes) {
				sO = changes.skipOutro.newValue;
			}
		}
	});
		
	chrome.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
			if (request.player) {
				if (request.time)
					window.postMessage({ player: request.player, time: request.time }, "*");
				else
					window.postMessage({ player: request.player }, "*");
			}
		}
	);

	injectScript(chrome.runtime.getURL("inject.js"), "body");
}