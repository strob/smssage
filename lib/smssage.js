var SMS = {};

SMS.Triggerable = function () {
    // half-baked signals
    this._signals = {};         // name of signal -> list of listeners
};

SMS.Triggerable.prototype.bind = function (signal, cb) {
    if (this._signals[signal] === undefined) {
        this._signals[signal] = [cb];
    }
    else {
        this._signals[signal].push(cb);
    }
};

SMS.Triggerable.prototype.trigger = function (signal, ev) {
    if (this._signals[signal] !== undefined) {
        this._signals[signal].forEach(function (cb) {
            cb(ev);
        });
    }
};

SMS.UpdatingDictionary = function(map) {
    SMS.Triggerable.call(this);
    this.map = map || {};
}
SMS.UpdatingDictionary.prototype = new SMS.Triggerable;
SMS.UpdatingDictionary.prototype.set = function(k,v) {
    var change = false;
    if(k in this.map)
        change = true;

    this.map[k] = v;
    if(change)
        this.trigger("update", [k,v]);
    else
        this.trigger("add", [k,v]);
    this.trigger("change", [k,v]);
};
SMS.UpdatingDictionary.prototype.rename = function(k1,k2) {
    this.map[k2] = this.map[k1];
    this.map[k1] = undefined;
    delete this.map[k1];
    this.trigger("rename", [k1,k2]);
};
SMS.UpdatingDictionary.prototype.remove = function(k1) {
    delete this.map[k1];
    this.trigger("delete", [k1]);
};

SMS.Handlers = function(map) {
    SMS.UpdatingDictionary.call(this, map);
    this.valid = {};

    (function(that) {
        that.bind("change", function(kv) {
            var k = kv[0];
            var v = kv[1];
            var valid = true;
            try {
                var fn = eval("(" + v + ")");
                if(! fn instanceof Function) {
                    console.log(k, 'not a function');
                    valid = false;
                }
                var smp = fn("+1800EXAMPLE", "Make sure a string is returned.");
                if(! smp) {
                    console.log(k, 'function fails to return');
                    valid = false;
                }
            }
            catch(err) {
                console.log(k, 'syntax or function raised exception');
                valid = false;
            }
            if(that.valid[k] !== valid) {
                that.trigger('validity', [k, valid]);
                that.valid[k] = valid;
            }
        });
    })(this)

}
SMS.Handlers.prototype = new SMS.UpdatingDictionary;
SMS.Handlers.prototype.getResponse = function(from, msg) {
    for(var key in this.map) {
        if(msg.toLowerCase().indexOf(key.toLowerCase()) === 0) {
            if(this.valid[key]) {
                try {
                    return eval("(" + this.map[key] + ")")(from, msg);
                }
                catch(err) {
                    console.log("unexpected error in fn", err);
                }
            }
        }
    }
    return "I'm not sure what to say to that."
};

// export SMS for node
var module = module || {};
module.exports = SMS;
