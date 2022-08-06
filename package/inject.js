// This gets injected into the page
let queue = [];

const action = (data) => {
	if (data.player === "play") {
		if (typeof jwplayer().play === "function")
			window.jwplayer().play();
	}
	else if (data.player === "pause") {
		if (typeof jwplayer().pause === "function")
			window.jwplayer().pause();
	}
	else if (data.player === "seek") {
		if (typeof jwplayer().seek === "function") {
			window.jwplayer().seek(data.time);
		}
	}
};

const waitForPlayer = () => {
	if (typeof jwplayer().on !== "function") {
		setTimeout(() => { waitForPlayer() }, 300);
		return;
	}
	
	// work through queue
	queue.map((q) => {
		action(q);
	});
}

window.onload = function () {
	waitForPlayer();

	window.addEventListener("message", (event) => {
		if(event.data.player) {
			if (!jwplayer() || typeof jwplayer().on !== "function") {
				// queue action while we wait for the player to be ready
				queue.push(event.data);
				return;
			}
			action(event.data);
		}
	}, false);
}