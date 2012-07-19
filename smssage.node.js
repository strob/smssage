var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , url = require('url')
  , SOCKETS = []                // all open sockets
  , MESSAGES = {}               // phone number -> last message
  , CODE = {};                  // substring -> function (as string)

app.listen(5858);

function relayMessageToClients (from, msg) {
    SOCKETS.forEach(function(s) {
        s.emit('message', [from, msg]);
    });
};
function relayCodeToClients (k,v) {
    SOCKETS.forEach(function(s) {
        s.emit('code', [k,v]);
    });
};

function handler (req, res) {
    var reqUrl = url.parse(req.url, true);
    var path = reqUrl.path;


    if(path.indexOf('gate') == 1) {
        // SMS Gateway
        res.writeHead(200, {'Content-Type': 'application/json'});

        req.content = '';
        req.addListener("data", function(chunk) {
	    req.content += chunk;
        });
        req.addListener("end", function() {
            var data = qs.parse(req.content);
            console.log("sms received", data);

            MESSAGES[data.from] = data.message;
            flush();

            res.end(JSON.stringify({payload: {
                success: true,
            }}));
        });

    }

    else {
        // Web interface
        fs.readFile(__dirname + '/index.html', function (err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }
            res.writeHead(200);
            res.end(data);
        });
        
    }
}

io.sockets.on('connection', function(socket) {
    SOCKETS.push(socket);

    socket.emit('messages', MESSAGES);
    socket.emit('codes', CODE);

    socket.on('disconnect', function() {
        for(var i=0; i<SOCKETS.length; i++) {
            if(SOCKETS[i] === socket) {
                SOCKETS.splice(i, 1);
                return;
            }
        }
    });

    socket.on('code', function(data) {
        CODE[data[0]] = data[1];
        relayCodeToClients(data[0], data[1]);
    });

});
