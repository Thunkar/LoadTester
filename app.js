const Vorpal = require('vorpal');
const chalk = Vorpal().chalk;
const loadtester = new Vorpal();
const http = require('http');
const async = require('async');
const fs = require('fs');
const moniker = require('moniker');

function request(options, callback) {
	const result = {};
	const req = http.request(options.http, (res) => {
		result.endTime = Date.now();
		return callback(undefined, result);
	});

	req.on('error', (err) => {
		result.endTime = Date.now();
		result.error = err.message;
		return callback(undefined, result)
	});

	result.initTime = Date.now();
	req.end();
}


loadtester.command('fire <url>')
	.description('Sends requests to the specified URL, logging the time')
	.option('-m --method <method>', 'HTTP Method')
	.option('-p --port <port>', 'Port, if other than 80 or 443')
	.option('-c --clients <clients>', 'Number of simultaneous clients')
	.option('-r --requests <requests>', 'Max. number of requests per client')
	.option('-d --duration <duration>', 'Max. duration of the test in seconds')
	.option('-f, --file <path>', 'Output file')
	.action((args, callback) => {
		const url = args.url.match(new RegExp("^(.*:)//([A-Za-z0-9\-\.]+)(:[0-9]+)?(.*)$"));
		const httpOptions = {
			host: url[2] + (url[3] || ""),
			path: url[4] || "/"
		}
		if (args.options.method)
			httpOptions.method = args.options.method
		if (args.options.port)
			httpOptions.port = args.options.port
		else if(url[1] == "http:")
			httpOptions.port = 80;
		else 
			httpOptions.port = 443;
		const parallelRequests = args.options.clients || 1;
		const maxRequestsPerClient = args.options.requests || 10;
		let remainingTime = args.options.duration || 10;
		const options = {};
		options.http = httpOptions;
		function wrapClient(callback) {
			let requests = Number(maxRequestsPerClient);
			const results = [];
			const name = moniker.choose();
			async.whilst(() => { return remainingTime > 0 && requests > 0 }, (callback) => {
				request(options, (err, result) => {
					requests--;
					result.client = name;
					results.push(result);
					return callback(undefined);
				});
			}, (err) => {
				return callback(undefined, results);
			});
		}
		async.times(parallelRequests, (n, next) => {
			wrapClient((err, results) => {
				next(err, results);
			});
		}, (err, results) => {
			results = [].concat.apply([], results);
			if(args.options.file)
				fs.writeFileSync(args.options.file, JSON.stringify(results, null, 4));
			loadtester.log(results);
			return callback();
		});
		let tick = function () {
			if (remainingTime > 0) {
				remainingTime--;
				setTimeout(tick, 1000);
			}
		}
		tick();
	});

loadtester.delimiter(chalk.cyan('loadtester~$')).show();