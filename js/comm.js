import * as http from 'http';
import EventListener from "events";

class Listener {
	constructor() {
		this.events = [];
		this.res = null;
	}

	addEvent(name, obj) {
		this.events.push({
			name: name,
			obj: obj
		});

		this.flush();
	}

	addRequest(req, res) {
		this.res = res;

		req.on("close", () => {
			this.req = null;
			this.res = null;
		});

		this.flush();
	}

	flush() {
		if (!this.res || this.events.length === 0)
			return;

		this.res.end(JSON.stringify(this.events));
		this.events = [];
		this.res = null;
	}
}

export default class Comm extends EventListener {
	handleRequest(req, res, body) {
		let args = req.url.substring(1).split("/");

		try {
			if (body)
				body = JSON.parse(body);
		} catch (err) {
			console.trace(err);
			return res.end(JSON.stringify({ error: err.message }));
		}

		switch (args[0]) {
		case "register":
			this.listeners[this.nextListener] = new Listener();
			res.end(this.nextListener.toString());
			this.nextListener += 1;
			break;

		case "event":
			let listener = this.listeners[args[1]];
			if (!listener)
				return err(res, "Listener "+args[1]+" not registered.");

			listener.addRequest(req, res);
			break;

		case "method":
			this.emit("message", args[1], body, (err, obj) => {
				if (err) {
					console.trace(err);
					res.end(JSON.stringify({ error: err }));
				} else {
					obj = obj || {};
					obj.success = true;
					res.end(JSON.stringify(obj));
				}
			});
			break;

		default:
			res.end("404 not found");
		}
	}

	constructor(port) {
		super();

		this.listeners = [];
		this.nextListener = 0;

		this.server = http.createServer((req, res) => {
			let body = "";
			req.on("data", (data) => body += data);
			req.on("end", () => {
				this.handleRequest(req, res, body);
			});
		});
		this.server.listen(port);

		console.log("HTTP server running on port "+port);
	}

	sendMessage(name, obj) {
		this.listeners.forEach((listener) => listener.addEvent(name, obj));
	}
}
