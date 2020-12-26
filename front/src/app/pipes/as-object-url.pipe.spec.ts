import { AsObjectUrlPipe } from './as-object-url.pipe';

describe('AsObjectUrlPipe', () => {
  it('create an instance', () => {
    const pipe = new AsObjectUrlPipe();
    expect(pipe).toBeTruthy();
  });
});
