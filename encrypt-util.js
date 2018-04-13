const logger = require('winston');
const rs = require('jsrsasign');

function encrypt(pubKeyObj, value) {
  return `{enc}${rs.hextob64(rs.KJUR.crypto.Cipher.encrypt(value, pubKeyObj))}`;
}
/**
 * Encrypts the datasouce to prevent accidental information exposure client-side.
 * See https://console.bluemix.net/docs/services/dynamic-dashboard-embedded/ddeusecase_encryptdatasourceinformation.html#encrypting-data-source-information.
 * @param {Object} ddeSession the DDE session object (obtained when requesting a session from the service)
 * @param {Object} datasource the datasource as JSON
 */
module.exports = (ddeSession, datasource) => {
  const encDatasource = datasource;

  const pubKeyObj = rs.KEYUTIL.getKey(ddeSession.keys[0]);

  const { user, password } = encDatasource.module.source;

  if (user && password) {
    logger.verbose(`Encrypting username and password in ${datasource.name}`);

    encDatasource.module.source.user = encrypt(pubKeyObj, user);
    encDatasource.module.source.password = encrypt(pubKeyObj, password);
  }

  if (encDatasource.module.source.jdbc) {
    logger.verbose(`Encrypting jdbcUrl and schema in ${datasource.name}`);

    const { jdbcUrl, schema } = encDatasource.module.source.jdbc;
    encDatasource.module.source.jdbc.jdbcUrl = encrypt(pubKeyObj, jdbcUrl);
    encDatasource.module.source.jdbc.schema = encrypt(pubKeyObj, schema);
  }

  if (encDatasource.module.source.srcUrl) {
    logger.verbose(`Encrypting sourceUrl ${datasource.name}`);

    const { sourceUrl } = encDatasource.module.source.srcUrl;
    encDatasource.module.source.srcUrl.sourceUrl = encrypt(pubKeyObj, sourceUrl);
  }

  return encDatasource;
};
