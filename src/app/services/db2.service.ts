import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { DDEAdapter } from "./dde.service";
import { environment } from '../../environments/environment';


@Injectable()
export class DB2Service implements DDEAdapter {

  db2Url = `${environment.serverUrl}${environment.db2Route}`;

  constructor(
    private http: HttpClient
  ) {

  }

  async getFolders(): Promise<string[]> {
    return ['BLUDB'];
  }

  async getDatasources(): Promise<string[]> {
    const data: any = await this.http.get(`${this.db2Url}/tables`).toPromise();
    return data.resources;
  }

  getDatasourceModule(name: string, folder?: string): Promise<any> {
    if (name === undefined) {
      return this.getDefaultDatasource();
    } else {
      return this.http.get(`${this.db2Url}/tables/${name}`).toPromise();
    }
  }

  async getDefaultDatasource(): Promise<any> {
    const defaultTable = 'REPOSTATS';
    const datasource: any = await this.http.get(`${this.db2Url}/tables/${defaultTable}`).toPromise();

    const sqlBody = {
      commands: `select r.RID,r.ORGNAME,r.REPONAME,r.TDATE,r.VIEWCOUNT,r.VUNIQUES,r.CLONECOUNT,r.CUNIQUES from REPOSTATS r, v_ADMINUSERREPOS v where v.email='%e' and r.rid=v.rid`,
      separator: ';',
      stop_on_error: 'yes',
    }
    const job: any = await this.http.post(`${this.db2Url}/sql`, sqlBody).toPromise();

    // the sourceUrl is used because DDE must connect to a public server (or ngrok tunnel if local dev)
    const sourceUrl = (`${environment.sourceUrl}/${job.id}`);
    console.log(`SQL CSV data located at ${sourceUrl}`);

    /**
     * the datasource assumes we're using JDBC, but we will provide an intermediate CSV file
     * that represents only this user's data for privacy reasons
     */
    datasource.module.source = {
      id: job.id,
      srcUrl: {
        sourceUrl,
        mimeType: 'text/csv',
        property: [
          {
            name: 'separator',
            value: ','
          },
          {
            name: 'ColumnNamesLine',
            value: 'true'
          }
        ]
      }
    };

    return datasource;
  }

