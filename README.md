#LoadTester

Really basic HTTP client to perform load testing on a server. Supports GET and (empty) POST requests. Conveniently logs the time each request takes to be completed and can store the results on disk. 

##Design

Uses Vorpal.js with (at least for the moment) only one command: fire. Lets you specify an amount of clients, requests and duration of the test. Think of the clients as simultaneous threads performing the specified number of requests in series. The test concludes once each client has finished or when the specified test duration is reached, whatever comes first. The raw output result JSON file is meant to be easily readable by whatever visualization tool you like.

##Usage

```npm install
node app.js
help fire```

And you should see the following document: 
![Usage](http://i.imgur.com/P3HNMZR.jpg)

#Example usage
![Example](http://i.imgur.com/rXoTCfr.jpg)
