WikibaseMediaInfo is an extension to [Wikibase](http://www.wikiba.se/) adding the new MediaInfo entity type for handling structured data for multimedia files.

The extension hooks into file description pages and adds a link to MediaInfo page related to the file.

## Installation

Enable the extension by adding `wfLoadExtension( 'WikibaseMediaInfo' );` to `LocalSettings.php`.

You might need to run `composer install` in the extension directory, or in the root directory of your MediaWiki installation if in your setup extension dependencies are merged into MediaWiki's vendor directory.

## Settings

By default MediaInfo pages will be created in the namespace `145`. In order to use custom namespace number, set `$wgMediaInfoNamespace` to the desired namespace ID in `LocalSettings.php`.

## Virtual MediaInfo entities

Note that, unlike Items and Properties in Wikibase, MediaInfo entities are not stored in the database until some data of the entity is set (e.g. its label or description). Nevertheless links to the MediaInfo page are displayed on file pages, and MediaInfo page is displayed correctly (showing no data but the related file name). Such MediaInfo entities which are not yet stored in the database are called "virtual" MediaInfo entities.

## Tests

PHPUnit tests are located in `tests/phpunit`. You can run tests (`tests/phpunit/composer`) not requiring MediaWiki framework by running `composer test`. This command also runs code style checks (using PHPCS).

Tests relying on MediaWiki framework must by run using MediaWiki core's `phpunit.php` endpoint.

## See also

* [WikibaseMediaInfo page at mediawiki.org](https://www.mediawiki.org/wiki/Extension:WikibaseMediaInfo)
* [Structured Data project on Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Structured_data)
