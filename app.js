const Vorpal = require('vorpal');
const chalk = Vorpal().chalk;
const loadtester = new Vorpal();
const http = require('http');
const async = require('async');
const fs = require('fs');
const moniker = require('moniker');

const request = function(httpOptions, options, callback){
	const result = {};
	const req = http.request(httpOptions, (res) => {
		result.endTime = Date.now();
		return callback(undefined, result);
	});

	req.on('error', (err) => {
		result.endTime = Date.now();
		result.error = err;
		return callback(undefined, result)
	});

	result.initTime = Date.now();
	req.end();
}


loadtester.command('fire <url>')
	.description('Sends requests to the specified URL, logging the time')
	.option('-m --method', 'HTTP Method')
	.option('-p --port', 'Port, if other than 80 or 443')
	.option('-c --clients', 'Number of simultaneous clients')
	.option('-r --requests', 'Max. number of requests per client')
	.option('-d --duration', 'Max. duration of the test in seconds')
	.option('-f, --file', 'Output file')
	.option('-s, --save-body', 'Save response body').hidden()
	.action((args, callback) => {{}
		const httpOptions = {
			host: args.url.substring(args.url.indexOf('/') + 1, args.url.length),
			path: args.url.substring(0, args.url.indexOf('/'))
		}
		const options = {}
		if(args.options.method)
			httpOptions.method = args.options.method
		if(args.options.port)
			httpOptions.port = args.options.port 
		const parallelRequests = args.options.clients || 1;
		const maxRequestsPerClient = args.options.requests || 10000000;
		let remainingTime = args.options.duration || 10;
		let executeClient = function(httpOptions, options, callback){
			let requests = Number(maxRequestsPerClient);
			const results = [];
			const name = moniker.choose();
			async.doWhilst(() => { return remainingTime > 0 && requests > 0 }, (callback) => {
				request(httpOptions, options, (err, result) => {
					requests--;
					result.client = name; 
					results.push(result);
					return callback(undefined);
				});
			}, 	
			(err) => {
				this.log("Client ${name} generated: ${results}");
				return callback(undefined, results);
			});
		}
		async.times(parallelRequests, (n, next) => {
			executeClient(httpOptions, args.options, (err, results)=>{
				next(err, results);
			});
		}, 
		(err, results) => {
			this.log(results);
		});
		let tick = function(){
			if(remainingTime > 0){
				remainingTime--;
				setTimeout(tick, 1000);
			}
		}
		tick();
	});

loadtester.delimiter(chalk.cyan('loadtester~$')).show();