var SSE = require('sse')
, http = require('http')
,request = require('request')
,extend = require('xtend');

var server = http.createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('okay');
});

server.listen(8080, '127.0.0.1', function() {
    var sse = new SSE(server);
    sse.on('connection', function(client) {
        
           //get the SSE events from the Spark Hose
           var requestObj = request({
                uri: 'https://api.spark.io/v1/events?access_token=0873e81cfe01269ff0ef15097d0aa9856bb8e72b',
                method: "GET"
            });
            var chunks = [];
            var appendToQueue = function(arr) {
                for(var i=0;i<arr.length;i++) {
                    var line = (arr[i] || "").trim();
                    if (line == "") {
                        continue;
                    }
                    chunks.push(line);
                    if (line.indexOf("data:") == 0) {
                        processItem(chunks);
                        chunks = [];
                    }
                }
           };
           
           var processItem = function(arr) {
                var obj = {};
                for(var i=0;i<arr.length;i++) {
                    var line = arr[i];
           
                    if (line.indexOf("event:") == 0) {
                        obj.name = line.replace("event:", "").trim();
                    }
                    else if (line.indexOf("data:") == 0) {
                        line = line.replace("data:", "");
                        obj = extend(obj, JSON.parse(line));
                    }
                }
                client.send(JSON.stringify(obj));
           };
           
           var onData = function(event) {
                var chunk = event.toString();
                appendToQueue(chunk.split("\n"));
           };
           
           requestObj.on('data', onData);
    });
});