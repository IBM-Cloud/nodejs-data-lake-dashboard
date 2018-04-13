require('dotenv').config(); // used to get logging level

const appId = require('./server-appid');
const bodyParser = require('body-parser');
const cfenv = require('cfenv');
const cors = require('cors');
const cos = require('./server-cos');
const db2 = require('./server-db2');
const dde = require('./server-dde');
const express = require('express');
const logger = require('winston');
const session = require('express-session');

logger.level = process.env.LOGGING_LEVEL || 'error';

const app = express();

// create the session store
app.use(session({
  secret: process.env.EXPRESS_SESSION_SECRET || '123456',
  resave: true,
  saveUninitialized: true,
}));

// read service connections
let appEnv = cfenv.getAppEnv();

if (appEnv.isLocal) {
  // during local dev web app will listen on a different port e.g. 4200; requires CORS
  app.use(cors());

  // inject VCAP_SERVICES
  appEnv = cfenv.getAppEnv({
    vcap: {
      services: require('./vcap-services.json'), // require here, .cfignore does not deploy file
    },
  });
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(`${__dirname}/dist`));

const servicesUsed = {
  appId: false,
  cloudObjectStorage: false,
  db2: false,
};

// mount IBM App ID middleware
const appIdService = appEnv.getService('dashboard-nodejs-appid');
if (appIdService) {
  servicesUsed.appId = true;
  appId.configure(app, appIdService);
} else {
  logger.warn('AppID not found in VCAP_SERVICES');
}

// mount IBM Cloud Object Storage middleware
const cosService = appEnv.getService('dashboard-nodejs-cos');
if (cosService) {
  servicesUsed.cloudObjectStorage = true;
  cos.configure(app, cosService);
} else {
  logger.warn('Cloud Object Storage not found in VCAP_SERVICES');
}

// mount IBM DB2 Warehouse on Cloud middleware
const dbwocService = appEnv.getService('dashboard-nodejs-db2');
if (dbwocService) {
  servicesUsed.db2 = true;
  db2.configure(app, dbwocService);
} else {
  logger.warn('DB2 Warehouse on Cloud not found in VCAP_SERVICES');
}

// mount IBM Dynamic Dashboard Embedded middleware
const ddeService = appEnv.getService('dashboard-nodejs-dde');
if (ddeService) {
  dde.configure(app, ddeService);
} else {
  logger.error('Dynamic Dashboard Embedded not found in VCAP_SERVICES');
}

// inform which services the app has available
app.get('/api/services', (req, res) => {
  res.json(servicesUsed);
});

// redirect all other requests to web app
app.get('*', (req, res) => {
  res.sendFile(`${__dirname}/dist/index.html`);
});

app.listen(appEnv.port, appEnv.bind, () => {
  logger.info(`Express server listening on ${appEnv.url}`);
});
