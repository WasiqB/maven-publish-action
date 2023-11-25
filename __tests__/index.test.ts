import * as main from '../src/main';

const runMock = jest.spyOn(main, 'runAction').mockImplementation();

describe('index', () => {
  it('calls run when imported', async () => {
    require('../src/index');
    expect(runMock).toHaveBeenCalled();
  });
});
