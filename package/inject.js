// This gets injected into the page
let queue = [];

const action = (data) => {
	let v = document.getElementsByTagName("video");
	switch(data.player) {
		case "play":
			if (window.location.hostname === "goload.io") {
				if (typeof jwplayer().play === "function")
					window.jwplayer().play();
			}
			else if (window.location.hostname === "vupload.com") {
				v[0].play().catch((e) => {console.log(e)});
			}
			break;
		case "pause":
			if (window.location.hostname === "goload.io") {
				if (typeof jwplayer().pause === "function")
					window.jwplayer().pause();
			}
			else if (window.location.hostname === "vupload.com") {
				v[0].pause();
			}
			break;
		case "seek":
			if (window.location.hostname === "goload.io") {
				if (typeof jwplayer().seek === "function") {
					window.jwplayer().seek(data.time);
				}
			}
			else if (window.location.hostname === "vupload.com") {
				v[0].currentTime = data.time;
			}
			break;
	}
};

const waitForPlayer = () => {
	if ((window.location.hostname === "goload.io" && typeof jwplayer().on !== "function") || (window.location.hostname === "vupload.com" && document.getElementsByTagName("video").length > 0 && document.getElementsByTagName("video")[0].readyState > 2)) {
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
			if (window.location.hostname === "goload.io") {
				if (!jwplayer() || typeof jwplayer().on !== "function") {
					// queue action while we wait for the player to be ready
					queue.push(event.data);
					return;
				}
				action(event.data);
			}
			else if (window.location.hostname === "vupload.com") {
				let v = document.getElementsByTagName("video");
				if (v.length > 0 && v[0].readyState > 2) {
					action(event.data);
					return;
				}
				action(event.data);
			}
		}
	}, false);
	
	waitForPlayer();
}