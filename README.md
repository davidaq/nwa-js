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

    Usage: nwa <command> [options]

    Commands:
      init   Create a bootstrap nwa project
      start  Start running the http server
      stop   Terminate the http server if running
      build  Front-end apps and service implementations will be updated
      watch  Issue build when detected change. May not work on some os
      poll   Issue build every second. Use when watch is not supported

    Options:
      --help, -h  Show help
      --dir, -d   Base directory of the nwa project. Current working directory by default

