import {OnDestroy, Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'asObjectUrl'
})
export class AsObjectUrlPipe implements PipeTransform, OnDestroy {
  private objectUrl: string;

  transform(value: Blob): string {
    this.objectUrl = URL.createObjectURL(value);
    return this.objectUrl;
  }

  ngOnDestroy(): void {
    URL.revokeObjectURL(this.objectUrl);
  }

}
