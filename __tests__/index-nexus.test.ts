import * as core from '@actions/core';
import * as index from '../src/index';
import path from 'path';

const runMock = jest.spyOn(index, 'runAction');

let debugMock: jest.SpiedFunction<typeof core.debug>;
let errorMock: jest.SpiedFunction<typeof core.error>;
let getInputMock: jest.SpiedFunction<typeof core.getInput>;
let getBooleanInputMock: jest.SpiedFunction<typeof core.getBooleanInput>;
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>;
let setOutputMock: jest.SpiedFunction<typeof core.setOutput>;

describe('test maven publish action', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    debugMock = jest.spyOn(core, 'debug').mockImplementation();
    errorMock = jest.spyOn(core, 'error').mockImplementation();
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation();
    getBooleanInputMock = jest.spyOn(core, 'getBooleanInput').mockImplementation();
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation();
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation();
  });

  it('test publish without gpg', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'server_username':
          return process.env.NEXUS_USERNAME ?? '';
        case 'server_password':
          return process.env.NEXUS_PASSWORD ?? '';
        case 'directory':
          return path.join(process.cwd(), 'java-test/nexus/without-gpg');
        case 'maven_profiles':
          return 'deploy';
        default:
          return '';
      }
    });

    await index.runAction();
    expect(runMock).toHaveReturned();

    expect(debugMock).toHaveBeenNthCalledWith(1, 'Deploying the Maven project…');
    expect(setOutputMock).toHaveBeenNthCalledWith(1, 'published', true);
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('test publish with gpg', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'server_username':
          return process.env.NEXUS_USERNAME ?? '';
        case 'server_password':
          return process.env.NEXUS_PASSWORD ?? '';
        case 'gpg_private_key':
          return process.env.GPG_PRIVATE_KEY ?? '';
        case 'directory':
          return path.join(process.cwd(), 'java-test/nexus/with-gpg');
        case 'maven_args':
          return '-DskipTests -Dcheckstyle.skip';
        default:
          return '';
      }
    });

    await index.runAction();
    expect(runMock).toHaveReturned();

    expect(debugMock).toHaveBeenNthCalledWith(1, 'Importing GPG key…');
    expect(debugMock).toHaveBeenNthCalledWith(3, 'Deploying the Maven project…');
    expect(setOutputMock).toHaveBeenNthCalledWith(1, 'published', true);
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('test missing required input param', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'server_username':
        case 'server_password':
          return '';
        case 'maven_profiles':
          return 'deploy';
        case 'directory':
          return path.join(process.cwd(), 'java-test/nexus/without-gpg');
        default:
          return '';
      }
    });

    await index.runAction();
    expect(runMock).toHaveReturned();

    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      'Input value [server_username] is required which is not set...'
    );
    expect(setOutputMock).toHaveBeenNthCalledWith(1, 'published', false);
  });

  it('test publish with profile and gpg', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'server_username':
          return process.env.NEXUS_USERNAME ?? '';
        case 'server_password':
          return process.env.NEXUS_PASSWORD ?? '';
        case 'maven_profiles':
          return 'release';
        case 'gpg_private_key':
          return process.env.GPG_PRIVATE_KEY ?? '';
        case 'directory':
          return path.join(process.cwd(), 'java-test/nexus/with-profiles');
        case 'maven_args':
          return '-DskipTests -Dcheckstyle.skip';
        default:
          return '';
      }
    });

    await index.runAction();
    expect(runMock).toHaveReturned();

    expect(debugMock).toHaveBeenNthCalledWith(1, 'Importing GPG key…');
    expect(debugMock).toHaveBeenNthCalledWith(3, 'Deploying the Maven project…');
    expect(setOutputMock).toHaveBeenNthCalledWith(1, 'published', true);
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('test publish with incorrect goal', async () => {
    const dir = process.cwd();
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'server_username':
          return process.env.NEXUS_USERNAME ?? '';
        case 'server_password':
          return process.env.NEXUS_PASSWORD ?? '';
        case 'maven_goals_phases':
          return 'dummy';
        case 'directory':
          return path.join(dir, 'java-test/nexus/without-gpg');
        default:
          return '';
      }
    });
    await index.runAction();
    expect(runMock).toHaveReturned();

    const pomPath = `${path.join(dir, 'java-test/nexus/without-gpg')}/pom.xml`;
    const settingsPath = `${dir}/src/settings.xml`;

    expect(debugMock).toHaveBeenNthCalledWith(1, 'Deploying the Maven project…');
    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      `Error occurred:
Command failed: mvn dummy --file ${pomPath} --settings ${settingsPath} --batch-mode`
    );
    expect(setOutputMock).toHaveBeenNthCalledWith(1, 'published', false);
  });
});
