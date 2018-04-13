require('dotenv').config(); // used to get COLUMN_IDS during local dev

const encUtil = require('./encrypt-util');
const logger = require('winston');
const rp = require('request-promise');

const dashApi = '/dashdb-api/v2';
const db = 'BLUDB';

logger.info(`Column IDs specified ${process.env.COLUMN_IDS}`);
const columnIds = process.env.COLUMN_IDS ? process.env.COLUMN_IDS.split(',') : [];

function getUsage(name, type) {
  // check if the column name is whitelisted as an ID
  if (columnIds.find(id => id === name)) {
    return 'identifier';
  }

  // fall back to type inference
  switch (type) {
    case 'VARCHAR':
      return 'identifier';
    case 'BIGINT':
    case 'DECIMAL':
    case 'DOUBLE':
    case 'INTEGER':
    case 'NUMERIC':
    case 'SMALLINT':
    case 'TINYINT':
      return 'fact';
    default:
      return 'automatic';
  }
}

class DB2 {
  constructor(host, user, password, schema) {
    this.host = host;
    this.user = user;
    this.password = password;
    this.schema = schema;
  }

  async authenticate() {
    logger.verbose('Requesting authentication token');

    const uri = `https://${this.host}${dashApi}/auth`;

    const response = await rp({
      method: 'POST',
      uri,
      body: {
        userid: this.user,
        password: this.password,
      },
      json: true,
    });

    this.token = response.token;

    if (this.token) {
      logger.verbose('Successfully obtained token');

      try {
        setTimeout(() => this.authenticate(), 3600 * 1000);
      } catch (e) {
        logger.error(e);
      }
    }

    return response;
  }

  async getDatasource(id, name, table) {
    const { comments, columns: tableCols } = await this.getTableInfo(table);

    // map the tableCols to DDE format
    const column = tableCols.map(tableCol => (
      {
        name: tableCol.name,
        description: tableCol.comments,
        datatype: `${tableCol.type_name}(${tableCol.type_precision})`,
        nullable: tableCol.nullable === 'yes',
        label: tableCol.name.toLowerCase(),
        usage: getUsage(tableCol.name, tableCol.type_name),
        regularAggregate: 'countDistinct',
      }
    ));

    const source = {
      id,
      name,
      module: {
        xsd: 'https://ibm.com/daas/module/1.0/module.xsd',
        source: {
          id: `${id}_source`,
          jdbc: {
            jdbcUrl: `jdbc:db2://${this.host}:50000/${db}`,
            driverClassName: 'com.ibm.db2.jcc.DB2Driver',
            schema: this.schema,
          },
          user: this.user,
          password: this.password,
        },
        table: {
          name: table,
          description: comments,
          column,
        },
        label: `${name} module`,
        identifier: `${id}_module`,
      },
      shaping: {
        embeddedModuleUpToDate: true,
      },
    };

    return source;
  }

  getTableInfo(table) {
    const uri = `https://${this.host}${dashApi}/schemas/${this.schema}/tables/${table}`;

    return rp({
      uri,
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      json: true,
    });
  }

  getTables() {
    const uri = `https://${this.host}${dashApi}/schemas/${this.schema}/tables`;

    return rp({
      uri,
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      json: true,
    });
  }

  getSqlResult(jobId) {
    return rp({
      uri: `https://${this.host}${dashApi}/sql_jobs/${jobId}`,
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      json: true,
    });
  }

  runSql(body) {
    logger.debug(`Executing SQL ${JSON.stringify(body)}`);

    return rp({
      method: 'POST',
      uri: `https://${this.host}${dashApi}/sql_jobs`,
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body,
      json: true,
    });
  }
}

exports.configure = (app, service) => {
  logger.info('Configuring IBM DB2 Warehouse middleware');

  const {
    hostname,
    username,
    password,
  } = service.credentials;

  const db2 = new DB2(hostname, username, password, username.toUpperCase());

  // TOOD handle token expiration
  db2.authenticate()
    .then(res => logger.verbose(`DB2 connection successful ${res.token !== undefined}`))
    .catch(err => logger.error(`DB2 error ${err}`));

  // gets a list of tables in DB2 that could act as a datasource
  app.get('/api/db2/tables', (request, response) => {
    db2.getTables()
      .then(res => response.json(res));
  });

  // returns a specific table (all rows and cols) as a datasource
  app.get('/api/db2/tables/:name', (request, response) => {
    const { name } = request.params;

    db2.getDatasource(name, name, name)
      .then((datasource) => {
        // if the DDE session is set, we can encrypt datasource information
        const { ddeSession } = request.session;

        if (ddeSession) {
          logger.verbose('Encrypting datasource');

          const encDatasource = encUtil(ddeSession, datasource);
          response.json(encDatasource);
        } else {
          response.json(datasource);
        }
      })
      .catch(err => response.json(err));
  });

  // execute a SQL job per a REST api
  app.post('/api/db2/sql', (request, response) => {
    if (request.user) {
      const { email } = request.user;
      logger.verbose(`Replacing all occurences of %e with ${email}`);
      request.body.commands = request.body.commands.replace(/%e/g, email);
    }

    db2.runSql(request.body)
      .then(res => response.json(res))
      .catch(err => response.json(err));
  });

  /**
   * Gets the result of a SQL job and returns data as a CSV.
   */
  app.get('/api/db2/sql/:jobId', (request, response) => {
    db2.getSqlResult(request.params.jobId)
      .then((res) => {
        // the SQL job is finished
        if (res.status === 'completed') {
          const { columns, rows } = res.results[0];

          // flatten the columns and rows into a CSV file
          let csv = `${columns.join(',')}\n`;
          rows.forEach((row) => {
            csv += `${row.join(',')}\n`;
          });

          logger.debug(`Sending CSV data\n${csv}`);

          response.send(csv);
        } else {
          response.send('');
        }
      })
      .catch((err) => {
        // return a portion of the error to user
        const { statusCode, message } = err;
        response.json({
          statusCode,
          message,
        });
      });
  });
};
