import * as irc from "irc";
import EventListener from "events";

export default class IRCController extends EventListener {
	constructor() {
		super();
		this.networks = {};
	}

	network_connect(host, nick, options) {
		return new Promise((resolve, reject) => {
			if (this.networks[host])
				return reject("Network "+host+" already connected.");

			let network = new irc.Client(host, nick, options);
			this.networks[host] = network;

			network.on("registered", () => {
				this.emit("event", "network_connect", host);
				resolve();
			});

			network.on("error", msg => {
				console.log("Error from "+host+":");
				console.log(msg);
			});
		});
	}

	network_disconnect(host, msg) {
		return new Promise((resolve, reject) => {
			let network = this.networks[host];

			if (!network)
				return reject("Network "+host+" is not connected.");

			network.disconnect(msg, () => {
				this.emit("event", "network_disconnect", host);
				resolve();
			});
			delete this.networks[host];
		});
	}

	channel_join(host, chan) {
		return new Promise((resolve, reject) => {
			let network = this.networks[host];

			if (!network)
				return reject("Network "+host+" is not connected.");

			network.join(chan, () => {
				this.emit("event", "channel_join", host, chan);
				resolve();
			});
		});
	}

	channel_part(host, chan, message) {
		return new Promise((resolve, reject) => {
			let network = this.networks[host];

			if (!network)
				return reject("Network "+host+" is not connected.");

			network.part(chan, message, () => {
				this.emit("event", "channel_part", host, chan);
				resolve();
			});
		});
	}

	channel_say(host, chan, message) {
		return new Promise((resolve, reject) => {
			let network = this.networks[host];

			if (!network)
				return reject("Network "+host+" is not connected.");

			network.say(chan, message);
			resolve();
		});
	}

	serialize() {
		let networks = [];

		for (let i in this.networks) {
			networks.push({
				host: i,
				nick: this.networks[i].nick,
				chans: Object.keys(this.networks[i].chans),
				opts: this.networks[i].opt
			});
		}

		return networks;
	}

	deserialize(networks, defaults) {
		return new Promise((resolve, reject) => {
			let promises = networks.map((net) => {
				return new Promise((resolve, reject) => {
					let options = {
						channels: net.chans
					};

					net.opts = net.opts || {};
					for (let i in defaults) {
						options[i] = net.opts[i] || defaults[i];
					}

					this.network_connect(net.host, net.nick, options)
						.then(resolve, reject);
				});
			});

			Promise.all(promises).then(resolve);
		});
	}

	getState() {
		function user(name, mode) {
			return new Promise((resolve, reject) => {
				resolve({
					name: name,
					mode: mode
				});
			});
		}

		function channel(chan) {
			return new Promise((resolve, reject) => {
				Promise.all(Object.keys(chan.users).map(k => user(k, chan.users[k])))
					.then(users => {
						resolve({
							name: chan.key,
							users: users,
							topic: chan.topic,
							mode: chan.mode
						});
					})
					.catch(reject);
			});
		}

		function network(net) {
			return new Promise((resolve, reject) => {
				Promise.all(Object.keys(net.chans).map(k => channel(net.chans[k])))
					.then(chans => {
						resolve({
							server: net.opt.server,
							nick: net.nick,
							//motd: net.motd,
							userName: net.opt.userName,
							realName: net.opt.realName,
							channes: chans
						});
					})
					.catch(reject);
			});
		}

		return Promise.all(Object.keys(this.networks).map(key => {
			return network(this.networks[key]);
		}));
	}
}
