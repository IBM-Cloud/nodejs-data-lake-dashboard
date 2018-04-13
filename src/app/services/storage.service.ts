import { Injectable } from '@angular/core';

@Injectable()
export class StorageService {

  constructor() { }

  getDashboardNames(): string[] {    
    const names = [];

    for(var i= 0; i < localStorage.length; i++){
      names.push(localStorage.key(i));
    }
    return names;
  }

  getDashboard(name: string) {
    return JSON.parse(localStorage.getItem(name));
  }

  deleteDashboard(name: string) {
    localStorage.removeItem(name)
  }

  async saveDashboard(name: string, dashboardApi: any) {
    const spec = await dashboardApi.getSpec();
    spec.name = name;

    localStorage.setItem(name, JSON.stringify(spec));
  }
}
