import * as irc from "irc";

export class IRCUser {
	constructor(name, network) {
	}
}

export class IRCChannel {
	constructor(name, network, pass) {
		this.name = name;
		this.pass = pass;
		this.network = network;
		this.users = {};

		network.client.on("names#"+name, (nicks) => {
			nicks.forEach((nick) => {
				this.users[nick] = new IRCUser(nick, network);
			});
		});

		network.client.on("join#"+name, (nick) => {
			this.users[nick] = new IRCUser(nick, network);
		});

		network.client.on("part#"+name, (nick) => {
			delete this.users[nick];
		});
	}

	say(msg) {
		this.network.client.say(this.name, msg);
	}

	join(pass) {
		if (pass)
			this.network.client.join(this.name+" "+pass);
		else
			this.network.client.join(this.name);
	}

	part() {
		this.network.client.part(this.name);
	}

	serialize() {
		return {
			name: this.name,
			pass: this.pass
		};
	}

	static deserialize(obj, network) {
		return new IRCChannel(obj.name, network, obj.pass);
	}
}

export class IRCNetwork {
	constructor(host, nick, options) {
		this.host = host;
		this.nick = nick;
		this.channels = {};

		this.options = options;
		if (options)
			this.options.channels = [];

		this.client = new irc.Client(host, nick, options);

		this.client.on("error", (err) => {
			console.log("irc error");
			console.trace(err);
		});
	}

	joinChannel(chan) {
		this.channels[chan.name] = chan;
		chan.join();
	}

	partChannel(name) {
		if (this.channels[name])
			this.channels[name].part();

		delete this.channels[name];
	}

	disconnect() {
		this.client.disconnect();
	}

	serialize() {
		return {
			host: this.host,
			nick: this.nick,
			channels: this.channels.map(chan => chan.serialize()),
			options: this.options
		};
	}

	static deserialize(obj) {
		let network = new IRCNetwork(obj.host, obj.nick, obj.options);

		network.client.addListener("registered", () => {
			obj.channels.forEach((obj) => {
				var chan = IRCChannel.deserialize(obj, network);
				network.joinChannel(chan);
			});
		});

		return network;
	}
}
