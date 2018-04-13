import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { CookieModule } from 'ngx-cookie';
import { FlexLayoutModule } from "@angular/flex-layout";

import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { ToolbarComponent } from './toolbar/toolbar.component';

import { LoginService } from './services/login.service'
import { StorageService } from './services/storage.service';
import { DDEService } from "./services/dde.service";
import { COSService } from "./services/cos.service";
import { DB2Service } from "./services/db2.service";

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    ToolbarComponent,
  ],
  imports: [
    BrowserModule,
    CookieModule.forRoot(),
    FormsModule,
    HttpClientModule,  // import HttpClientModule after BrowserModule
    FlexLayoutModule,
  ],
  providers: [
    DB2Service,
    COSService,
    DDEService,
    StorageService,
    LoginService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
