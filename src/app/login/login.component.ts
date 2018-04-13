import { Component, OnInit } from '@angular/core';
import { LoginService } from '../services/login.service';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {

  enabled = false; // show the component only if appId service exists
  profile: any;

  constructor(private loginService: LoginService) { }

  async ngOnInit() {
    const enabled = await this.loginService.isEnabled();
    this.enabled = enabled;

    if (enabled) {
      this.loginService.getUser()
        .then(user => {
          if(user.logged) {
            this.profile = user.profile
          }
        });
    }
  }
}
