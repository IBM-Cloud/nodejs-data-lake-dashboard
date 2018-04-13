require('dotenv').config(); // used to get COLUMN_IDS during local dev

const AWS = require('ibm-cos-sdk');
const encUtil = require('./encrypt-util');
const logger = require('winston');
const v = require('validator');

logger.info(`Column IDs specified ${process.env.COLUMN_IDS}`);
const columnIds = process.env.COLUMN_IDS ? process.env.COLUMN_IDS.split(',') : [];

function getDatatype(val) {
  if (v.isBoolean(val)) return 'BOOLEAN';
  if (v.isISO8601(val)) return 'DATE';
  // if (v.isDecimal(val)) return 'DECIMAL';
  if (v.isInt(val)) return 'INTEGER';
  if (v.isFloat(val)) return 'FLOAT';

  return 'VARCHAR(256)';
}

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

function getDatasource(bucket, key, content) {
  const headersEol = content.indexOf('\n');
  const headers = content.substring(0, headersEol);

  const rowEol = content.indexOf('\n', headersEol + 1);
  const row = content.substring(headersEol + 1, rowEol);
  const values = row.split(',');

  const column = headers.split(',').map((header, i) => {
    const datatype = getDatatype(values[i]);
    const usage = getUsage(header, datatype);
    return {
      name: header,
      description: '',
      datatype,
      nullable: true,
      label: header,
      usage,
      regularAggregate: 'automatic',
    };
  });

  const source = {
    id: key,
    name: key,
    module: {
      xsd: 'https://ibm.com/daas/module/1.0/module.xsd',
      source: {
        id: `${bucket}_source`,
        srcUrl: {
          sourceUrl: `/api/cos/buckets/${bucket}/${encodeURIComponent(key)}`,
          mimeType: 'text/csv',
        },
      },
      table: {
        name: 'Table',
        description: `CSV data from IBM Cloud Object Storage ${bucket}`,
        column,
      },
      label: `${bucket} module`,
      identifier: `${bucket}_module`,
    },
    shaping: {
      embeddedModuleUpToDate: true,
    },
  };

  return source;
}

class COS {
  constructor(config) {
    this.cos = new AWS.S3(config);
  }

  getObject(bucketName, key, cb) {
    const params = {
      Bucket: bucketName,
      Key: key,
    };

    this.cos.getObject(params, (err, data) => {
      if (err) {
        cb(err);
      } else {
        let content = '';

        logger.verbose(`${bucketName}/${key} mimetype=${data.ContentType}`);

        // large data sets will produce ALOT of debug
        // logger.debug(JSON.stringify(data, null, 2));

        switch (data.ContentType) {
          case 'application/octet-stream': {
            const buffer = Buffer.from(data.Body);
            content = buffer.toString('utf-8');
            break;
          }
          // assume plaintext
          default:
            content = data.Body;
        }

        cb(null, content);
      }
    });
  }

  listBuckets(cb) {
    this.cos.listBuckets(cb);
  }

  listObjects(bucketName, cb) {
    const params = {
      Bucket: bucketName,
    };

    this.cos.listObjects(params, cb);
  }
}

exports.configure = (app, service) => {
  logger.info('Configuring IBM Cloud Object Storage middleware');

  const {
    apikey: apiKeyId,
    resource_instance_id: serviceInstanceId,
  } = service.credentials;

  const config = {
    endpoint: 'https://s3.us-south.objectstorage.softlayer.net',
    apiKeyId,
    ibmAuthEndpoint: 'https://iam.ng.bluemix.net/oidc/token',
    serviceInstanceId,
  };

  // wrapper for IBM COS
  const cos = new COS(config);

  app.get('/api/cos/buckets', (request, response) => {
    cos.listBuckets((err, data) => {
      if (err) {
        response.json(err);
      } else {
        response.json(data.Buckets);
      }
    });
  });

  app.get('/api/cos/buckets/:bucketName', (request, response) => {
    cos.listObjects(request.params.bucketName, (err, data) => {
      if (err) {
        response.json(err);
      } else {
        // show results for files with actual content
        const objects = data.Contents.filter(object => object.Size > 0);
        response.json(objects);
      }
    });
  });

  app.get('/api/cos/module/:bucketName/:key', (request, response) => {
    const { bucketName, key } = request.params;

    cos.getObject(bucketName, key, (err, data) => {
      if (err) {
        logger.error(err);
        response.status(500);
      } else {
        // note, you could normally encrypt the datasource but since the example
        // client application prepends the server URL, encryption is not advised
        // if however you went directly to Cloud Object Storage, then it works fine
        response.json(getDatasource(bucketName, key, data));
      }
    });
  });

  app.get('/api/cos/buckets/:bucketName/:key', (request, response) => {
    const { bucketName, key } = request.params;

    cos.getObject(bucketName, key, (err, data) => {
      if (err) {
        logger.error(err);
        response.status(500);
      } else {
        response.send(data);
      }
    });
  });
};
