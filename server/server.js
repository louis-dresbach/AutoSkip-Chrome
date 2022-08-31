import { createServer } from 'https';
import { readFileSync } from 'fs';
import { WebSocketServer } from 'ws';

import winston from 'winston';

winston.configure({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY/MM/DD HH:mm:ss' }),
    winston.format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    //
	new winston.transports.Console({
		format: winston.format.combine(
			winston.format.colorize(),
			winston.format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
		)}),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ]
});

const server = createServer({
  cert: readFileSync('/etc/letsencrypt/live/k3i.de/cert.pem'),
  key: readFileSync('/etc/letsencrypt/live/k3i.de/privkey.pem')
});
const wss = new WebSocketServer({ server });

let index = 0;
let groups = new Map();
let clientIndex = 0;

wss.on("connection", ws => {
    winston.log("info", "New client connection");
	ws.id = Buffer.from("client--" + clientIndex).toString('base64');
	clientIndex++;
	winston.log("debug", "Client ID: " + ws.id);
	
    ws.on("message", (data) => {
		let j = JSON.parse(data);
		winston.log("debug", "Message from client " + ws.id + ": " + JSON.stringify(j));
		if (j.action) {
			switch (j.action) {
				case "NEWGROUP":
					const idhash = Buffer.from("groupwatchgroup--"+index).toString('base64');
					groups.set(idhash, {
						id: index,
						created: Date.now(),
						lastmessage: Date.now(),
						url: j.url,
						clients: 1
					});
					index++;
					winston.log("info", "Created new watchgroup with hash " + idhash);
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
							temp.clients = temp.clients + 1;
							groups.set(j.group, temp);
							
							ws.channel = j.group;
							
							ws.send(JSON.stringify({ "event": "EVENT_JOINGROUP", "success": true, "message": "Successfully joined room " + j.group + ".", "idhash": j.group, "url": temp.url }));
							winston.log("info", "Client " + ws.id + " joined watchgroup " + j.group);
							
							wss.clients.forEach(function each(client) { 
								if(client !== ws && client.channel === j.group) {
									client.send(JSON.stringify({ "event": "EVENT_BROADCAST", "message": "A new user joined your room." }));
								}
							});
						}
					}
					break;
				case "LEAVEGROUP":
					let temp = groups.get(ws.channel);
					temp.lastmessage = Date.now();
					temp.clients = temp.clients - 1;
					groups.set(ws.channel, temp);
					
					ws.send(JSON.stringify({ "event": "EVENT_LEAVEGROUP", "success": true, "message": "You left your group." }));
					winston.log("info", "Client " + ws.id + " left watchgroup " + ws.channel);
					
					ws.channel = null;
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
							winston.log("debug", "Client " + ws.id + " sent a message to their watchgroup (" + ws.channel + "): " + j.message);
							wss.clients.forEach(function each(client) { 
								if(client.channel === ws.channel) {
									client.send(JSON.stringify({ "event": "EVENT_BROADCAST", "message": j.message }));
								}
							});
						}
					}
					break;
				case "NEWURL":
					if (!ws.channel) {
						ws.send(JSON.stringify({ "event": "error", "success": false, "message": "You haven't joined a room yet." }));
					}
					else {
						if (!j.url) {
							ws.send(JSON.stringify({ "success": false, "message": "URL was empty." }));
						}
						else {
							let temp = groups.get(ws.channel);
							temp.lastmessage = Date.now();
							groups.set(ws.channel, temp);
							
							winston.log("debug", "Client " + ws.id + " changed the URL for their watchgroup (" + ws.channel + "): " + j.message);
							wss.clients.forEach(function each(client) { 
								if(client.channel === ws.channel) {
									client.send(JSON.stringify({ "event": "EVENT_NEWURL", "url": j.url }));
								}
							});
						}
					}
					break;
			}
		}
    });
	
    ws.on("close", () => {
        winston.log("info", "\tClient " + ws.id + " disconnected.");
		clearInterval(ws.timer);
		
		if (ws.channel) {
			let temp = groups.get(ws.channel);
			temp.lastmessage = Date.now();
			temp.clients = temp.clients - 1;
			groups.set(ws.channel, temp);
		}
    });
	
    ws.on("error", () => {
        winston.log("error", "An error occurred")
    });
	
    ws.on("pong", () => {
		ws.isAlive = true;
		winston.log("debug", "Received a pong from client " + ws.id + ".");
	});
	
    ws.timer = setInterval(() => {
		ping(ws);
	}, 15000);
});

const ping = (ws) => {
    if (ws.isAlive === false) return ws.terminate();
	
	ws.isAlive = false;
    winston.log("debug", "Sending a ping to client " + ws.id + ".");
    ws.ping();
}

const clearOldGroups = () => {
	const diff = 12 * 60 * 60 * 1000; // 12 Hours
	groups.forEach((val, key) => {
		if (val.lastmessage + diff < Date.now()) {
			// group hasn't seen activity in a while
			winston.log("debug", "Inactive group " + key + " was deleted.");
			groups.delete(key);
		}
		if (val.clients <= 0) {
			// group is empty
			winston.log("debug", "Empty group " + key + " was deleted.");
			groups.delete(key);
		}
	});
}

setInterval(() => {
	clearOldGroups();
}, 3000);

server.listen(8080);

winston.log("info", "The WebSocket server started running");