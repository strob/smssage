var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , qs = require('querystring')
  , url = require('url')
  , sms = require('./lib/smssage.js')
  , SOCKETS = []                // all open sockets
  , messages = new sms.UpdatingDictionary()
  , handlers = new sms.Handlers()
  , context = {handlers: handlers, is_server: true};

['setup', 'dispatch'].forEach(function(name) {
    handlers.set(name, fs.readFileSync(__dirname + '/default.' + name + '.js', 'utf8'));
});

handlers.setup(context);

app.listen(5858);

function relayMessageToClients (from, msg) {
    SOCKETS.forEach(function(s) {
        s.emit('message', [from, msg]);
    });
};
function relayCodeToClients (s,k,v) {
    SOCKETS.forEach(function(socket) {
        if(socket !== s)
            socket.emit('code', [k,v]);
    });
};
function relayRenameToClients (s,k,v) {
    // XXX repeated code
    SOCKETS.forEach(function(socket) {
        if(socket !== s)
            socket.emit('rename', [k,v]);
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

            messages.set(data.from, data.message);
            relayMessageToClients(data.from, data.message);

            res.end(JSON.stringify({payload: {
                success: true,
                secret: data.secret,
                task: "send",
                messages: [
                    {to: data.from,
                     message: handlers.getResponse(context, data)}
                ]
            }}));
        });

    }

    else if(path.indexOf('lib') == 1) {
        fs.readFile(__dirname + path, function (err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading '+path);
            }
            res.writeHead(200);
            res.end(data);
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

    socket.emit('messages', messages.map);
    socket.emit('codes', handlers.map);

    socket.on('disconnect', function() {
        for(var i=0; i<SOCKETS.length; i++) {
            if(SOCKETS[i] === socket) {
                SOCKETS.splice(i, 1);
                return;
            }
        }
    });

    socket.on('rename', function(kv) {
        handlers.rename(socket, kv[0], kv[1]);
        relayRenameToClients(socket, kv[0], kv[1]);
    });

    socket.on('code', function(data) {
        handlers.set(data[0], data[1]);
        relayCodeToClients(socket, data[0], data[1]);
    });

});
