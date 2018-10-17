WikibaseMediaInfo is an extension to [Wikibase](http://www.wikiba.se/) adding a MediaInfo entity type for handling structured data for multimedia files.

The extension hooks into a file description page. It stores supplemental meta data about the file in a MediaInfo entity. The entity's data is displayed on, and is editable from, the File page. 

## Installation

Enable the extension by adding `wfLoadExtension( 'WikibaseMediaInfo' );` to `LocalSettings.php`.

You might need to run `composer install` in the extension directory, or in the root directory of your MediaWiki installation if you are using a setup that merges all extension's dependencies into MediaWiki's vendor directory.

## Other extensions 

This extension **requires** CirrusSearch.

MediaInfo data can be added to a file as it is being uploaded via UploadWizard by setting `$wgUploadWizardConfig['wikibase']['enabled']` to `true` in `LocalSettings.php`. 

## MediaInfo entities

A MediaInfo entity is a Wikibase entity **stored in a slot on a File page** and consists of

* an ID in the form Mxxx, where xxx is the id of the associated wiki page
* any number of captions
* any number of claims

A *caption* is a short piece of text plus its language, intended to provide a short description of the file (the same as 'labels' in wikibase).

A *claim* is a single fact about the file, consisting of a property and a value e.g. `Licence=CC-By-SA` or `Depicts=Dog`

(Note that if there is no caption or claim data then the entity is not stored in the database - in this case the entity is known as a 'virtual entity')

### More about claims

The idea of a claim comes from wikibase (for a more detailed explanation see [the wikibase data model](https://www.mediawiki.org/wiki/Wikibase/DataModel)). A claim consists of a property and value, plus possibly a qualifier.

#### Property

A property in wikibase describes the data type of a claim, and can be thought of as a category of data about a file. It has a unique id in the form `Pxxx` (where `xxx` is a number). Examples of file properties are 'depicts' (what an image is a picture of), 'resolution', 'created by', 'license'.

#### Items

The value in a claim will very often be a wikibase 'item', which is a concept, topic, or object represented by a unique id in the form `Qxxx` (where `xxx` is a number). For example on Wikidata the planet Earth is `Q2` and the CC0 licence is `Q6938433`.

#### Qualifiers

A qualifier is a secondary claim that modifies the primary claim. For example an image might have a tree in the foreground and the sea in the background, in which case it could have 2 'depicts' claims associated with it - 'depicts=tree(applies to part=foreground)' and 'depicts=sea(applies to part=background)'.

#### How claims are stored

Claims are stored simply as strings, using the property ids and item ids as appropriate. Using Property and Item ids from Wikidata as an example, an image depicting a black cat could have the claim 'depicts=cat(color=black)' which would be stored as `P180=Q146[P462=Q23445]`

## MediaInfo UI

MediaInfo entities are shown on, and can be edited from, their associated File page. Captions and claims are shown separately, and claims are split into 'depicts' claims and 'other' claims - this is because for images a 'depicts' claim can be thought of as a special kind of topical "tag", similar to tags on WordPress or flickr.

## Searching
### Search by caption

Users can search for files by their MediaInfo captions just as they would search for anything else. For example if a user uploads a picture of the Eiffel Tower, and enters ‘Tour Eiffel’ (French) and ‘Eiffel Tower’ (English) as multilingual file captions, the picture is findable by another user searching for either ‘Eiffel Tower’ or ‘Tour Eiffel’.

### Search by claim

Note - examples below all use Property and Item ids from Wikidata.

#### Searching for a single claim

To search for a claim, use the `haswbstatement` keyword. For example, files with the claim ‘depicts Mont Blanc’ can be found by searching for `haswbstatement:P180=Q583`. 

Searches for claims can also use qualifiers. For example, to search for images with Mont Blanc (Q583) in the background (Q13217555), a user could use:

`haswbstatement:P180=Q583[P518=Q13217555]`

.. where P518 is the property ‘applies to part’, used as a qualifier

#### Searching across multiple claims at once

Claims can be combined using a logical OR in a single search keyword using the pipe character `|`. For example files depicting a cat (Q146) OR a dog (Q144) can be found using

`haswbstatement:P180=Q146|P180=Q144`

Claims can be combined using a logical AND by using 2 separate search keywords. For example, files depicting a cat AND a dog can be found using:

`haswbstatement:P180=Q146 haswbstatement:P180=Q144`

#### Searching for claims with quantity qualifiers

To search for a claim with a quantity, use the `wbstatementquantity` keyword. For example, files that depict 2 humans (Q5) can be found using:

`wbstatementquantity:P180=Q5=2`

The comparison operators `>`, `>=`, `<` and `<=` can also be used, so a search for files depicting more than 2 humans can be found using:

`wbstatementquantity:P180=Q5>2`

#### Searching for a range of values

Ranges can be searched for using two `wbstatementquantity` keywords at once. For example, to find files depicting between 2 and 5 humans (Q5) use:

`wbstatementquantity:P180=Q5>=2 wbstatementquantity:P180=Q5<=5`

### Search implementation

When the File page is saved, the following MediaInfo data is written to the Elasticsearch index (all examples use Wikidata Property and Item ids):

* Captions data in every language is stored in the `opening_text` field
* Claims are stored in the format `propertyID=value` as array elements in the `statement_keywords` field using the wikibase property ID (and item id, if value is an item)

    e.g. ‘depicts house cat’ is stored as `P180=Q146`

* Claims with qualifiers are stored in the `statement_keywords` field along with their qualifiers in the format `propertyID=value[qualifierPropertyID=qualifierValue]`. 

   For example, the Mona Lisa painting (Wikidata item Q12418) depicts a sky (Q13217555) in the background (Wikidata property P518). If we arrange this data in a Wikibase claim, it would be: ‘depicts sky, applies to part background’, which would be stored as `P180=Q12418[P518=Q13217555]`

   Note that claims with qualifiers are also stored without the qualifier, to increase their findability. So, for example, if someone entered the above claim-plus-qualifier, the claim `P180=Q12418` is also stored, so that someone can find the file by searching for ‘depicts sky’ alone, as well as by searching for ‘depicts sky, applies to part background’.

* Claims data with qualifiers where the qualifier value is a quantity is stored in the `statement_quantity` field in the format `propertyID=value|quantity`, eg. ‘depicts human, quantity 1’ is stored as `P180=Q5|1`.

Note that not all claims are stored. A claim will be indexed in ElasticSearch only if ALL of the following conditions are true:

* The claim has a real value (i.e. its value is not ‘no value’ or ‘unknown value’) **AND**
* We know how to process its value for indexing. More value processors may be added in future, but currently we require the claim’s value to be either a Q item ID, a string (alphanumeric), or a quantity (numeric) **AND**
* the claims's Wikidata property ID is NOT in a configurable list of excluded IDs (`$wgWBRepoSettings['searchIndexPropertiesExclude']`) **AND**
* either
   * its property ID is in a configurable list of property IDs that should be indexed (`$wgWBRepoSettings['searchIndexProperties']`) **OR**
   * its property type is in a configurable list of property types that should be indexed (`$wgWBRepoSettings['searchIndexTypes']`)

Note that for a claim's quantities to be stored, the claim must meet all the criteria above **AND** the property ID for the quantity qualifier must be present in a configurable list of property IDs (`$wgWBRepoSettings['searchIndexQualifierPropertiesForQuantity']`). 

## Tests

PHPUnit tests are located in `tests/phpunit`. You can run tests not requiring the MediaWiki framework (located in `tests/phpunit/composer`) by running `composer test`. This command also runs code style checks using PHPCS.

Tests relying on the MediaWiki framework (located in `tests/phpunit/mediawiki`) must by run using MediaWiki core's `phpunit.php` endpoint.

## See also

* [WikibaseMediaInfo page at mediawiki.org](https://www.mediawiki.org/wiki/Extension:WikibaseMediaInfo)
* [Structured Data project on Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Structured_data)
