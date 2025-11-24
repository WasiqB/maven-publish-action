import * as core from '@actions/core';
import { execFileSync } from 'child_process';
import { unlinkSync, writeFileSync } from 'fs';
import path from 'path';

/**
 * Executes the provided shell command and redirects stdout/stderr to the console
 * @param cmd {string}: Shell command to execute
 * @param cwd {string | null}: Directory in which the command should be run
 * @returns {Buffer | string}: The stdout from the command
 */
function run(
  cmd: string,
  args: string[],
  cwd: string | URL | undefined = undefined
): string | Buffer {
  try {
    core.debug(`Running command: ${cmd} ${args.join(' ')}`);
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: 'inherit', cwd: cwd });
  } catch (error: any) {
    throw new Error(`Error occurred:
${error.message}`);
  }
}

/**
 * Gets the input value for the action.
 * @param name Input name
 * @param required Input options required?
 * @param defaultValue default input value
 * @returns Input value
 */
function getInputOption(
  name: string,
  required: boolean = false,
  defaultValue: string = ''
): string {
  const options: core.InputOptions = {
    trimWhitespace: true,
    required,
  };
  const value = core.getInput(name, options);
  if (value.trim().length === 0) {
    if (defaultValue.trim().length > 0) {
      return defaultValue;
    }
    if (required) {
      throw new Error(`Input value [${name}] is required which is not set...`);
    }
  }
  return value;
}

function getBooleanInputOption(name: string, required: boolean = false): boolean {
  const value = core.getBooleanInput(name, { required });
  return value;
}

/**
 * Fetch Server related details.
 */
function fetchServerInputs(): void {
  const id = getInputOption('server_id');
  const userName = getInputOption('server_username', true);
  const password = getInputOption('server_password', true);

  core.exportVariable('SERVER_ID', id);
  core.exportVariable('SERVER_USERNAME', userName);
  core.exportVariable('SERVER_PASSWORD', password);

  core.setSecret('SERVER_USERNAME');
  core.setSecret('SERVER_PASSWORD');
}

/**
 * Fetch GPG Key.
 */
function fetchGpgKey(): void {
  const gpgKeyPath = path.join(process.cwd(), 'private-key.txt');
  const privateKey = getInputOption('gpg_private_key').trim();
  if (privateKey) {
    core.debug('Importing GPG key…');
    writeFileSync(gpgKeyPath, privateKey);
    run('gpg', ['--import', '--batch', `${gpgKeyPath}`]);
    unlinkSync(gpgKeyPath);
  }
}

/**
 * Get all the required Maven details as per the user inputs.
 * @returns Maven details.
 */
function getMavenInputs(): {
  args: string[];
  goals: string[];
  profile: string[];
  setting: string[];
  directory: string;
  pom: string[];
  batchMode: boolean;
} {
  core.debug('Deploying the Maven project…');
  const mavenArgs = getInputOption('maven_args').split(' ');
  const mavenGoalsPhases = getInputOption('maven_goals_phases', false, 'clean deploy');
  const mavenProfiles = getInputOption('maven_profiles');
  const directory = getInputOption('directory', false, process.cwd());
  const pomFilePath = [
    '--file',
    getInputOption('pom_file_name', false, path.join(directory, 'pom.xml')),
  ];

  const mavenProfileArg = mavenProfiles ? ['--activate-profiles', mavenProfiles] : [''];
  const settingArgs = [
    '--settings',
    getInputOption('settings_path', false, path.join(process.cwd(), 'src/settings.xml')),
  ];
  const batchMode = getBooleanInputOption('batch_mode', false);

  return {
    args: mavenArgs,
    goals: mavenGoalsPhases.split(' '),
    profile: mavenProfileArg,
    setting: settingArgs,
    directory,
    pom: pomFilePath,
    batchMode
  };
}

/**
 * Deploys the Maven project
 */
export async function runAction(): Promise<void> {
  try {
    fetchServerInputs();
    fetchGpgKey();
    const maven = getMavenInputs();
    run(
      'mvn',
      [
        ...maven.goals,
        ...maven.pom,
        ...maven.setting,
        maven.batchMode ? '--batch-mode' : '',
        ...maven.args,
        ...maven.profile,
      ].filter((str) => str !== ''),
      maven.directory
    );
    core.setOutput('published', true);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
    core.setOutput('published', false);
  }
}

runAction();
