nwa-js
======

Framework for createing JSON based web services and realtime web apps runing on [nodejs](http://nodejs.org).

This is a still working on project, don't use just yet.

Features
-------

 - Declare service protocol and beans with [YAML](http://www.yaml.org) or [JSON](http://www.json.org)
 - Generate server side code with according to service declarations
 - Generate easy to use client side apis for: Android, iOS, plain Java, JavaScript with jQuery
 - Service testing tool runing on browser
 - View and template based web app compilation

Usage
-----

This package is not used as an included module. It's a command line software.

    Usage: nwa <command> [options]

    Commands:
      init     Create a bootstrap nwa project
      run      Start running the http server
      start    Start http server as daemon
      stop     Terminate running daemon http server
      restart  Terminate running daemon http server and start a new one
      build    Front-end apps and service implementations will be updated
      watch    Issue build when detected change. May not work on some os
      poll     Issue build every second. Use when watch is not supported

    Options:
      --help, -h  Show help                                                [boolean]
      --dir, -d   Base directory of the nwa project. Current working directory by
                  default

