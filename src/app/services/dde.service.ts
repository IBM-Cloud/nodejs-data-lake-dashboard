import { ElementRef, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { CookieService, CookieOptions } from 'ngx-cookie';
import { Observable } from 'rxjs';
import { Subject } from 'rxjs/Subject';

import { environment } from '../../environments/environment';
import { COSService } from "./cos.service";
import { DB2Service } from "./db2.service";

declare var CognosApi;  // loaded from script tag in index.html

export interface DDEAdapter {
  getFolders(): Promise<string[]>
  getDatasources(folder?: string): Promise<string[]>;
  getDatasourceModule(name: string, folder?: string): Promise<any>;
  getDefaultDatasource(): Promise<any>;
  getDefaultDashboard(): Promise<any>;
}

@Injectable()
export class DDEService {

  events = new Subject<any>();

  cognosApi: any;
  dashboardApi: any;

  sessionApiUrl = `${environment.serverUrl}${environment.dashboardRoute}/session`;
  sessionCode: string;
  sessionCookieName: string = 'sessionCode';

  servicesUrl = `${environment.serverUrl}${environment.servicesRoute}`;
  adapter: DDEAdapter;

  constructor(
    private cookieService: CookieService,
    private http: HttpClient,
    private cosAdapter: COSService,
    private db2Adapter: DB2Service
  ) {
    // figure out the DDEAdapter available
    this.http.get(this.servicesUrl).toPromise()
      .then((services: any) => {
        if (services.cloudObjectStorage) {
          console.log('Using Cloud Object Storage adapter')
          this.adapter = cosAdapter;
        } else {
          console.log('Using DB2 Warehouse adapter')
          this.db2Adapter = db2Adapter;
        }

        if (services.cloudObjectStorage && services.db2) {
          console.log('Only one adapter supported at a time!')
        }
      });


    // check if a previous sessionCode is available to use
    this.sessionCode = this.cookieService.get(this.sessionCookieName);
    console.log(`Previous sessionCode available ${this.sessionCode !== undefined}`);
  }

  /**
   * Events emitted from the toolbar.
   */
  getEvents(): Observable<any> {
    return this.events.asObservable();
  }

  /**
   * Retrieves the current dashboard loaded.
   */
  dashboard(): any {
    return this.dashboardApi;
  }

  /**
   * Initializes the Dynamic Data Embedded API by creating a user session and loading the
   * DDE user interface.
   * @param elementRef the HTML element that will host the DDE user interface
   */
  async initialize(elementRef: ElementRef): Promise<any> {
    // Creating a Dynamic Dashboard Embedded session
    // https://console.bluemix.net/docs/services/dynamic-dashboard-embedded/dde_getting_started.html#step-3-creating-a-dynamic-dashboard-embedded-session
    console.log(`Requesting sessionCode from ${this.sessionApiUrl}`);

    // check if sessionCode can be re-used
    if (this.sessionCode === undefined) {

      // request a session from the middleware server (note this is not the DDE service)
      // the web domain must be the current page (e.g. http://dashboard.mybluemix.net)
      // for added security, set the webDomain server-side
      const session: any = await this.http.post(this.sessionApiUrl, {
        webDomain: document.location.origin
      }).toPromise();

      this.sessionCode = session.sessionCode  // extract the code

      // store the sessionCode to reduce service plan consumption
      const expiresDate = new Date();
      expiresDate.setHours(expiresDate.getHours() + 1); // expires in 1 hour
      console.log(expiresDate)
      this.cookieService.put(this.sessionCookieName, this.sessionCode, {
        expires: expiresDate,
      } as CookieOptions);

      console.log(`Received sessionCode ${session.sessionCode !== undefined}`);
    }

    // Embedding Dynamic Dashboard Embedded through the JavaScript API
    // https://console.bluemix.net/docs/services/dynamic-dashboard-embedded/dde_getting_started.html#step-4-embedding-dynamic-dashboard-embedded-through-the-javascript-api
    this.cognosApi = new CognosApi({
      cognosRootURL: environment.cognosRootUrl,
      sessionCode: this.sessionCode,
      node: elementRef.nativeElement,
    });

    // TODO handle a 401 or similar
    try {
      await this.cognosApi.initialize();
    } catch (e) {
      console.log(`error ${e}`)
    }

    console.log(`API ready ${this.cognosApi !== undefined}`);

    return this.cognosApi;
  }

  /**
   * Creates a dashboard from the DashboardFactory.
   */
  async createNew(): Promise<any> {
    this.dashboardApi = await this.cognosApi.dashboard.createNew()
    this.events.next('dashboardCreated'); // inform components a dashboard was created

    return this.dashboardApi;
  }

  /**
   * Opens a dashboard from a serialized dashboard instance specification.
   * @param spec Dashboard spec saved from previous session
   */
  async openDashboard(spec): Promise<any> {
    console.log(`Opening dashboard ${spec.name}`)
    this.dashboardApi = await this.cognosApi.dashboard.openDashboard({
      dashboardSpec: spec
    });
    this.events.next('dashboardOpened'); // inform components a dashboard was opened

    return this.dashboardApi;
  }

  /**
   * Retrieves folders, which are containers of data. This could be a bucket or a database for example.
   */
  getFolders(): Promise<string[]> {
    return this.adapter.getFolders();
  }

  /**
   * Retrieves available datasources.
   * @param folder Folder identifying the datasource location if one exists
   */
  getDatasources(folder?: string): Promise<string[]> {
    return this.adapter.getDatasources(folder);
  }

  /**
   * Retrieves a datasource definition used as input to DDE.
   * @param name Name identifying the datasource location
   */
  getDatasourceModule(name: string, folder?: string): Promise<any> {
    console.log(`Getting datasource for name=${name} folder=${folder}`);

    if (name === undefined) {
      return this.getDefaultDatasource();
    } else {
      return this.adapter.getDatasourceModule(name, folder);
    }
  }

  /**
   * Creates the currently authenticated user's datasource as a preconfigured datasource spec.
   */
  getDefaultDatasource(): Promise<any> {
    return this.adapter.getDefaultDatasource();
  }

  /**
   * Gets a default dashboard for the currently authenticated user.
   */
  getDefaultDashboard(): Promise<any> {
    return this.adapter.getDefaultDashboard();
  }
}
