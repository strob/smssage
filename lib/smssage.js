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

