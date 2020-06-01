import { HelloNPM } from '../index';

test('Hello NPM Test', () => {
    expect(HelloNPM('AppBricks')).toBe('Hello AppBricks to the NPM world!');
});
