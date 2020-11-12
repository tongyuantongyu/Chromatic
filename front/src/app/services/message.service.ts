import {Injectable} from '@angular/core';
import {MatSnackBar, MatSnackBarConfig, MatSnackBarRef, SimpleSnackBar} from '@angular/material/snack-bar';
import {EnvironmentService} from './environment.service';

@Injectable({
  providedIn: 'root'
})
export class MessageService {

  constructor(private snackBar: MatSnackBar, private env: EnvironmentService) {
  }

  public SendMessage(message: string, action?: string): MatSnackBarRef<SimpleSnackBar> {
    const config: MatSnackBarConfig = {
      duration: 5000,
      horizontalPosition: this.env.mode === 'mobile' ? 'center' : 'left',
      verticalPosition: 'bottom',
    };
    return this.snackBar.open(message, action, config);
  }
}
