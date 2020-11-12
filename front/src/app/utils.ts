import * as isIp from 'is-ip';
import {ErrorList} from './errors';

export function generateOriginMatch(input: string): string {
  if (!input) {
    return '';
  }

  if (input === ' ' || input === '*') {
    return input;
  }

  let ip: string;
  if (input.charAt(0) === '[' && input.charAt(input.length - 1) === ']') {
    ip = input.substring(1, input.length - 1);
  }

  if (isIp(ip)) {
    return ip;
  }

  const domain = input.charAt(input.length - 1) === '.' ? input.slice(0, -1) : input;
  const parts = domain.split('.');
  for (const [index, part] of Object.entries(parts)) {
    if (part.length === 0) {
      return '';
    }

    if (part === '*') {
      if (index !== '0') {
        return '';
      } else {
        continue;
      }
    }

    if (!/^[a-zA-Z0-9\-:]+$/.test(part)) {
      return '';
    }
  }

  return domain;
}

export function generateOriginHints(input: string): { origin: string, type: string, bad: boolean }[] {
  const hints: { origin: string, type: string, bad: boolean }[] = [];

  const domain = generateOriginMatch(input);
  const hasAny = this.originsSet.has('*');

  if (domain.length > 0) {
    if (domain.charAt(0) === '*') {
      hints.push({origin: domain, type: 'wildcard', bad: hasAny || this.originsSet.has(domain)});
    } else {
      hints.push({origin: domain, type: 'exact', bad: hasAny || this.originsSet.has(domain)});
      hints.push({origin: '*.' + domain, type: 'wildcard', bad: hasAny || this.originsSet.has('*.' + domain)});
    }
  } else {
    hints.push({origin: '-', type: 'bad', bad: true});
  }

  hints.push({origin: '*', type: 'any', bad: hasAny});
  hints.push({origin: ' ', type: 'none', bad: hasAny || this.originsSet.has(' ')});

  return hints;
}

export function stringError(err: any): string {
  if (ErrorList.includes(err)) {
    return this.locale.dict[err];
  } else if (err.status_code) {
    return this.locale.dict.http_error.replace('%1', String(err.status_code));
  } else {
    return this.locale.dict.network_error;
  }
}
