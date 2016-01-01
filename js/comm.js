import * as http from "http";
import * as crypto from "crypto";
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

class Keyring {
	constructor() {
		this.keys = {};
	}

	createKey() {
		return crypto.randomBytes(64).toString("hex");
	}

	addKey() {
		let key = this.createKey();
		this.keys[key] = true;
		return key;
	}

	isKeyValid(key) {
		return !!this.keys[key];
	}
}

export default class Comm extends EventListener {
	constructor(port, pass) {
		super();

		this.keyring = new Keyring();
		this.listeners = [];
		this.nextListener = 0;
		this.port = port;
		this.pass = pass;
	}

	handleRequest(req, res, body) {
		let args = req.url.substring(1).split("/");

		res.json = (obj) => {
			res.end(JSON.stringify(obj)+"\n");
		}
		res.error = (err) => {
			res.json({ error: err.toString() });
		}

		//Parse body json
		try {
			if (body)
				body = JSON.parse(body);
		} catch (err) {
			console.trace(err);
			return res.end(JSON.stringify({ error: err.message }));
		}

		//Login key validation
		if (args[0] !== "login" && !this.keyring.isKeyValid(body.key)) {
			return res.error("Not logged in.");
		}

		switch (args[0]) {
		case "login":
			if (body.pass === this.pass) {
				let key = this.keyring.addKey();
				res.json({ key: key });
			} else {
				res.error("Invalid key.");
			}
			break;

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
					res.error(err);
				} else {
					obj = obj || {};
					obj.success = true;
					res.json(obj);
				}
			});
			break;

		default:
			res.error("Method doesn't exist");
		}
	}

	init() {
		this.server = http.createServer((req, res) => {
			let body = "";
			req.on("data", (data) => body += data);
			req.on("end", () => {
				this.handleRequest(req, res, body);
			});
		});
		this.server.listen(this.port);

		console.log("HTTP server running on port "+this.port);
	}

	sendMessage(name, obj) {
		this.listeners.forEach((listener) => listener.addEvent(name, obj));
	}
}
