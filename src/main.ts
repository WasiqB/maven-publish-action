import * as core from '@actions/core';
import { execSync } from 'child_process';
import { unlinkSync, writeFileSync } from 'fs';
import path from 'path';

const gpgKeyPath = path.join(process.cwd(), 'private-key.txt');

/**
 * Executes the provided shell command and redirects stdout/stderr to the console
 * @param cmd {string}: Shell command to execute
 * @param cwd {string | null}: Directory in which the command should be run
 * @returns {Buffer | string}: The stdout from the command
 */
function run(cmd: string, cwd: string | URL | undefined = undefined): string | Buffer {
  return execSync(cmd, { encoding: 'utf8', stdio: 'inherit', cwd: cwd });
}

/**
 * Deploys the Maven project
 */
export function runAction(): void {
  try {
    const options = {
      trimWhitespace: true,
    };

    core.getInput('nexus_username', {
      required: true,
      ...options,
    });
    core.getInput('nexus_password', {
      required: true,
      ...options,
    });

    const mavenArgs = core.getInput('maven_args', options) || '';
    const mavenGoalsPhases = core.getInput('maven_goals_phases', options) || 'clean deploy';
    const mavenProfiles = core.getInput('maven_profiles', options);

    const privateKey = core.getInput('gpg_private_key', options).trim();
    if (privateKey) {
      core.getInput('gpg_passphrase', {
        required: true,
        ...options,
      });

      core.debug('Importing GPG key…');
      writeFileSync(gpgKeyPath, privateKey);
      run(`gpg --import --batch ${gpgKeyPath}`);
      unlinkSync(gpgKeyPath);
    }

    core.debug('Deploying the Maven project…');
    const mavenProfileArg = mavenProfiles ? `--activate-profiles ${mavenProfiles}` : '';
    const mavenSettingsPath =
      core.getInput('settings_path', options) || path.join(process.cwd(), 'settings.xml');

    run(
      `
		mvn ${mavenGoalsPhases} --batch-mode ${mavenProfileArg} \
		--settings ${mavenSettingsPath} ${mavenArgs}
		`,
      core.getInput('directory', options) || undefined
    );
    core.setOutput('published', true);
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}
