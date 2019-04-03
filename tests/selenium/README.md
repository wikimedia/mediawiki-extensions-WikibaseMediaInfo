# Selenium tests
	
Please see tests/selenium/README.md file in mediawiki/core repository, usually
at mediawiki/vagrant/mediawiki folder.
	
## Setup

Install the dependencies locally:
		
	cd mediawiki/extensions/WikibaseMediaInfo
	npm install

Chromedriver is provided by an NPM package, so you should not need to install
the executable separately.
	
## Run all specs
	
Start Chromedriver in one terminal window:
	
    npm run chromedriver
	
Then, in another terminal window:
	
    npm run selenium-test
    
### Use with non-Vagrant local environments

The default values for the test runner script assume that you are using the
Wikimedia-Vagrant development environment. To run tests locally using a
different environment, you need to provide the appropriate environmental
variables in the same terminal you `npm run selenium-test` from.

If you are using the MW-Docker-Dev environment in its default configuration,
those commands would look like this:

    export MW_SERVER=http://default.web.mw.localhost:8080
    export MW_SCRIPT_PATH=/mediawiki
    export MEDIAWIKI_PASSWORD=dockerpass
    
    npm run selenium-test
    
You still need to have Chromedriver running in a separate window, as above.
	
## Run specific tests
	
Start Chromedriver in one terminal window:
	
    chromedriver --url-base=wd/hub --port=4444
	
Then, in another terminal window:
	
    npm run selenium-test -- --spec tests/selenium/specs/FILE-NAME.js
	
You can also filter specific test(s) by name:
	
	npm run selenium-test -- --spec tests/selenium/specs/FILE-NAME.js --mochaOpts.grep TEST-NAME
