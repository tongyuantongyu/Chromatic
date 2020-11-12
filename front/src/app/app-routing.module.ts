import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {MainComponent} from './components/main/main.component';
import {GalleryComponent} from './components/gallery/gallery.component';
import {LoginComponent} from './components/login/login.component';
import {RegisterComponent} from './components/register/register.component';
import {NonLoginGuard} from './guards/non-login.guard';
import {LoginGuard} from './guards/login.guard';
import {UploadComponent} from './components/upload/upload.component';
import {AdminGuard} from './guards/admin.guard';
import {AdminComponent} from './components/admin/admin.component';
import {NotFoundComponent} from './components/not-found/not-found.component';
import {AboutComponent} from './components/about/about.component';

const routes: Routes = [
  {path: 'show', component: UploadComponent, outlet: 'upload', data: {animation: 'upload'}},
  {path: 'login', component: LoginComponent, canActivate: [NonLoginGuard]},
  {path: 'register', component: RegisterComponent, canActivate: [NonLoginGuard]},
  {path: 'gallery/me', component: GalleryComponent, canActivate: [LoginGuard]},
  {path: 'admin', component: AdminComponent, canActivate: [AdminGuard]},
  {path: 'gallery/:id', component: GalleryComponent},
  {path: 'about', component: AboutComponent},
  {path: '', component: MainComponent, pathMatch: 'full', canActivate: [NonLoginGuard]},
  {path: '**', component: NotFoundComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}

