function(ctx, msg) {
    if(!(msg || msg.message || msg.from)) {
        console.log("empty message");
        return;
    }

    // By default, branch to tabs based on substrings.
    for (var key in ctx.handlers.map) { 
        if(msg.message.toLowerCase().indexOf(key.toLowerCase()) == 0) {
            return ctx.handlers.call(key, ctx, msg);
        }
    }

    // If no tab matches, do something generic.
    return "error 404";
}
