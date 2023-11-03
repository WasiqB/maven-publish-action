import core from '@actions/core';
import { execSync } from 'child_process';
import { unlinkSync, writeFileSync } from 'fs';
import { Toolkit } from 'actions-toolkit';
import path from 'path';
import { InputType } from 'actions-toolkit/lib/inputs';
import { OutputType } from 'actions-toolkit/lib/outputs';

const gpgKeyPath = path.join(__dirname, 'private-key.txt');

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
async function runAction(tool: Toolkit<InputType, OutputType>): Promise<void> {
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

    tool.log('Importing GPG key…');
    writeFileSync(gpgKeyPath, privateKey);
    run(`gpg --import --batch ${gpgKeyPath}`);
    unlinkSync(gpgKeyPath);
  }

  tool.log('Deploying the Maven project…');
  const mavenProfileArg = mavenProfiles ? `--activate-profiles ${mavenProfiles}` : '';
  const mavenSettingsPath =
    core.getInput('settings_path', options) || path.join(__dirname, 'settings.xml');

  run(
    `
		mvn ${mavenGoalsPhases} --batch-mode ${mavenProfileArg} \
		--settings ${mavenSettingsPath} ${mavenArgs}
		`,
    core.getInput('directory', options) || undefined
  );
}

Toolkit.run(async (tool) => await runAction(tool));
