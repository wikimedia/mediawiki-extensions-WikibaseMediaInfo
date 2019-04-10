# Selenium tests
	
Please see tests/selenium/README.md file in mediawiki/core repository, usually
at mediawiki/vagrant/mediawiki folder.

## CI vs Beta Commons

The MediaWiki CI process will run any tests in the `tests/selenium/specs` folder
of a given extension. However, limited support for the MediaInfo extension is
available in this environment so most tests will fail. For the time being, no
tests should be added to this folder for this extension.

Instead, Selenium tests should be run on a regular schedule targeting the [Beta
Commons](https://commons.wikimedia.beta.wmflabs.org/) staging site. Tests
meant to run against Beta Commons live at `tests/selenium/specs_betacommons`,
where they will not be picked up by regular CI.

## Installation

Install the dependencies locally:

```
cd mediawiki/extensions/WikibaseMediaInfo
npm install
```

### Environmental variables

The tests rely on environment variables for configuration. For convenience, an
example .env file has been provided with pre-configured settings for testing
against Betacommons (as well as alternative values for local Docker or Vagrant
environments, if needed). To use this, just copy the `.env.example` file to
`.env` and provide valid user credentials. Do not commit this file in git.

## Running tests locally

To run tests against BetaCommons locally:

1. Start Chromedriver in one terminal window and leave running: `npm run chromedriver`
2. Open another terminal window at the project root
3. Ensure the appropriate environment variables are set (see above)
4. Run `npm run selenium-test-betacommons`

## Run specific tests
	
Start Chromedriver in one terminal window:

```
chromedriver --url-base=wd/hub --port=4444
```
	
Then, in another terminal window:

```
npm run selenium-test-betacommons -- --spec tests/selenium/specs_betacommons/FILE-NAME.js
```
	
You can also filter specific test(s) by name:

```
npm run selenium-test-betacommons -- --spec tests/selenium/specs_betacommons/FILE-NAME.js --mochaOpts.grep TEST-NAME
```
