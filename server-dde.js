const logger = require('winston');
const rp = require('request-promise');

/**
 * Configures the server to handle IBM Dynamic Dashboard Embedded by mounting Express middleware.
 * @param {Express} app Express app to use.
 * @param {Object} service Cloud Foundry service definition
 */
exports.configure = (app, service) => {
  logger.info('Configuring IBM Dashboards middleware');

  const {
    api_endpoint_url: endpoint,
    client_id: clientId,
    client_secret: clientSecret,
  } = service.credentials;

  // POST prevents requesting IBM DDE session from unauthorized apps
  app.post('/api/dde/session', (request, response) => {
    // make sure the webDomain matches the web apps domain that loads the CognosAPI.js
    const body = {
      expiresIn: 3600,
      webDomain: request.body.webDomain, // solution tutorial allows configurable webDomain (origin)
    };

    const authorization = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const options = {
      method: 'POST',
      uri: `${endpoint}v1/session`, // note that the route does not begin with / due to appEnv api_endpoint_url
      headers: {
        Authorization: `Basic ${authorization}`,
        'content-type': 'application/json',
      },
      body,
      json: true,
    };

    rp(options)
      .then((parsedBody) => {
        // save the DDE session to the Express session store for encryption support
        if (request.session) {
          logger.verbose('Saving DDE Session to Express session');
          request.session.ddeSession = parsedBody;
        } else {
          logger.verbose('No session storage; encryption of datasource unavailable');
        }

        // send the code to the client
        response.send(parsedBody);
      })
      .catch((err) => {
        response.send(err);
      });
  });
};
