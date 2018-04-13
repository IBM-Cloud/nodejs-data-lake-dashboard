import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { DDEAdapter } from "./dde.service";
import { environment } from '../../environments/environment';

@Injectable()
export class COSService implements DDEAdapter {

  cosUrl = `${environment.serverUrl}${environment.cosRoute}`;

  constructor(
    private http: HttpClient
  ) {

  }

  async getFolders(): Promise<string[]> {
    const url = `${this.cosUrl}/buckets`;

    console.log(`Requesting list of buckets from ${url}`);

    const data: any = await this.http.get(url).toPromise();
    const names = data.map(bucket => bucket.Name);

    console.log(`Buckets received: ${names}`);

    return names;
  }

  async getDatasources(folder?: string): Promise<string[]> {
    const url = `${this.cosUrl}/buckets/${folder}`;

    console.log(`Requesting objects from ${url}`);

    const data: any = await this.http.get(url).toPromise();
    const names: string[] = data.map(object => object.Key);

    console.log(`Objects received: ${names}`);

    return names;
  }

  async getDatasourceModule(name: string, folder: string): Promise<any> {
    const bucket: string = folder;
    const key: string = encodeURIComponent(name); // these can contain slashes so encode
    const url = `${this.cosUrl}/module/${bucket}/${key}`;

    console.log(`Requesting DDE datasource input from ${url}`);
    
    const datasource: any = await this.http.get(url).toPromise();

    console.log(`Datasource received: ${JSON.stringify(datasource, null, 2)}`);

    // dynamically add the public server's URL to the module
    // this is needed because the DDE service needs a public location that it can request
    // the CSV file from; this is not known during dev unless using a tunnel like ngrok
    const ddeSrcUrl = `${environment.sourceUrl}${datasource.module.source.srcUrl.sourceUrl}`; ;
    datasource.module.source.srcUrl.sourceUrl = ddeSrcUrl;

    console.log(`Updated datasource sourceUrl=${ddeSrcUrl}`);

    return datasource;
  }

  async getDefaultDatasource(): Promise<any> {
    return {};
  }

  async getDefaultDashboard(): Promise<any> {
    return {};
  }
}