import * as fs from "fs";
import * as readline from "readline";
import File from "./js/file";
import * as irclib from "./js/irclib";
import Comm from "./js/comm";

let conf = JSON.parse(fs.readFileSync("conf.json"));

let networks = {};
let dir = null;

//For sanity
process.on("unhandledRejection", (err) => console.trace(err));

function deinit() {
	return new Promise((resolve, reject) => {
		let promises = [];

		for (let i in networks) {
			let network = networks[i];
			promises.push(dir.sub(network.host).write(
				JSON.stringify(network.serialize())
			));
		}

		Promise.all(promises).then(() => {
			resolve();
		}).catch((err) => {
			reject(err);
		});
	});
}

function init() {
	dir.readdir().then((files) => {
		files.forEach((file) => {
			let name = file.basename;

			file.read().then((str) => {
				networks[name] = irclib.IRCNetwork.deserialize(JSON.parse(str));
			});
		});
	});

	let comm = new Comm(conf.port);

	function arg(type, obj, name) {
		if (typeof obj[name] !== type) {
			throw {
				isArgError: true,
				msg: "expected "+name+" to be "+type+", got "+(typeof obj[name])
			};
		}
	}

	comm.on("message", (name, obj, cb) => {
		let network = networks[obj.host];
		let channel;
		if (network)
			channel = network.channels[obj.channel];

		try {
			switch (name) {

			//host
			case "network_remove":
				arg("string", obj, "host");

				network.disconnect();
				delete networks[obj.host];

				cb();
				break;

			//host, nick
			case "network_connect":
				arg("string", obj, "host");
				arg("string", obj, "nick");

				if (network)
					return cb("Network "+obj.host+" already connected.");

				networks[obj.host] = new irclib.IRCNetwork(obj.host, obj.nick);
				cb();
				break;

			//host, channel
			case "channel_part":
				arg("string", obj, "host");
				arg("string", obj, "channel");

				if (!network)
					return cb("Network "+obj.host+" is not connected.");

				network.partChannel(obj.channel);
				cb();
				break;

			//host, channels, [pass]
			case "channel_join":
				arg("string", obj, "host");
				arg("string", obj, "channel");

				if (!network)
					return cb("Network "+obj.host+" is not connected.");

				let chan = new irclib.IRCChannel(obj.channel, network, obj.pass);
				network.joinChannel(chan);
				cb();
				break;

			//host, channel, message
			case "channel_say":
				arg("string", obj, "host");
				arg("string", obj, "channel");
				arg("string", obj, "msg");

				if (!channel)
					return cb("Channel "+obj.channel+" is not joined.");

				channel.say(obj.msg);
				cb();
				break;
			}
		} catch (err) {
			if (err.isArgError) {
				cb(err.msg);
			} else {
				cb(err.toString());
				throw err;
			}
		}
	});
}

export function start(path) {
	dir = new File(path);

	dir.mkdir().then(() => {
		init();
	}).catch((err) => {
		if (err.code === "EEXIST")
			return init();
		else
			throw err;
	});
}

//Save state on exit
process.on("SIGINT", onexit);
process.on("SIGTERM", onexit);
function onexit() {
	deinit().then(() => {
		process.exit();
	});
}
