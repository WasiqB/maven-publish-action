import * as core from '@actions/core';
import { execFileSync } from 'child_process';
import { unlinkSync, writeFileSync } from 'fs';
import path from 'path';

const gpgKeyPath = path.join(process.cwd(), 'private-key.txt');

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
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: 'inherit', cwd: cwd });
  } catch (error: any) {
    throw new Error(`Error encountered while running command: ${error.message}`);
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
  const options = {
    trimWhitespace: true,
    required,
  } satisfies core.InputOptions;
  const value = core.getInput(name, options) || defaultValue;
  if (!value && required) {
    throw new Error(`Input value [${name}] is required which is not set...`);
  }
  return value;
}

/**
 * Deploys the Maven project
 */
export async function runAction(): Promise<void> {
  try {
    getInputOption('nexus_username', true);
    getInputOption('nexus_password', true);
    const mavenArgs = getInputOption('maven_args').split(' ');
    const mavenGoalsPhases = getInputOption('maven_goals_phases', false, 'clean deploy');
    const mavenProfiles = getInputOption('maven_profiles');

    const privateKey = getInputOption('gpg_private_key').trim();
    if (privateKey) {
      core.debug('Importing GPG key…');
      writeFileSync(gpgKeyPath, privateKey);
      run('gpg', ['--import', '--batch', `${gpgKeyPath}`]);
      unlinkSync(gpgKeyPath);
    }

    core.debug('Deploying the Maven project…');
    const mavenProfileArg = mavenProfiles ? ['--activate-profiles', mavenProfiles] : [''];
    const settingArgs = [
      '--settings',
      getInputOption('settings_path', false, path.join(process.cwd(), 'src/settings.xml')),
    ];

    run(
      'mvn',
      [
        ...mavenGoalsPhases.split(' '),
        ...settingArgs,
        '--batch-mode',
        ...mavenArgs,
        ...mavenProfileArg,
      ].filter((str) => str !== ''),
      getInputOption('directory', false)
    );
    core.setOutput('published', true);
  } catch (error: any) {
    core.setFailed(error.message);
    core.setOutput('published', false);
  }
}
