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
	constructor(keyTimeout = false, bytes = 8) {
		this.keyTimeout = keyTimeout;
		this.bytes = bytes;
		this.keys = {};
		this.timeouts = {};
	}

	createKey() {
		return crypto.randomBytes(this.bytes).toString("hex");
	}

	addKey(data = true) {
		let key = this.createKey();
		this.keys[key] = {
			data: data
		};

		if (this.keyTimeout) {
			this.timeouts[key] = setTimeout(() => {
				this.destroy(key);
			}, this.keyTimeout);
		}

		return key;
	}

	destroy(key) {
		delete this.keys[key];
		if (this.timeouts[key]) {
			clearTimeout(this.timeouts[key]);
			delete this.timeouts[key];
		}
	}

	get(key) {
		return this.keys[key].data;
	}

	isKeyValid(key) {
		return this.keys[key] !== false && this.keys[key] !== undefined;
	}
}

export default class Comm extends EventListener {
	constructor(port, pass) {
		super();

		this.uploads = new Keyring(60000);
		this.keyring = new Keyring();
		this.listeners = [];
		this.nextListener = 0;
		this.port = port;
		this.pass = pass;
	}

	handleRequest(req, res, args, body) {
		res.json = (obj) => {
			res.end(JSON.stringify(obj)+"\n");
		}
		res.error = (err) => {
			res.json({ error: err.toString() });
		}

		//Parse body json
		try {
			if (body && args[0] !== "upload")
				body = JSON.parse(body);
		} catch (err) {
			console.trace(err);
			return res.end(JSON.stringify({ error: err.message }));
		}

		//Login key validation
		if (args[0] !== "login" &&
				args[0] !== "validate" &&
				args[0] !== "upload" &&
				!this.keyring.isKeyValid(body.key)) {
			return res.error("Invalid key.");
		}

		switch (args[0]) {

		//Give client auth key in return for password
		case "login":
			if (body.pass === this.pass) {
				let key = this.keyring.addKey();
				res.json({ key: key });
			} else {
				res.error("Invalid password.");
			}
			break;

		//Let client check if key is valid
		case "validate":
			res.json({ valid: this.keyring.isKeyValid(body.key) });
			break;

		//Register an HTTP event listener
		case "register":
			this.listeners[this.nextListener] = new Listener();
			res.end(this.nextListener.toString());
			this.nextListener += 1;
			break;

		//Long poll for an event with HTTP
		case "event":
			let listener = this.listeners[args[1]];
			if (!listener)
				return err(res, "Listener "+args[1]+" not registered.");

			listener.addRequest(req, res);
			break;

		//Method, for software to interat with
		case "method":
			this.emit("method", args[1], body, (err, obj) => {
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

		//Request to get content through URL,
		//for cases where JSON through the body is impractical
		case "get":
			this.emit("get", req, res, args);
			break;

		//Prepare binary friendly upload
		case "initupload":
			if (!body)
				return res.error("No body provided");

			res.json({
				key: this.uploads.addKey(body.data)
			});
			break;

		//Binary friendly upload
		case "upload":
			let key = args[1];

			if (!this.uploads.isKeyValid(key))
				return res.error("Invalid key");

			this.emit("upload", body, this.uploads.get(key), (err) => {
				if (err) res.end(err);
				else res.end();
			});
			this.uploads.destroy(key);

			res.json();
			break;

		default:
			res.writeHead(404);
			res.error("404 Not Found");
		}
	}

	init() {
		this.server = http.createServer((req, res) => {
			let args = req.url.substring(1).split("/");

			let body = "";
			req.on("data", (data) => body += data);
			req.on("end", () => {
				this.handleRequest(req, res, args, body);
			});
		});
		this.server.listen(this.port);

		console.log("HTTP server running on port "+this.port);
	}

	sendMessage(name, obj) {
		this.listeners.forEach((listener) => listener.addEvent(name, obj));
	}
}
