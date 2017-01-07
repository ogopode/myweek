// load used modules
const express = require('express');
const pug = require('pug');

// setup debugging system
const createDebug = require('debug');
const debug = createDebug('server:debug');
const logger = createDebug('server:log');



const main = () => {
  'use strict';
  debug('main');
    const server = {};

    setupVariables(server)
    .then(setupTerminationHandlers)
    .then(setupServer)
    .then(startServer)
    .catch((server) => {
      logger('error while starting server on %s:%d', server.ipaddress, server.port);
    });
};


const terminate = (sig) => {
  'use strict';
  debug('terminate');
    if (typeof sig === 'string') {
        logger('%s: Received %s - terminating sample app ...',
            Date(Date.now()), sig);
        process.exit(1);
    }
    logger('%s: Node server stopped.', Date(Date.now()));
};


const setupTerminationHandlers = (server) => {
  'use strict';
  debug('setupTerminationHandlers');
  return new Promise((resolve) => {

    //  Process on exit and signals.
    process.on('exit', () => {
      terminate();
    });

    // Removed 'SIGPIPE' from the list - bugz 852598.
    ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
    'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
    ].forEach((element) => {
      process.on(element, () => {
        terminate(element);
      });
    });

    resolve(server);
  });
};


const setupVariables = (server) => {
  'use strict';
  debug('setupVariables');
  return new Promise((resolve) => {
    //  Set the environment variables we need.
    server.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
    server.port = process.env.OPENSHIFT_NODEJS_PORT || 5000;

    if (typeof server.ipaddress === 'undefined') {
      //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
      //  allows us to run/test the app locally.
      logger('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
      server.ipaddress = '127.0.0.1';
      // set dev-mode for local installations
      global.dev = true;
    }

    resolve(server);
  });
};


const setupServer = (server) => {
  'use strict';
  debug('setupServer');

  return new Promise((resolve) => {
    const routes = createRoutes();
    debug('%O', routes);

    server.app = express();
    debug('express set');

    server.app.use(express.static(__dirname + 'public'));
    debug('public set');

    server.app.set('view engine', 'pug');
    debug('pug set');

    server.app.set('ip', server.ipaddress);
    server.app.set('port', server.port);

    for (let route in routes.get) {
      if (routes.get.hasOwnProperty(route)) {
        debug('get/' + route);
        server.app.get(route, redirectSec, routes.get[route]);
      }
    }
    debug('GET routes set');

    for (let route in routes.post) {
      if (routes.post.hasOwnProperty(route)) {
        debug('post/' + route);
        server.app.get(route, redirectSec, routes.post[route]);
      }
    }
    debug('POST routes set');

    resolve(server);
  });
};


const startServer = (server) => {
  'use strict';
  debug('startServer');
  return new Promise ((resolve) => {
    //  Start the app on the specific interface(and port).
    server.app.listen(server.app.get('port'), server.app.get('ip'), () => {
      logger('%s: Node server started on %s:%d ...',
      Date(Date.now()), server.ipaddress, server.port);
    });

    resolve(server);
  });
};


const createRoutes = () => {
  'use strict';
  debug('createRoutes');
  const routes = {
    get: {},
    post: {}
  };

  routes.get['/nope'] = (req, res) => {
    res.send('dat war nix');
  };

  routes.get['/'] = (req, res) => {
    res.send('success');
  };

  routes.get['*'] = (req, res) => {
    res.send('fallback');
  };


  return routes;
};

const redirectSec = (req, res, next) => {
  'use strict';
  if (!global.dev) {
    if(req.headers['x-forwarded-proto'] === 'http') {
      res.redirect('https://' + req.headers.host + req.path);
    }
  }
  return next();
};


main();
