// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

/**
 * The difference between prod and dev is that npm run dev will use 'ng serve' and Angular
 * will be available on :4200. But the Express server and API services are on :6008.
 */
export const environment = {
  production: false,
  cognosRootUrl: 'https://dde-us-south.analytics.ibm.com/daas/',
  serverUrl: 'http://localhost:6008',
  dashboardRoute: '/api/dde',
  loginRoute: '/ibm/bluemix/appid/login',
  userRoute: '/ibm/bluemix/appid/user',
  db2Route: '/api/db2',
  cosRoute: '/api/cos',
  servicesRoute: '/api/services',
  sourceUrl: 'https://52f6666c.ngrok.io',
};
