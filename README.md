WikibaseMediaInfo is an extension to [Wikibase](http://www.wikiba.se/) adding the new MediaInfo entity type for handling structured data for multimedia files.

The extension hooks into a file description page and adds a link to a MediaInfo page storing supplemental meta data about the file. This may, for example, include the author, detailed license information, and concepts a picture actually depicts.

## Installation

Enable the extension by adding `wfLoadExtension( 'WikibaseMediaInfo' );` to `LocalSettings.php`.

You might need to run `composer install` in the extension directory, or in the root directory of your MediaWiki installation if you are using a setup that merges all extension's dependencies into MediaWiki's vendor directory.

## Settings

By default MediaInfo pages will be created in the namespace `145`. In order to use a custom namespace number, set `$wgMediaInfoNamespace` in `LocalSettings.php` to the desired namespace ID.

## Virtual MediaInfo entities

Note that, unlike Items and Properties in Wikibase, MediaInfo entities are not stored in the database until some data of the entity is set (e.g. its label or description). Nevertheless a link to the MediaInfo page is always displayed on file page, and the MediaInfo page is displayed correctly, showing no data but the related file name. Such MediaInfo entities which are not yet stored in the database are called "virtual" MediaInfo entities.

## Tests

PHPUnit tests are located in `tests/phpunit`. You can run tests not requiring the MediaWiki framework (located in `tests/phpunit/composer`) by running `composer test`. This command also runs code style checks using PHPCS.

Tests relying on the MediaWiki framework (located in `tests/phpunit/mediawiki`) must by run using MediaWiki core's `phpunit.php` endpoint.

## See also

* [WikibaseMediaInfo page at mediawiki.org](https://www.mediawiki.org/wiki/Extension:WikibaseMediaInfo)
* [Structured Data project on Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Structured_data)
