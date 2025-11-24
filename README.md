# Maven Publish Action

GitHub Action for automatically publishing to Maven Central

## Features

- Executes the Maven `deploy` lifecycle phase
- Provides Maven with your GPG key and passphrase so your artifacts can be signed using `maven-gpg-plugin`
- Provides Maven with your Nexus credentials so it can deploy and release your project to Maven Central

It will also use the `deploy` Maven profile if you've defined one (in case you want to perform certain steps only when deploying).

## Setup

### Deployment

It's recommended to publish using the Nexus Staging Maven Plugin, which greatly simplifies the process. You can follow [this guide](./docs/deployment-setup.md) for a simple configuration.

Make sure your project is correctly configured for deployment before continuing with the next step.

### Secrets

In your project's GitHub repository, go to Settings → Secrets. On this page, set the following variables:

- `NEXUS_USERNAME`: Username (not email!) for your Nexus repository manager account
- `NEXUS_PASSWORD`: Password for your Nexus account (or, even better, use the [auth token](https://solidsoft.wordpress.com/2015/09/08/deploy-to-maven-central-using-api-key-aka-auth-token/) instead)

Signing your artifact using GPG is optional, but recommended. If you choose to use GPG, add the following secrets:

- `GPG_PRIVATE_KEY`: GPG private key for signing the published artifacts:
  - Run `gpg --list-secret-keys` and copy the ID of the key you'd like to use
  - Export the key with `gpg -a --export-secret-keys KEY_ID` (and replace `KEY_ID` with the ID you copied)
- `GPG_PASSPHRASE`: Passphrase for the GPG key

If you sign your artifacts, make sure the `maven-gpg-plugin` is configured as described [here](https://github.com/WasiqB/maven-publish-action/blob/main/docs/deployment-setup.md#project-configuration).

## Workflow file

Create a GitHub workflow file (e.g. `.github/workflows/release.yml`) in your repository. Use the following configuration, which tells GitHub to use the Maven Publish Action when running your CI pipeline. The steps are self-explanatory:

```yml
name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Check out Git repository
        uses: actions/checkout@v4

      - name: Install Java and Maven
        uses: actions/setup-java@v3
        with:
          java-version: 17
          distribution: 'temurin'
          cache: 'maven'

      - name: Release Maven package
        uses: WasiqB/maven-publish-action@v1
        with:
          gpg_private_key: ${{ secrets.gpg_private_key }}
          gpg_passphrase: ${{ secrets.gpg_passphrase }}
          server_username: ${{ secrets.server_username }}
          server_password: ${{ secrets.server_password }}
```

The action will now run every time you push to `main`.

## Configuration

Following are the supported options which you can use with this GitHub Actions:

| Option Name | Description | Required? | Default |
| ----------- | ----------- | --------- | ------- |
| `gpg_private_key` | GPG private key for signing the published artifacts | ❌ | `null` |
| `gpg_passphrase` | Passphrase for the GPG key | ❌ | `null` |
| `server_username` | Username (not email!) for your Repository manager account | ✅ | `null` |
| `server_password` | Password for your Repository manager account | ✅ | `null` |
| `server_id` | Server ID of the repository management server | ❌ | `ossrh` |
| `directory` | Directory of the Maven project which should be deployed | ❌ | `root-dir` |
| `settings_path` | Directory path for Maven settings file | ❌ | `null` |
| `maven_goals_phases` | Maven goals and build phases to execute | ❌ | `clean deploy` |
| `maven_args` | Additional arguments to pass to the Maven command | ❌ | `` |
| `maven_profiles` | Active Maven profiles | ❌ | `deploy` |
| `batch_mode` | Whether to run Maven in batch mode | ❌ | `true` |
