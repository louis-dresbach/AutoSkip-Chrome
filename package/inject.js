// This gets injected into the page

window.onload = function () {
	window.addEventListener("message", (event) => {
		if(event.data.player) {
			if (!jwplayer())
				return;
			
			if (event.data.player === "play") {
				if (typeof jwplayer().play === "function")
					window.jwplayer().play();
			}
			else if (event.data.player === "pause") {
				if (typeof jwplayer().pause === "function")
					window.jwplayer().pause();
			}
			else if (event.data.player === "seek") {
				if (typeof jwplayer().seek === "function") {
					window.jwplayer().seek(event.data.time);
				}
			}
		}
	}, false);
}