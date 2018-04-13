import { Component , ElementRef, OnInit, ViewChild } from '@angular/core';

import { Modal } from 'carbon-components';
import { Subscription } from 'rxjs/Subscription';

import { DDEService } from './services/dde.service';
import { LoginService } from './services/login.service';
import { StorageService } from './services/storage.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  @ViewChild('dynamicDashboardEmbedded') DDE: ElementRef;
  @ViewChild('datasourceModal') datasourceModal: ElementRef;

  title  = '';

  cognosApi: any;

  folders: string[] = []; // folders (e.g. bucket or DB2 databases)
  datasources: any = { 
    // folder: string[]
  }; // datasources loaded by the user

  constructor(
    private ddeService: DDEService,
    private loginService: LoginService,
    private storageService: StorageService,
  ) {

  }

  async ngOnInit() {
    document.title = this.title;
    
    // check if this app is also using AppID to provide authentication support
    const appIdEnabled = await this.loginService.isEnabled();

    // on first rendering show a blank, new dashboard
    this.ddeService.initialize(this.DDE)
    .then(async (api) => {
      this.cognosApi = api;

      if (appIdEnabled) {
        // determine if th user is logged in
        const user = await this.loginService.getUser();
        
        // if the user is logged in, show a pre-built dashboard
        if(user.logged) {
          const spec = await this.ddeService.getDefaultDashboard();
          this.ddeService.openDashboard(spec);
        }
      } else {
        // allow them to create one
        this.createDashboard();
      }
    });

    // registers global event listeners for the DDEService
    this.ddeService.getEvents().subscribe(async (event) => {
      console.log(`Received event ${event}`);

      switch(event) {
        case 'dashboardCreated':
        case 'dashboardOpened':
          this.bindDatasourceModal();

          // for convenience, add the user's default datasource if logged in
          if (appIdEnabled) {
            const user = await this.loginService.getUser();
            
            if(user.logged) {
              this.addDatasource(); 
            }
          }

          break;
      }
    });
  }

  /**
   * Creates new instances of a dashboard and bind's the DDE add sources button.
   */
  createDashboard() {
    // be aware the promise is fulfilled when the user selects a template
    this.ddeService.createNew();
  }

  /**
   * Adds a datasource to DDE's selected sources palette.
   * @param id Identifier of the datasource
   * @param folder Optional parent of the datasource
   */
  async addDatasource(id?: string, folder?: string) {
    const module = await this.ddeService.getDatasourceModule(id, folder);
    console.log(module)
    this.ddeService.dashboard().addSources([module]);
  }

  /**
   * Bind DDE's + button's addSource event listener
   */
  bindDatasourceModal() {
   const dashboardApi = this.ddeService.dashboard();
 
    dashboardApi.on('addSource:clicked', () => {
      this.ddeService.getFolders()
      .then(data => {
        this.folders = data;
        // this.datasources = data;
        Modal.create(this.datasourceModal.nativeElement).show(); // show the modal
      })
    });
  }

  /**
   * Gets the datasources available.
   * @param folder Optional container of datasources (e.g. bucket or database)
   */
  async getDatasources(folder?: string) {
    const datasources = await this.ddeService.getDatasources(folder);
    this.datasources[folder] = datasources;
  }
}
