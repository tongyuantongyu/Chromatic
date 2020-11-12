import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'fileSize'
})
export class FileSizePipe implements PipeTransform {

  private static readonly UnitList: string[] = [
    '', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'
  ];

  transform(value: number | string, type?: string, precision?: number): number | string {
    type = type || 'both';
    precision = precision === undefined ? 0 : precision;

    let v = Number(value);
    let index = 0;
    while (v > 1024) {
      v /= 1024;
      index += 1;
    }

    switch (type) {
      case 'both':
        return `${v.toFixed(index === 0 ? 0 : precision)}${FileSizePipe.UnitList[index]}`;
      case 'number':
        return precision === undefined ? v : v.toFixed(index === 0 ? 0 : precision);
      case 'unit':
        return FileSizePipe.UnitList[index];
      default:
        return '';
    }
  }

}
