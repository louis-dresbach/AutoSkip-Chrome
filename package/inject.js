/* 
// 
// This gets injected into the page
// 
*/

let queue = [];

const _jw = [ // websites that use JWPlayer
	"goload.io",
	"gogohd.net",
	"videovard.sx"
];

const _vjs = [ // Website that use VJS or any other HTML5 video
	"vupload.com",
	"streamz.ws",
	"vidoza.net",
	"streamtape.com"
];

const maxDiff = 2; // max time difference for us to seek

const action = (data) => {
	let v = document.querySelector("video");
	if (_vjs.includes(window.location.hostname) && (typeof v === "undefined" || v === null)) {
		return;
	}
	switch(data.player) {
		case "play":
			if (_jw.includes(window.location.hostname)) {
				if (typeof jwplayer().play === "function") {
					window.jwplayer().play();
					
					let t = jwplayer().getCurrentTime();
					if (data.time && (data.time < t - maxDiff || data.time > t + maxDiff))
						window.jwplayer().seek(data.time);
				}
			}
			else if (_vjs.includes(window.location.hostname)) {
				v.play().catch((e) => { 
					v.muted = true; // Try again muted if our first try didn't work
					v.play().catch((e) => {  });
				});
				
				if (data.time && (data.time < v.currentTime - maxDiff || data.time > v.currentTime + maxDiff))
					v.currentTime = data.time;
			}
			break;
		case "pause":
			if (_jw.includes(window.location.hostname)) {
				if (typeof jwplayer().pause === "function") {
					window.jwplayer().pause();
					
					let t = jwplayer().getCurrentTime();
					if (data.time && (data.time < t - maxDiff || data.time > t + maxDiff))
						window.jwplayer().seek(data.time);
				}
			}
			else if (_vjs.includes(window.location.hostname)) {
				v.pause().catch((e) => { console.log(e) });
				
				if (data.time && (data.time < v.currentTime - maxDiff || data.time > v.currentTime + maxDiff))
					v.currentTime = data.time;
			}
			break;
		case "seek":
			if (_jw.includes(window.location.hostname)) {
				if (typeof jwplayer().seek === "function") {
					let t = jwplayer().getCurrentTime();
					
					if (data.time && (data.time < t - maxDiff || data.time > t + maxDiff))
						window.jwplayer().seek(data.time);
				}
			}
			else if (_vjs.includes(window.location.hostname)) {
				if (data.time && (data.time < v.currentTime - maxDiff || data.time > v.currentTime + maxDiff))
					v.currentTime = data.time;
			}
			break;
	}
};

const waitForPlayer = () => {
	if ((_jw.includes(window.location.hostname) && typeof jwplayer().on !== "function") || 
		(_vjs.includes(window.location.hostname)
			&& document.getElementsByTagName("video").length > 0 && document.getElementsByTagName("video")[0].readyState > 2)) {
		console.log("waiting for player");
		setTimeout(waitForPlayer, 300);
		return;
	}
	
	// work through queue
	queue.map((q) => {
		action(q);
	});
	queue = [];
}

window.onload = function () {
	window.addEventListener("message", (event) => {
		if(event.data.player) {
			if (_jw.includes(window.location.hostname)) {
				if (!jwplayer() || typeof jwplayer().on !== "function") {
					// queue action while we wait for the player to be ready
					queue.push(event.data);
					return;
				}
				action(event.data);
			}
			else if (_vjs.includes(window.location.hostname)) {
				let v = document.getElementsByTagName("video");
				if (v.length > 0 && v[0].readyState > 2) {
					action(event.data);
					return;
				}
				queue.push(event.data);
			}
		}
	}, false);
	
	waitForPlayer();
}