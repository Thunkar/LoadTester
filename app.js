const vorpal = require('vorpal');
const chalk = vorpal().chalk;
const loadtester = new vorpal();
const http = require('http');
const async = require('async');
const fs = require('fs');
const moniker = require('moniker');
const progressBar = require('progress');
var https = require('https');

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

function processResults(options, results) {
	var toPrint = {
		totalRequests: results.length,
		totalAverage: 0,
		totalErrors: 0,
		clientStats: {}
	};
	results.forEach(function (result) {
		toPrint.totalAverage += result.endTime - result.initTime;
		let clientStats = toPrint.clientStats[result.client];
		if (!clientStats) {
			clientStats = {
				requests: 0,
				average: 0,
				errors: 0
			}
			toPrint.clientStats[result.client] = clientStats;
		}
		clientStats.requests++;
		clientStats.average += result.endTime - result.initTime;
		if (result.error) {
			toPrint.totalErrors++;
			clienStats.errors++;
		}
	});
	toPrint.totalAverage /= toPrint.totalRequests;
	for (var clientName in toPrint.clientStats) {
		toPrint.clientStats[clientName].average /= toPrint.clientStats[clientName].requests
	}
	if (!options.verbose)
		delete toPrint.clientStats;
	return toPrint;
}


loadtester.command('fire <url>')
	.description('Sends requests to the specified URL, logging the time and errors')
	.option('-m --method <method>', 'HTTP Method')
	.option('-p --port <port>', 'Port, if other than 80 or 443')
	.option('-c --clients <clients>', 'Number of simultaneous clients. Defaults to 1.')
	.option('-r --requests <requests>', 'Max. number of requests per client. Defaults to 10.')
	.option('-d --duration <duration>', 'Max. duration of the test in seconds. Defaults to 10')
	.option('-f --file <path>', 'Output file')
	.option('-w --raw', 'Store raw results')
	.option('-v --verbose', 'Detailed results')
	.action((args, callback) => {
		const options = args.options;
		const url = args.url.match(new RegExp("^(.*:)//([A-Za-z0-9\-\.]+)(:[0-9]+)?(.*)$"));
		const httpOptions = {
			host: url[2] + (url[3] || ""),
			path: url[4] || "/"
		}
		if (options.method)
			httpOptions.method = options.method
		if (options.port)
			httpOptions.port = options.port
		else if (url[1] == "http:")
			httpOptions.port = 80;
		else
			httpOptions.port = 443;
		const parallelRequests = options.clients || 1;
		const maxRequestsPerClient = options.requests || 10;
		let remainingTime = options.duration || 10;
		options.http = httpOptions;
		loadtester.log("");
		var bar = new progressBar('Firing tiny hamsters against ${url} [:bar] :percent :etas', {
			complete: '=',
			incomplete: ' ',
			width: 50,
			total: parallelRequests * maxRequestsPerClient
		});
		function wrapClient(callback) {
			let requests = Number(maxRequestsPerClient);
			const results = [];
			const name = moniker.choose();
			async.whilst(() => { return remainingTime > 0 && requests > 0 }, (callback) => {
				request(options, (err, result) => {
					requests--;
					result.client = name;
					results.push(result);
					bar.tick();
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
			let processedResults = processResults(options, results);
			loadtester.log("");
			loadtester.log(JSON.stringify(processedResults, null, 4));
			loadtester.log("");
			if (options.file) {
				if (options.raw)
					fs.writeFileSync(options.file, JSON.stringify(results, null, 4));
				else
					fs.writeFileSync(options.file, JSON.stringify(processedResults, null, 4));
			}

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

loadtester.delimiter('loadtester~$').show();