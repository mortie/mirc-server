export class IRCUser {
	constructor(name, network) {
	}
}

export class IRCChannel {
	constructor(name, network) {
		this.name = name;
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
			this.network.client.join(this._name+" "+pass);
		else
			this.network.client.join(this._name);
	}

	part() {
		this.network.part(this._name);
	}

	serialize() {
		return JSON.stringify({
			name: this.name
		});
	}
}

export class IRCNetwork {
	constructor(host, nick, channels, options) {
		this.host = host;
		this.nick = nick;
		this.channels = channels;

		//Having channels in options here wouldn't really work would it
		if (options)
			options.channels = null;

		this.client = new irc.Client(host, nick, options);
	}

	serialize() {
		return JSON.stringify({
			host: this.host,
			nick: this.nick,
			channels: this.channels.map(chan => chan.name),
			options: this.options
		});
	}

	static deserialize(str) {
		var obj = JSON.parse(str);
		var channels = obj.channels.map(name => new IRCChannel(name, this));
		return new IRCChannel(obj.host, obj.nick, channels);
	}
}
