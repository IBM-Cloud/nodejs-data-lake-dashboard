const cfenv = require('cfenv');
const passport = require('passport');
const { WebAppStrategy } = require('bluemix-appid');

// default routes to trigger OAuth and handle IBM App ID callback
const defaultRoutes = {
  home: '/',
  login: '/ibm/bluemix/appid/login',
  callback: '/ibm/bluemix/appid/callback',
  logout: '/ibm/bluemix/appid/logout',
  user: '/ibm/bluemix/appid/user',
};

/**
 * Configures the server to handle IBM App ID by mounting Express middleware.
 * @param {Express} app Express app to use.
 * @param {Object} service Cloud Foundry service definition
 * @param {*} routes Optional routes to override defaults
 */
exports.configure = (app, service, routes = defaultRoutes) => {
  console.log('Configuring IBM App ID middleware');

  // IBM App ID service credentials
  const {
    clientId,
    secret,
    tenantId,
    oauthServerUrl,
  } = service.credentials;

  // most of this is boiler plate from the SDK
  // see https://github.com/ibm-cloud-security/appid-serversdk-nodejs
  app.use(passport.initialize());

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new WebAppStrategy({
    tenantId,
    clientId,
    secret,
    oauthServerUrl,
    redirectUri: `${cfenv.getAppEnv().url}${routes.callback}`,
  }));

  passport.serializeUser((user, cb) => {
    cb(null, user);
  });

  passport.deserializeUser((obj, cb) => {
    cb(null, obj);
  });

  app.get(routes.login, passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
    successRedirect: routes.home,
    forceLogin: true,
  }));

  app.get(routes.callback, passport.authenticate(WebAppStrategy.STRATEGY_NAME));

  app.get(routes.logout, (req, res) => {
    WebAppStrategy.logout(req);
    res.redirect(routes.home);
  });

  // middleware to get the login status and profile ad hoc
  app.get(routes.user, (req, res) => {
    res.send({
      logged: req.isAuthenticated(),
      profile: req.user,
    });
  });
};
