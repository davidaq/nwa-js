var build = require('./command-watch').build;

module.exports = function() {
    console.log('Polling ...');
    setInterval(build, 1000);
};
