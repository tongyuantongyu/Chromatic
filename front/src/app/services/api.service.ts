import {Injectable} from '@angular/core';
import {HttpClient, HttpEvent, HttpParams, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs';
import {EOk} from '../errors';
import {
  AddUserQ,
  ChangePasswordQ,
  Image,
  InviteCode, ListImageContainsTagQ,
  ListImageP,
  ListImageQ,
  ListImageWithTagQ,
  ListInviteP,
  ListInviteQ,
  ListUserP,
  ListUserQ,
  LoginQ,
  RegisterQ,
  RemoveUserQ,
  SetImageInfoQ,
  SetPasswordQ,
  SetUserPermissionQ,
  User
} from '../types';

export interface Response {
  status: string;
  data: any;
}

declare type PostBody =
  string
  | { [key: string]: any }
  | Blob
  | FormData
  | ArrayBuffer
  | ArrayBufferView
  | URLSearchParams
  | ReadableStream;

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private get(url: string): Observable<any> {
    return new Observable(observer => {
      this.http.get<Response>(url).subscribe({
        next: resp => {
          if (resp.status === EOk) {
            observer.next(resp.data);
            observer.complete();
          } else {
            observer.error(resp.status);
          }
        },
        error: err => {
          observer.error(err);
        }
      });
    });
  }

  private post(url: string, body: PostBody): Observable<any> {
    return new Observable(observer => {
      this.http.post<Response>(url, body).subscribe({
        next: resp => {
          if (resp.status === EOk) {
            observer.next(resp.data);
            observer.complete();
          } else {
            observer.error(resp.status);
          }
        },
        error: err => {
          observer.error(err);
        }
      });
    });
  }

  private postProgress(url: string, body: PostBody): Observable<HttpEvent<Response>> {
    const req = new HttpRequest('POST', url, body, {
      reportProgress: true
    });

    return this.http.request(req);

    // return new Observable(observer => {
    //   this.http.request(req).subscribe(event => {
    //     switch (event.type) {
    //       case HttpEventType.Sent:
    //         return event as HttpSentEvent;
    //       case HttpEventType.DownloadProgress:
    //         return event as HttpProgressEvent;
    //       case HttpEventType.Response:
    //         return (event as HttpResponse<Response>).body;
    //       default:
    //         if (!environment.production) {
    //           console.log(`Unexpected event type: ${HttpEventType[event.type]} when posting to ${url}.`, body, event);
    //         }
    //     }
    //   });
    // });
  }

  public Login(r: LoginQ): Observable<User> {
    return this.post('/api/user/login', r);
  }

  public Register(r: RegisterQ): Observable<undefined> {
    return this.post('/api/user/register', r);
  }

  public UserExist(r: string): Observable<boolean> {
    return this.get(`/api/user/exist/${r}`);
  }

  public GetUser(r: string): Observable<User> {
    return this.get(`/api/user/get/${r}`);
  }

  public ChangePassword(r: ChangePasswordQ): Observable<undefined> {
    return this.post('/api/user/changePassword', r);
  }

  public SetAvatar(r: Blob): Observable<undefined> {
    const form = new FormData();
    form.append('avatar', r, 'avatar.png');

    return this.post('/api/user/setAvatar', form);
  }

  public ResetAvatar(): Observable<undefined> {
    return this.get('/api/user/resetAvatar');
  }

  public SetAvatarP(r: Blob, id: string): Observable<undefined> {
    const form = new FormData();
    form.append('id', id);
    form.append('avatar', r, 'avatar.png');

    return this.post('/api/user/admin/setAvatar', form);
  }

  public ResetAvatarP(r: string): Observable<undefined> {
    return this.get(`/api/user/resetAvatarP/${r}`);
  }

  public ListUser(r: ListUserQ): Observable<ListUserP> {
    return this.post('/api/user/admin/list', r);
  }

  public AddUser(r: AddUserQ): Observable<undefined> {
    return this.post('/api/user/admin/add', r);
  }

  public RemoveUser(r: RemoveUserQ): Observable<undefined> {
    return this.post('/api/user/admin/remove', r);
  }

  public SetPassword(r: SetPasswordQ): Observable<undefined> {
    return this.post('/api/user/admin/password', r);
  }

  public SetUserPermission(r: SetUserPermissionQ): Observable<undefined> {
    return this.post('/api/user/admin/permission', r);
  }

  public ListInvite(r: ListInviteQ): Observable<ListInviteP> {
    return this.post('/api/invite/list', r);
  }

  public AddInvite(r: InviteCode): Observable<undefined> {
    return this.post('/api/invite/add', r);
  }

  public RemoveInvite(r: string): Observable<undefined> {
    return this.get(`/api/invite/remove/${r}`);
  }

  public SetInviteTimes(r: InviteCode): Observable<undefined> {
    return this.post('/api/invite/setTimes', r);
  }

  public ListImage(r: ListImageQ): Observable<ListImageP> {
    return this.post('/api/gallery/list', r);
  }

  public ListImageTags(r: string): Observable<string[]> {
    return this.get(`/api/gallery/listTags/${r}`);
  }

  public ListImageWithTag(r: ListImageWithTagQ): Observable<ListImageP> {
    return this.post('/api/gallery/listWithTag', r);
  }

  public ListImageContainsTag(r: ListImageContainsTagQ): Observable<ListImageP> {
    return this.post('/api/gallery/listContainsTag', r);
  }

  public SetImageInfo(r: SetImageInfoQ): Observable<undefined> {
    return this.post('/api/gallery/set', r);
  }

  public GetImage(r: string): Observable<Image> {
    return this.get(`/api/image/get/${r}`);
  }

  public RemoveImage(r: string[]): Observable<undefined> {
    return this.post('/api/image/remove', {ids: r});
  }

  public UploadSimple(tag: string, origins: string, image: Blob): Observable<HttpEvent<Response>> {
    const form = new FormData();
    form.append('tag', tag);
    form.append('origins', origins);
    const name = (image as File).name || 'image';
    form.append('image', image, name);

    return this.postProgress('/api/upload/simple', form);
  }

  public UploadAdvanced(tag: string, origins: string, formats: { [key: string]: Blob }): Observable<HttpEvent<Response>> {
    const form = new FormData();
    form.append('tag', tag);
    form.append('origins', origins);
    for (const [format, image] of Object.entries(formats)) {
      if (image) {
        form.append('images', image, format);
      }
    }

    return this.postProgress('/api/upload/advanced', form);
  }

  public UpdateImage(id: string, formats: { [key: string]: Blob }): Observable<HttpEvent<Response>> {
    const form = new FormData();
    form.append('id', id);
    for (const [format, image] of Object.entries(formats)) {
      form.append('images', image, format);
    }

    return this.postProgress('/api/upload/update', form);
  }

  public SetPreference(preference: string): Observable<undefined> {
    const body = new HttpParams().set('preference', preference);

    return this.post('/preference', body);
  }

  constructor(private http: HttpClient) {
  }
}
