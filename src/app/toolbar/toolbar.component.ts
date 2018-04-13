import { Component, ElementRef, ViewChild } from '@angular/core';
import { TitleCasePipe } from '@angular/common';

import { Modal } from 'carbon-components';

import { DDEService } from '../services/dde.service';
import { StorageService } from '../services/storage.service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styles: [
    '.bx--snippet-container { margin-right: 0rem; }',
    '.bx--snippet--code { padding-right: 1rem; }',
  ],
})
export class ToolbarComponent {
  @ViewChild('saveModal') saveModal: ElementRef;
  @ViewChild('openModal') openModal: ElementRef;

  // the mode of the current dashboard from dashboardApi.MODES
  mode = 0;
  modes = [
    'EDIT',
    'VIEW',
    'EDIT_GROUP'
  ];

  rawMode: string = 'authoring';  // mode back from api (e.g. authoring, consumption, eventGroups)

  specJson: any;  // serialized output of a dashboard spec

  constructor(
    private ddeService: DDEService, 
    private storageService: StorageService,
  ) { 

  }

  /**
   * Toggles the mode of the current dashboard.
   */
  async changeMode() {
    this.mode++;

    if(this.mode === this.modes.length) {
      this.mode = 0;
    }

    const dashboardApi = this.ddeService.dashboard();
    dashboardApi.setMode(dashboardApi.MODES[this.modes[this.mode]]);
    dashboardApi.getMode()
      .then(changedMode => this.rawMode= changedMode);
  }

  /**
   * Deletes a dashboard from storage.
   * @param name Name identifying stored dashboard
   */
  deleteDashboard(name: string) {
    this.storageService.deleteDashboard(name);
  }

  /**
   * Gets the identifiers of dashboards from storage.
   */
  getDashboardNames() {
    return this.storageService.getDashboardNames();
  }

  /**
   * Creates a new dashboard instance.
   */
  newDashboard(): Promise<any> {
    return this.ddeService.createNew();
  }

  /**
   * Renders a dashboard from storage.
   * @param name Name identifying stored dashboard
   */
  openDashboard(name: any) {
    const spec = this.storageService.getDashboard(name);
    this.ddeService.openDashboard(spec);
    Modal.create(this.openModal.nativeElement).hide(); // hide the UI modal
  }

  /**
   * Updates the spec seen in the save modal. 
   */
  async refreshSpec() {
    const spec = await this.ddeService.dashboard().getSpec();
    this.specJson = JSON.stringify(spec, null, 2);
  }

  /**
   * Saves a dashboard to storage and closes the save modal.
   * @param name Name identifying stored dashboard
   */
  saveDashboard(name: string) {
    this.storageService.saveDashboard(name, this.ddeService.dashboard());
    Modal.create(this.saveModal.nativeElement).hide(); // hide the UI modal
  }
}
