var serverEvent, express, app, request, extend, events, eventEmitter;

serverEvent = require('server-event');
request = require('request');
app = require('express')();
extend = require('xtend');
events = require('events');
eventEmitter = new events.EventEmitter();

app.listen(8080);

serverEvent = serverEvent({ express : app });

app.get('/events', serverEvent, function (req, res) {
    req.socket.setTimeout(Infinity);
    res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    res.write(':ok \n\n');
        
    eventEmitter.on('spark_event', function(data) {
        res.sse(data);
    });
});

app.get('/hose', function (req, res) {
    var uid = req.params.uid,
        path = req.params[0] ? req.params[0] : 'index.html';
    res.sendfile(path, {root: './page'});
});

//get the SSE events from the Spark Hose
var requestObj = request({
    uri: 'https://api.spark.io/v1/events?access_token=0873e81cfe01269ff0ef15097d0aa9856bb8e72b',
    timeout: 9999999,
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
//    eventEmitter.emit('spark_event', JSON.parse(JSON.stringify(obj)));
    eventEmitter.emit('spark_event', obj);
    console.log(JSON.stringify(obj));
};

var onData = function(event) {
    var chunk = event.toString();
    appendToQueue(chunk.split("\n"));
};

requestObj.on('data', onData);
