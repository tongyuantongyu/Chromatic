import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MainComponent} from './components/main/main.component';
import {MatButtonModule} from '@angular/material/button';
import {LanguagePickerComponent} from './components/language-picker/language-picker.component';
import {MatMenuModule} from '@angular/material/menu';
import {MatIconModule} from '@angular/material/icon';
import {HeaderComponent} from './components/header/header.component';
import {MatTooltipModule} from '@angular/material/tooltip';
import {GalleryComponent} from './components/gallery/gallery.component';
import {TestComponent} from './components/test/test.component';
import {GalleryImageComponent} from './components/gallery-image/gallery-image.component';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatInputModule} from '@angular/material/input';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {LoginComponent} from './components/login/login.component';
import {RECAPTCHA_BASE_URL, RECAPTCHA_SETTINGS, RecaptchaFormsModule, RecaptchaModule} from 'ng-recaptcha';
import {environment} from '../environments/environment';
import {MatDividerModule} from '@angular/material/divider';
import {HttpClientModule} from '@angular/common/http';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {httpInterceptorProviders} from './interceptors';
import {RegisterComponent} from './components/register/register.component';
import {InfoComponent} from './components/info/info.component';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {AwareStickyComponent} from './components/aware-sticky/aware-sticky.component';
import {registerLocaleData} from '@angular/common';
import localeZH_CN from '@angular/common/locales/zh-Hans';
import localeZH_TW from '@angular/common/locales/zh-Hant';
import localeZH_HK from '@angular/common/locales/zh-Hant-HK';
import localeJA from '@angular/common/locales/ja';
import {LongPressDirective} from './directives/long-press.directive';
import {GalleryOverlayComponent} from './components/gallery-overlay/gallery-overlay.component';
import {MatDialogModule} from '@angular/material/dialog';
import {UploadComponent} from './components/upload/upload.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {AsDataUrlPipe} from './pipes/as-data-url.pipe';
import {FileSizePipe} from './pipes/file-size.pipe';
import {SortablejsModule} from 'ngx-sortablejs';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatChipsModule} from '@angular/material/chips';
import {PluralComponent} from './components/plural/plural.component';
import {IntersectionDirective} from './directives/intersection.directive';
import {FILE_READER_CONCURRENT} from './services/file-reader.service';
import {EditImagesComponent} from './dialogs/edit-images/edit-images.component';
import {MatTabsModule} from '@angular/material/tabs';
import {ConfirmationComponent} from './dialogs/confirmation/confirmation.component';
import {ImageInfoComponent} from './dialogs/image-info/image-info.component';
import {GenCodeSingleComponent} from './dialogs/gen-code-single/gen-code-single.component';
import {MatRadioModule} from '@angular/material/radio';
import {ClipboardModule} from '@angular/cdk/clipboard';
import {GenCodeMultiComponent} from './dialogs/gen-code-multi/gen-code-multi.component';
import {UploadAdvancedComponent} from './dialogs/upload-advanced/upload-advanced.component';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {ChangePasswordComponent} from './dialogs/change-password/change-password.component';
import {MatRippleModule} from '@angular/material/core';
import {ChangeAvatarComponent} from './dialogs/change-avatar/change-avatar.component';
import {ImageCropperModule} from 'ngx-image-cropper';
import {AdminComponent, LOCALE_PAGINATOR_INTL_PROVIDER} from './components/admin/admin.component';
import {MatTableModule} from '@angular/material/table';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatPaginatorModule} from '@angular/material/paginator';
import {SinglePromptComponent} from './dialogs/single-prompt/single-prompt.component';
import {ChoiceComponent} from './dialogs/choice/choice.component';
import {AddUserComponent} from './dialogs/add-user/add-user.component';
import {AddCodeComponent} from './dialogs/add-code/add-code.component';
import {NotFoundComponent} from './components/not-found/not-found.component';
import {FormatPreferenceComponent} from './dialogs/format-preference/format-preference.component';
import {AboutComponent} from './components/about/about.component';

registerLocaleData(localeZH_CN, 'zh-CN');
registerLocaleData(localeZH_TW, 'zh-TW');
registerLocaleData(localeZH_HK, 'zh-HK');
registerLocaleData(localeJA, 'ja');

@NgModule({
  declarations: [
    AppComponent,
    MainComponent,
    LanguagePickerComponent,
    HeaderComponent,
    GalleryComponent,
    TestComponent,
    GalleryImageComponent,
    LoginComponent,
    RegisterComponent,
    InfoComponent,
    AwareStickyComponent,
    LongPressDirective,
    GalleryOverlayComponent,
    UploadComponent,
    AsDataUrlPipe,
    FileSizePipe,
    PluralComponent,
    IntersectionDirective,
    EditImagesComponent,
    ConfirmationComponent,
    ImageInfoComponent,
    GenCodeSingleComponent,
    GenCodeMultiComponent,
    UploadAdvancedComponent,
    ChangePasswordComponent,
    ChangeAvatarComponent,
    AdminComponent,
    SinglePromptComponent,
    ChoiceComponent,
    AddUserComponent,
    AddCodeComponent,
    NotFoundComponent,
    FormatPreferenceComponent,
    AboutComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonToggleModule,
    RecaptchaModule,
    RecaptchaFormsModule,
    MatDividerModule,
    MatSnackBarModule,
    FormsModule,
    MatAutocompleteModule,
    MatDialogModule,
    DragDropModule,
    SortablejsModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatTabsModule,
    MatRadioModule,
    ClipboardModule,
    MatProgressBarModule,
    MatRippleModule,
    ImageCropperModule,
    MatTableModule,
    MatCheckboxModule,
    MatPaginatorModule
  ],
  providers: [
    httpInterceptorProviders,
    {
      provide: RECAPTCHA_BASE_URL,
      useValue: 'https://recaptcha.net/recaptcha/api.js',
    },
    {
      provide: RECAPTCHA_SETTINGS,
      useValue: {siteKey: environment.recaptchaKey},
    },
    {
      provide: FILE_READER_CONCURRENT,
      useValue: 4,
    },
    LOCALE_PAGINATOR_INTL_PROVIDER
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
