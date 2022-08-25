const _port = 8200;

const WebSocketServer = require('ws');
const wss = new WebSocketServer.Server({ port: _port })

let index = 0;
let groups = new Map();

function heartbeat() {
	this.isAlive = true;
}

wss.on("connection", ws => {
	ws.isAlive = true;
	ws.on('pong', heartbeat);
    console.log("New client connection");
	
    ws.on("message", (data) => {
		let j = JSON.parse(data);
		console.log(JSON.stringify(j));
		if (j.action) {
			switch (j.action) {
				case "NEWGROUP":
					const idhash = Buffer.from("groupwatchgroup--"+index).toString('base64');
					groups.set(idhash, {
						"id": index,
						"created": Date.now(),
						"lastmessage": Date.now(),
						"url": j.url
					});
					index++;
					console.log("Created new watchgroup with hash " + idhash);
					ws.send(JSON.stringify({ "event": "EVENT_JOINGROUP", "success": true, "message": "Successfully created a new room.", "idhash": idhash, "url": j.url }));
					ws.channel = idhash;
					break;
				case "JOINGROUP":
					if (ws.channel) {
						ws.send(JSON.stringify({ "event": "error", "success": false, "message": "You are already in a room. Please leave this one first!" }));
						break;
					}
					if (j.group) {
						if (!groups.has(j.group)) {
							ws.send(JSON.stringify({ "event": "error", "success": false, "message": "Room " + j.group + " doesn't exist." }));
						}
						else {
							let temp = groups.get(j.group);
							temp.lastmessage = Date.now();
							groups.set(j.group, temp);
							
							ws.channel = j.group;
							
							ws.send(JSON.stringify({ "event": "EVENT_JOINGROUP", "success": true, "message": "Successfully joined room " + j.group + ".", "idhash": j.group, "url": temp.url }));
							
							wss.clients.forEach(function each(client) { 
								if(client !== ws && client.channel === j.group) {
									client.send(JSON.stringify({ "event": "EVENT_BROADCAST", "message": "A new user joined your room." }));
								}
							});
						}
					}
					break;
				case "LEAVEGROUP":
					ws.channel = null;
					ws.send(JSON.stringify({ "event": "EVENT_LEAVEGROUP", "success": true, "message": "You left your group." }));
					break;
				case "SENDGROUP":
					if (!ws.channel) {
						ws.send(JSON.stringify({ "event": "error", "success": false, "message": "You haven't joined a room yet." }));
					}
					else {
						if (!j.message) {
							ws.send(JSON.stringify({ "success": false, "message": "Message was empty." }));
						}
						else {
							wss.clients.forEach(function each(client) { 
								if(client.channel === ws.channel) {
									client.send(JSON.stringify({ "event": "EVENT_BROADCAST", "message": j.message }));
								}
							});
						}
					}
					break;
			}
		}
    });
	
    ws.on("close", () => {
        console.log("\tClient disconnected.");
    });
	
    ws.onerror = function () {
        console.log("An error occurred")
    }
});

const int = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  });
}, 5000);

console.log("The WebSocket server is running on port " + _port);