# Probot app to automate esphome repos on GitHub

_This project is a fork from the Home Assistant Probot [home-assistant/probot-home-assistant](https://github.com/home-assistant/probot-home-assistant/)_

## Installation

- Go to https://github.com/organizations/esphome/settings/apps and create new GitHub app
- Generate Webhook secret by running `openssl rand -base64 32` and fill in on the form.
- Create the app (see Permission & Subscribe to events below)
- Copy `.env.example` to `.env` and fill in the values; you can use [smee](https://smee.io/new) during development.
- Download the private key (bottom of app settings) and put in the root, name it `github-app-probot-esphome-key.pem`
- Develop using `yarn run dev`
- Update GitHub app to set HTTP url to the deployed url
- Install the GitHub app

On production server: `NODE_ENV=production yarn run start`

## Repositories

- `esphome/esphome`
- `esphome/esphome-docs`
- `esphome/issues`
- `esphome/feature-requests`

## Permissions

- Issues: Read & write
- Pull requests: Read & write
- Single file: Read-only, `CODEOWNERS`
- Commit statuses: Read & Write
- Organizaiton memebers: Read only

## Subscribe to events

- Issue comment
- Issues
- Label
- Milestone
- Pull request review
- Pull request
- Pull request review comment
- Status
