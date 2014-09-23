var fs, serverEvent, express, app, request, extend, events, eventEmitter;

fs = require('fs');
serverEvent = require('server-event');
request = require('request');
app = require('express')();
extend = require('xtend');
events = require('events');
eventEmitter = new events.EventEmitter();
fs = require('fs');

//get the access token from access_token.txt
var access_token = fs.readFileSync('./access_token.txt', 'utf8');
console.log("Access token: " + access_token);

app.listen(80);

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

app.get('/', function (req, res) {
    var uid = req.params.uid,
        path = req.params[0] ? req.params[0] : 'index.html';
    res.sendfile(path, {root: './page'});
});

//get the SSE events from the Spark Hose
var requestObj = request({
    uri: 'https://api.spark.io/v1/events?access_token=' + access_token,
    timeout: 999999999,
    method: "GET"
});
var gotData = false;
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
    gotData = true;
    //console.log(JSON.stringify(obj));
};
var onError = function(error) {
    var currentTime = new Date();
    //console.log(currentTime.toString('yyyy/mm/dd hh:mm:ss'));
    console.log(currentTime.toString('yyyy/mm/dd hh:mm:ss') + ": ERROR!");
    process.exit(code=0);
};
var onData = function(event) {
    var chunk = event.toString();
    appendToQueue(chunk.split("\n"));
};
requestObj.on('error', onError);
requestObj.on('data', onData);

setInterval(function() {
  //kind of a WDT, if we don't get data for 5 seconds let's kill ourselves and forever should restart us
  var currentTime = new Date();
  if (!gotData) {
      //console.log(currentTime.toString('yyyy/mm/dd hh:mm:ss'));
      console.log(currentTime.toString('yyyy/mm/dd hh:mm:ss') + ": NO DATA FOR 5 SECONDS!");
      process.exit(code=0);
  }
  console.log(currentTime.toString('yyyy/mm/dd hh:mm:ss') + ": Kicked the dog");
  gotData = false;
}, 5000);
