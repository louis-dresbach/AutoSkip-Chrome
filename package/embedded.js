/* 
// 
// Runs in the tab with the player
// 
*/

if (window.self !== window.top) {
	// If we are in an iframe, open a new tab with current page
	if (!document.hidden)
		chrome.runtime.sendMessage({ openTab: window.location.toString() });
}
else {
	let aS = false;
	let aF = false;
	let sI = false;
	let sR = false;
	let sO = false;
	let sF = false;

	let t = "";
	let aid = -1;

	let timestamps = {};

	const interval = 500;
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
	chrome.storage.sync.get("skipRecap", ({ skipRecap }) => {
		sR = skipRecap;
	});
	chrome.storage.sync.get("skipOutro", ({ skipOutro }) => {
		sO = skipOutro;
	});
	chrome.storage.sync.get("skipFiller", ({ skipFiller }) => {
		sF = skipFiller;
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
								if (!(aid in ress) && _DEBUG) {
									alert("Add timestamps for " + title + "\r\nAID: " + aid);
									return;
								}
								// This means all episodes have the same timestamps
								if ("all" in ress[aid]) {
									timestamps = ress[aid]["all"];
								}
								else {
									chrome.storage.sync.get("season", ({ season }) => {
										chrome.storage.sync.get("episode", ({ episode }) => {
											if (aid in ress) {
												if (("episode " + episode) in ress[aid]) {
													timestamps = ress[aid]["episode " + episode];
												}
												else {
													for (let [k,v] of Object.entries(ress[aid])) {
														const rese = /episodes (\d*)-(\d*)/g.exec(k);
														if (rese && rese.length === 3) {
															if (Number(rese[1]) <= Number(episode) && Number(episode) <= Number(rese[2])) {
																timestamps = v;
																break;
															}
														}/*
														else {
															const ress = /seasons (\d*)-(\d*)/g.exec(k);
															if (ress.length === 3) {
																if (Number(rese[1]) <= Number(season) && Number(season) <= Number(rese[2])) {
																	timestamps = ress[aid][k];
																	break;
																}
															}
														}*/
													}
												}
											}
										});
									});
								}
							});
							break;
						}
					}
				}
			});
		}
	});

	const buttonNextEpisode = document.createElement("div");
	const buttonSkipIntro = document.createElement("div");
	const buttonSkipRecap = document.createElement("div");
	const buttonSkipPreview = document.createElement("div");
	
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
		if ("opening" in timestamps) {
			let time = timestamps["opening"]["start"] + timestamps["opening"]["length"];
			if (timestamps["intro"])
				time += timestamps["intro"]["length"];
			window.postMessage({ player: "seek", time: time - 0.5 }, "*");
		}
	}

	const skipRecap = () => {
		if ("recap" in timestamps) {
			window.postMessage({ player: "seek", time: timestamps["recap"]["start"] + timestamps["recap"]["length"] - 0.5 }, "*");
		}
	}

	const skipPreview = () => {
		if ("preview" in timestamps) {
			window.postMessage({ player: "seek", time: timestamps["preview"]["start"] + timestamps["preview"]["length"] - 0.5 }, "*");
		}
	}


	const checkTime = () => {
		if (document.visibilityState !== "hidden") {
			let timeElapsed, timeCountDown, timeDuration;
												
			if ("filler" in timestamps && timestamps["filler"] === true && sF === true) {
				nextEp();
			}
			
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
			
			
			if (timeDuration > 1) {
				// skip intro
				if ("opening" in timestamps && timestamps["opening"]["start"] > -1 && 
					timeElapsed >= timestamps["opening"]["start"] && timeElapsed <= timestamps["opening"]["start"] + timestamps["opening"]["length"] - 2) {
					if (sI) {
						// if we are going to skip recap anyway and it is right after the intro, immediately skip to the end of that
						if (sR && "recap" in timestamps && timestamps["recap"]["start"] > -1 &&
							timestamps["recap"]["start"] >= timestamps["opening"]["start"] + timestamps["opening"]["length"] - 2 &&
							timestamps["recap"]["start"] <= timestamps["opening"]["start"] + timestamps["opening"]["length"] + 2) {
							skipRecap();
						}
						else {
							skipIntro();
						}
					}
					else {
						buttonSkipIntro.style.display = "block";
					}
				}
				else {
					buttonSkipIntro.style.display = "none";
				}
				
				// skip recap
				if ("recap" in timestamps && timestamps["recap"]["start"] > -1 && 
					timeElapsed >= timestamps["recap"]["start"] && timeElapsed <= timestamps["recap"]["start"] + timestamps["recap"]["length"] - 2) {
					if (sR) {
						skipRecap();
					}
					else {
						buttonSkipRecap.style.display = "block";
					}
				}
				else {
					buttonSkipRecap.style.display = "none";
				}

				// next episode button
				if ("outro" in timestamps || "preview" in timestamps) {
					let len = 0;
					
					if ("outro" in timestamps)
						len += timestamps["outro"]["length"];
					
					if ("preview" in timestamps)
						len += timestamps["preview"]["length"];
					
					if (len > timeCountDown && timeElapsed > 30) {
						sendmes({ fullscreen: false });
						if (sO) {
							nextEp();
						}
						else {
							buttonNextEpisode.style.display = "block";
						}
					}
					else {
						buttonNextEpisode.style.display = "none";
					}
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
		
		buttonNextEpisode.style.display = "none";
		buttonNextEpisode.className += "autoskipper_button";
		buttonNextEpisode.innerHTML = "► " + chrome.i18n.getMessage("next_episode");
		buttonNextEpisode.addEventListener("click", () => { nextEp(); });
		document.body.appendChild(buttonNextEpisode);
		
		buttonSkipIntro.style.display = "none";
		buttonSkipIntro.className += "autoskipper_button";
		buttonSkipIntro.innerHTML = "►► " + chrome.i18n.getMessage("skip_intro");
		buttonSkipIntro.addEventListener("click", () => { skipIntro(); });
		document.body.appendChild(buttonSkipIntro);
		
		buttonSkipRecap.style.display = "none";
		buttonSkipRecap.className += "autoskipper_button";
		buttonSkipRecap.innerHTML = "►► " + chrome.i18n.getMessage("skip_recap");
		buttonSkipRecap.addEventListener("click", () => { skipRecap(); });
		document.body.appendChild(buttonSkipRecap);
		
		buttonSkipPreview.style.display = "none";
		buttonSkipPreview.className += "autoskipper_button";
		buttonSkipPreview.innerHTML = "►► " + chrome.i18n.getMessage("skip_preview");
		buttonSkipPreview.addEventListener("click", () => { skipPreview(); });
		document.body.appendChild(buttonSkipPreview);
		
		document.body.addEventListener('keydown', function (e) {
			switch (e.code) {
				case "KeyS":
					//skipIntro();
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
			if ("skipRecap" in changes) {
				sR = changes.skipRecap.newValue;
			}
			if ("skipOutro" in changes) {
				sO = changes.skipOutro.newValue;
			}
			if ("skipFiller" in changes) {
				sF = changes.skipFiller.newValue;
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