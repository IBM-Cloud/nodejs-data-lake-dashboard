import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment'

@Injectable()
export class LoginService {

  servicesUrl = `${environment.serverUrl}${environment.servicesRoute}`;

  loginUrl: string = `${environment.serverUrl}${environment.loginRoute}`;
  userUrl: string = `${environment.serverUrl}${environment.userRoute}`;

  constructor(
    private http: HttpClient
  ) { 

  }

  async isEnabled(): Promise<boolean> {
    const services: any = await this.http.get(this.servicesUrl).toPromise();
    return services.appId;
  }

  getLoginUrl(): string {
    return this.loginUrl;
  }

  getUser(): Promise<any> {
    return this.http.get(this.userUrl).toPromise()
  }

}
