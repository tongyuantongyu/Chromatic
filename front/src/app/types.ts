export interface LoginQ {
  name: string;
  password: string;
  recaptcha: string;
}

export interface ListUserQ {
  offset: number;
  limit: number;
  keyword: string;
}

export interface ListImageQ {
  id: string; // ObjectID
  sort: string;
  offset: number;
  limit: number;
}

export interface ListUserP {
  total: number;
  count: number;
  users: User[] | null;
}

export interface RemoveUserQ {
  users: string[] | null; // ObjectID
  cascade: boolean;
}

export interface SetUserPermissionQ {
  user_id: string; // ObjectID
  privileged: boolean;
  frozen: boolean;
}

export interface ListInviteP {
  total: number;
  count: number;
  codes: InviteCode[] | null;
}

export interface ImageFormat {
  format: string;
  hash: number;
}

export interface SetImageInfoQ {
  targets: string[] | null; // ObjectID
  field: string;
  data: string;
}

export interface RegisterQ {
  name: string;
  password: string;
  invite_code: string;
  recaptcha: string;
}

export interface User {
  id: string; // ObjectID
  name: string;
  privileged: boolean;
  frozen: boolean;
}

export interface AddUserQ {
  name: string;
  password: string;
  privileged: boolean;
}

export interface SetPasswordQ {
  user_id: string; // ObjectID
  password: string;
}

export interface ListInviteQ {
  offset: number;
  limit: number;
}

export interface ListImageP {
  total: number;
  count: number;
  images: Image[] | null;
}

export interface ChangePasswordQ {
  old_password: string;
  new_password: string;
}

export interface InviteCode {
  code: string;
  times: number;
}

export interface Image {
  id: string; // ObjectID
  user_id: string; // ObjectID
  user_name: string;
  tag: string;
  upload: string; // DateTime
  view: number;
  origins: string[] | null;
  original: boolean;
  files?: ImageFormat[];
}

export interface ListImageWithTagQ {
  id: string; // ObjectID
  tag: string;
  offset: number;
  limit: number;
}

export interface ListImageContainsTagQ {
  id: string; // ObjectID
  tag: string;
  offset: number;
  limit: number;
}

