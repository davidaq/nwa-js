
module.exports = function(args) {
    require('./command-stop')(args, function() {
        setTimeout(function() {
            require('./command-start')(args);
        }, 500);
    });
};
