import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BrokerService {

  private data: { [key: string]: any } = {};

  public get(key: string): any {
    return this.data[key];
  }

  public set(key: string, value: any): void {
    this.data[key] = value;
  }

  constructor() {
  }
}