  async getDefaultDashboard(): Promise<any> {
    const datasource = await this.getDefaultDatasource();
    const spec = {
      "name": "Default dashboard",
      "layout": {
        "id": "page0",
        "items": [
          {
            "id": "page1",
            "items": [
              {
                "id": "page2",
                "css": "templateBox aspectRatio_default",
                "items": [
                  {
                    "id": "page3",
                    "style": {
                      "top": "0%",
                      "left": "0%",
                      "right": "0%",
                      "bottom": "25%"
                    },
                    "type": "templateDropZone",
                    "templateName": "dz2",
                    "relatedLayouts": "|model0000016271e3ff72_00000003|"
                  },
                  {
                    "id": "page4",
                    "css": "noBorderTop",
                    "style": {
                      "top": "75%",
                      "left": "0%",
                      "right": "0%",
                      "bottom": "0%"
                    },
                    "type": "templateDropZone",
                    "templateName": "dz1",
                    "relatedLayouts": "|model0000016271e4b207_00000000|"
                  },
                  {
                    "id": "model0000016271e4b207_00000000",
                    "style": {
                      "top": "74.83588621444201%",
                      "left": "0.12033694344163658%",
                      "height": "24.72647702407002%",
                      "width": "99.63898916967509%"
                    },
                    "type": "widget",
                    "relatedLayouts": "page4"
                  },
                  {
                    "id": "model0000016271e3ff72_00000003",
                    "style": {
                      "top": "0.2188183807439825%",
                      "left": "0.12033694344163658%",
                      "height": "74.39824945295405%",
                      "width": "99.63898916967509%"
                    },
                    "type": "widget",
                    "relatedLayouts": "page3"
                  }
                ],
                "type": "scalingAbsolute"
              }
            ],
            "type": "container",
            "title": "Welcome",
            "templateName": "Template5"
          }
        ],
        "style": {
          "height": "100%"
        },
        "type": "tab"
      },
      "theme": "defaultTheme",
      "version": 1008,
      "eventGroups": [
        {
          "id": "page1:1",
          "widgetIds": [
            "model0000016271e3ff72_00000003",
            "model0000016271e4b207_00000000"
          ]
        }
      ],
      "drillThrough": [],
      "dataSources": {
        "version": "1.0",
        "sources": [
          {
            "id": "model0000016271e3e4be_00000002",
            "assetId": "assetId0000016271e3e4be_00000000",
            "clientId": "REPOSTATS",
            "module": {
              "xsd": "https://ibm.com/daas/module/1.0/module.xsd",
              "source": {
                "id": "2d5a1c10-7304-4761-b27c-9781fab32b60",
                "srcUrl": {
                  "sourceUrl": "https://be5ca325.ngrok.io/api/db2/sql/2d5a1c10-7304-4761-b27c-9781fab32b60",
                  "mimeType": "text/csv",
                  "property": [
                    {
                      "name": "separator",
                      "value": ","
                    },
                    {
                      "name": "ColumnNamesLine",
                      "value": "true"
                    }
                  ]
                }
              },
              "table": {
                "name": "REPOSTATS",
                "description": "",
                "column": [
                  {
                    "name": "RID",
                    "description": "",
                    "datatype": "INTEGER(4)",
                    "nullable": false,
                    "label": "rid",
                    "usage": "identifier",
                    "regularAggregate": "countDistinct"
                  },
                  {
                    "name": "ORGNAME",
                    "description": "",
                    "datatype": "VARCHAR(255)",
                    "nullable": false,
                    "label": "orgname",
                    "usage": "identifier",
                    "regularAggregate": "countDistinct"
                  },
                  {
                    "name": "REPONAME",
                    "description": "",
                    "datatype": "VARCHAR(255)",
                    "nullable": false,
                    "label": "reponame",
                    "usage": "identifier",
                    "regularAggregate": "countDistinct"
                  },
                  {
                    "name": "TDATE",
                    "description": "",
                    "datatype": "DATE(4)",
                    "nullable": true,
                    "label": "tdate",
                    "usage": "automatic",
                    "regularAggregate": "countDistinct"
                  },
                  {
                    "name": "VIEWCOUNT",
                    "description": "",
                    "datatype": "INTEGER(4)",
                    "nullable": true,
                    "label": "viewcount",
                    "usage": "fact",
                    "regularAggregate": "countDistinct"
                  },
                  {
                    "name": "VUNIQUES",
                    "description": "",
                    "datatype": "INTEGER(4)",
                    "nullable": true,
                    "label": "vuniques",
                    "usage": "fact",
                    "regularAggregate": "countDistinct"
                  },
                  {
                    "name": "CLONECOUNT",
                    "description": "",
                    "datatype": "INTEGER(4)",
                    "nullable": true,
                    "label": "clonecount",
                    "usage": "fact",
                    "regularAggregate": "countDistinct"
                  },
                  {
                    "name": "CUNIQUES",
                    "description": "",
                    "datatype": "INTEGER(4)",
                    "nullable": true,
                    "label": "cuniques",
                    "usage": "fact",
                    "regularAggregate": "countDistinct"
                  }
                ]
              },
              "label": "REPOSTATS module",
              "identifier": "REPOSTATS_module"
            },
            "name": "REPOSTATS",
            "shaping": {
              "embeddedModuleUpToDate": true
            }
          }
        ]
      },
      "pageContext": [],
      "widgets": {
        "model0000016271e3ff72_00000003": {
          "id": "model0000016271e3ff72_00000003",
          "data": {
            "dataViews": [
              {
                "modelRef": "model0000016271e3e4be_00000002",
                "dataItems": [
                  {
                    "id": "model0000016271e3ff72_00000000",
                    "itemId": "REPOSTATS.REPONAME",
                    "itemLabel": "reponame"
                  },
                  {
                    "id": "model0000016271e44480_00000001",
                    "itemId": "REPOSTATS.VIEWCOUNT",
                    "itemLabel": "viewcount",
                    "aggregate": "sum"
                  }
                ],
                "id": "model0000016271e3ff72_00000001"
              }
            ]
          },
          "visTypeLocked": true,
          "slotmapping": {
            "slots": [
              {
                "name": "categories",
                "dataItems": [
                  "model0000016271e3ff72_00000000"
                ],
                "dataItemSettings": [],
                "caption": "Area hierarchy",
                "id": "categories",
                "layerId": "data"
              },
              {
                "name": "size",
                "dataItems": [
                  "model0000016271e44480_00000001"
                ],
                "caption": "Size",
                "id": "size"
              }
            ]
          },
          "type": "live",
          "name": "",
          "localFilters": [],
          "visId": "com.ibm.vis.rave2bundletreemap"
        },
        "model0000016271e4b207_00000000": {
          "id": "model0000016271e4b207_00000000",
          "data": {
            "dataViews": [
              {
                "modelRef": "model0000016271e3e4be_00000002",
                "dataItems": [
                  {
                    "id": "model0000016271e4d5e4_00000001",
                    "itemId": "REPOSTATS.TDATE",
                    "itemLabel": "tdate"
                  },
                  {
                    "id": "model0000016271e4e775_00000001",
                    "itemId": "REPOSTATS.VIEWCOUNT",
                    "itemLabel": "viewcount",
                    "aggregate": "sum"
                  }
                ],
                "id": "model0000016271e4d5e4_00000000"
              }
            ]
          },
          "visTypeLocked": true,
          "slotmapping": {
            "slots": [
              {
                "name": "categories",
                "dataItems": [
                  "model0000016271e4d5e4_00000001"
                ],
                "dataItemSettings": [],
                "caption": "x-axis",
                "id": "categories"
              },
              {
                "name": "values",
                "dataItems": [
                  "model0000016271e4e775_00000001"
                ],
                "caption": "y-axis",
                "id": "values"
              }
            ]
          },
          "type": "live",
          "visId": "com.ibm.vis.rave2line",
          "name": "",
          "localFilters": []
        }
      }
    }

    // inject the dynamically created datasource's data URL, this is done simply because we
    // get the data from a service that has different URLs for each invocation
    spec.dataSources.sources[0].module.source.srcUrl.sourceUrl = datasource.module.source.srcUrl.sourceUrl;

    return spec;
  }
}