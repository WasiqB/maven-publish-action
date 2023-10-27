const core = require('@actions/core');
const { execSync } = require('child_process');
const { unlinkSync, writeFileSync } = require('fs');
const path = require('path');

const gpgKeyPath = path.join(__dirname, 'private-key.txt');
const mavenSettingsPath = path.join(__dirname, 'settings.xml');

/**
 * Logs to the console
 * @param msg {string}: Text to log to the console
 */
function log(msg) {
  console.log(msg); // eslint-disable-line no-console
}

/**
 * Executes the provided shell command and redirects stdout/stderr to the console
 * @param cmd {string}: Shell command to execute
 * @param cwd {string | null}: Directory in which the command should be run
 * @returns {Buffer | string}: The stdout from the command
 */
function run(cmd, cwd = null) {
  return execSync(cmd, { encoding: 'utf8', stdio: 'inherit', cwd });
}

/**
 * Deploys the Maven project
 */
function runAction() {
  const options = {
    trimWhitespace: true,
  };

  // Make sure the required input variables are provided
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

  // Import GPG key into keychain
  const privateKey = core.getInput('gpg_private_key', options).trim();
  if (privateKey) {
    // Make sure passphrase is provided
    core.getInput('gpg_passphrase', {
      required: true,
      ...options,
    });

    // Import private key (write into temporary file and import that file)
    log('Importing GPG key…');
    writeFileSync(gpgKeyPath, privateKey);
    run(`gpg --import --batch ${gpgKeyPath}`);
    unlinkSync(gpgKeyPath);
  }

  // Deploy to Nexus
  // The "deploy" profile is used in case the user wants to perform certain steps only during
  // deployment and not in the install phase
  log('Deploying the Maven project…');
  const mavenProfileArg = mavenProfiles ? `--activate-profiles ${mavenProfiles}` : '';
  run(
    `
		mvn ${mavenGoalsPhases} --batch-mode ${mavenProfileArg} \
		--settings ${mavenSettingsPath} ${mavenArgs}
		`,
    core.getInput('directory', options) || null
  );
}

runAction();
