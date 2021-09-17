WikibaseMediaInfo is an extension to [Wikibase](http://www.wikiba.se/) adding a
MediaInfo entity for handling structured data about multimedia files.

The extension hooks into the File Page. It stores supplemental metadata
(captions and depicts statements) about the file in a [MediaInfo
Entity](#MediaInfo Entity (M-item)). The user can view, create, edit, and delete
this data.

## Requirements

### System-level dependencies
- **ElasticSearch*** (see [here](https://www.mediawiki.org/wiki/Extension:CirrusSearch#Dependencies) for more information on how to install)
- **Node.js v6** for testing during development. Node dependency will be
  upgraded to a more recent LTS version once our CI system can support it.

### MW Extensions
The following Mediawiki extensions must be installed and configured prior to
installing WikibaseMediaInfo:

- [UniversalLanguageSelector](https://www.mediawiki.org/wiki/Extension:UniversalLanguageSelector)
- [Wikibase](https://www.mediawiki.org/wiki/Wikibase/Installation) (follow
  instructions for setting up repo and client)

#### Search Features
WikibaseMediaInfo adds some new search features. To use them, you need to
install and configure the following search-related extensions:

- [Elastica](https://www.mediawiki.org/wiki/Extension:Elastica)
- [CirrusSearch](https://www.mediawiki.org/wiki/Extension:CirrusSearch#Installation)
- [WikibaseCirrusSearch](https://www.mediawiki.org/wiki/Extension:WikibaseCirrusSearch)

#### UploadWizard Features
WikibaseMediaInfo also adds new functionality to the [UploadWizard
Extension](https://www.mediawiki.org/wiki/Extension:UploadWizard), but it is not required.


## Installation
After CirrusSearch and Wikibase are set up properly, enable the extension by
adding `wfLoadExtension( 'WikibaseMediaInfo' );` along with the required config
variables to `LocalSettings.php`.

You might need to run `composer install` in the extension directory, or in the
root directory of your MediaWiki installation if you are using a setup that
merges all extension's dependencies into MediaWiki's vendor directory.

## Post-install setup

### Depicts Property
A basic building-block of Wikibase is the
[Statement](https://www.mediawiki.org/wiki/Wikibase/DataModel/Primer#Statements).
The **claim** made by a given statement has two basic parts, *properties* and
*values*. Currently WikibaseMediaInfo supports statements that feature a
single property: the [Depicts](https://www.wikidata.org/wiki/Property:P180)
property.

If you are running this extension in a local development environment, you will
need to add a Wikibase record for this property. The easiest way to do that is:

1. Navigate to `Special:NewProperty`
2. Add an item with label set to `depicts`. Make sure to set the data type to
   `item`.
3. Update your `LocalSettings.php` file so that the `depicts` property is set
  to the ID of the property you just created:

```
$wgMediaInfoProperties = [
	'depicts' => 'P123',
];
```

### Entities
In order to add values to statements, you will also need to add Entity items to
your local Wikibase instance. This can be done manually at: `Special:NewItem`,
or through using the WikibaseImport script (see below).

### WikibaseImport
You can optionally use the unofficial
[WikibaseImport](https://github.com/filbertkm/WikibaseImport) extension to
automate the process of importing entities from another Wikibase instance (such
as Wikidata). See that project's README for more information.

### Federation
TBD

### Less variables

Since Wikimedia UI base variables aren't in core, we require them as a package
dependency, then use a shell script to copy them to the `lib` directory. To
update the base variables, require the new version in package.json and install
it, then run `npm run build-lib` to copy the updated file into `lib`. Commit the
updated files.

We're including the base variables in our custom variables file,
`resources/mediainfo-variables.less`. To use them in other files, include
`mediainfo-variables.less` rather than directly including the base file itself.

## Configuration
Extension configuration variables are sets of key-value pairs. They are
documented in more detail in `WikibaseMediaInfo/extension.json`. Config
variables should be added to`LocalSettings.php`. The following config options
are available for this extension:

| variable | example value | default | notes |
|----------|---------------|---------|-------|
| $wgMediaInfoProperties | `[ 'depicts' => 'P123' ]` | {} | default WB properties to show (e.g. "depicts") |
| $wgMediaInfoHelpUrls | `[ 'P1' => 'https://commons.wikimedia.org/wiki/Special:MyLanguage/Commons:Depicts' ]` | {} | Links to pages to learn more about wikibase properties |
| $wgUploadWizardConfig[ 'wikibase' ][ 'enabled' ] | true/false | false | UploadWizard feature-flag |
| $wgUploadWizardConfig[ 'wikibase' ][ 'captions' ] | true/false | false | UploadWizard feature-flag |
| $wgUploadWizardConfig[ 'wikibase' ][ 'statements' ] | true/false | false | UploadWizard feature-flag |


## MediaInfo Glossary

#### Property (P-item)

A property is used to categorize or describe a file. It has a unique id in
wikibase in the form `Pxxx` such as `P123`. Examples of file properties are
'depicts' (what an image is a picture of), 'resolution', 'created by',
'license'.

#### Item (Q-item)

An item is the concept, topic, or object. It is represented by a unique id in
the form `Qxxx`. For example on Wikidata the planet Earth is the item `Q2` and
the CC0 licence is `Q6938433`.

#### Claim

A single fact about a media file consisting of a key-value pair (usually a
property-item) such as `Licence=CC-By-SA` or `Depicts=Dog`. Claims are stored
simply as strings, using the property ids and item ids as appropriate. For
example, an image depicting a black cat could have the claim
`depicts=cat(color=black)`.

#### Captions

A short piece of text describing a media file, plus its language. This is used
to WikibaseMediaInfo to provide a short description of the file (the same as
'labels' in wikibase).

#### MediaInfo Entity (M-item)

A Wikibase entity that contains structured data about media files. It is
**stored in a slot on a File page** and consists of

* an ID in the form Mxxx, where xxx is the id of the associated wiki page
* any number of captions
* any number of claims

(Note: if there is no caption or claim data then the entity is not stored in the
database - in this case the entity is known as a 'virtual entity')

#### Qualifiers

A qualifier is a secondary claim that modifies the primary claim. For example an
image might have a tree in the foreground and the sea in the background, in
which case it could have 2 'depicts' claims associated with it -
'depicts=tree(applies to part=foreground)' and 'depicts=sea(applies to
part=background)'.

## MediaInfo UI

MediaInfo entities are shown on, and can be edited from, their associated File
page. Captions and claims are shown separately, and claims are split into
'depicts' claims and 'other' claims.

### Search

### Search by caption
Users can search for files by their MediaInfo captions just as they would search
for anything else. For example, if a user uploads a picture of the Eiffel Tower,
and enters ‘Tour Eiffel’ (French) and ‘Eiffel Tower’ (English) as multilingual
file captions, the picture is findable by another user searching for either
‘Eiffel Tower’ or ‘Tour Eiffel’.

#### Searching for a single claim
_Assume `['depicts': 'P1]` is the media info property_

To search for a claim, use the `haswbstatement` keyword. For example, to search
for images with Mont Blanc (Q583) search for `haswbstatement:P1=Q583`.

Searches for claims can also use qualifiers. For example, to search for images
with Mont Blanc (Q583) in the background (Q13217555), where P518 is the property
‘applies to part’ use:

`haswbstatement:P1=Q583[P518=Q13217555]`

#### Searching across multiple claims at once

Claims can be combined using a logical OR in a single search keyword using the
pipe character `|`. For example files depicting a cat (Q146) OR a dog (Q144) can
be found using

`haswbstatement:P1=Q146|P1=Q144`

Claims can be combined using a logical AND by using 2 separate search keywords.
For example, files depicting a cat AND a dog can be found using:

`haswbstatement:P1=Q146 haswbstatement:P1=Q144`

#### Searching for claims with quantity qualifiers

To search for a claim with a quantity, use the `wbstatementquantity` keyword.
For example, files that depict 2 humans (Q5) can be found using:

`wbstatementquantity:P1=Q5=2`

The comparison operators `>`, `>=`, `<` and `<=` can also be used, so a search
for files depicting more than 2 humans can be found using:

`wbstatementquantity:P1=Q5>2`

#### Searching for a range of values

Ranges can be searched for using two `wbstatementquantity` keywords at once. For
example, to find files depicting between 2 and 5 humans (Q5) use:

`wbstatementquantity:P1=Q5>=2 wbstatementquantity:P1=Q5<=5`

### Search Implementation

When the File page is saved, the following MediaInfo data is written to the
Elasticsearch index (all examples use Wikidata Property and Item ids):

* Captions data in every language is stored in the `opening_text` field
* Claims are stored in the format `propertyID=value` as array elements in the
  `statement_keywords` field using the wikibase property ID (and item id, if
  value is an item)

    e.g. ‘depicts house cat’ is stored as `P1=Q146`

* Claims with qualifiers are stored in the `statement_keywords` field along with
  their qualifiers in the format
  `propertyID=value[qualifierPropertyID=qualifierValue]`.

   For example, the Mona Lisa painting (Wikidata item Q12418) depicts a sky
   (Q13217555) in the background (Wikidata property P518). If we arrange this
   data in a Wikibase claim, it would be: ‘depicts sky, applies to part
   background’, which would be stored as `P1=Q12418[P518=Q13217555]`

   Note that claims with qualifiers are also stored without the qualifier, to
   increase their findability. So, for example, if someone entered the above
   claim-plus-qualifier, the claim `P1=Q12418` is also stored, so that someone
   can find the file by searching for ‘depicts sky’ alone, as well as by
   searching for ‘depicts sky, applies to part background’.

* Claims data with qualifiers where the qualifier value is a quantity is stored
  in the `statement_quantity` field in the format `propertyID=value|quantity`,
  eg. ‘depicts human, quantity 1’ is stored as `P1=Q5|1`.

Note that not all claims are stored. A claim will be indexed in ElasticSearch
only if ALL of the following conditions are true:

* The claim has a real value (i.e. its value is not ‘no value’ or ‘some value’) **AND**
* We know how to process its value for indexing. More value processors may be
  added in future, but currently we require the claim’s value to be either a Q
  item ID, a string (alphanumeric), or a quantity (numeric) **AND**
* the claims's Wikidata property ID is NOT in a configurable list of excluded
  IDs (`$wgWBRepoSettings['searchIndexPropertiesExclude']`) **AND**
* either
   * its property ID is in a configurable list of property IDs that should be
     indexed (`$wgWBRepoSettings['searchIndexProperties']`) **OR**
   * its property type is in a configurable list of property types that should
     be indexed (`$wgWBRepoSettings['searchIndexTypes']`)

Note that for a claim's quantities to be stored, the claim must meet all the
criteria above **AND** the property ID for the quantity qualifier must be
present in a configurable list of property IDs
(`$wgWBRepoSettings['searchIndexQualifierPropertiesForQuantity']`).

## Tests

### PHPUnit

PHPUnit tests are located in `tests/phpunit`. You can run tests not requiring
the MediaWiki framework (located in `tests/phpunit/composer`) by running
`composer test`. This command also runs code style checks using PHPCS.

Tests relying on the MediaWiki framework (located in `tests/phpunit/mediawiki`)
must by run using MediaWiki core's `phpunit.php` endpoint.

### Node-QUnit

This extension supports headless testing of JS components using Node.js and
QUnit. These tests are defined in `tests/node-qunit`. To run them, open a
terminal and run `npm run test:unit`. They are also included in the larger `npm
test` script (which means they will run in CI).

Node version 6.x should be used if you are running tests locally, for closer
parity with CI and production.

#### Test Dependencies

`package.json` defines a number of `devDependencies` which are used in the
testing environment, including some front-end modules which are declared and
loaded via PHP at runtime (OOJS, OOUI, jQuery etc). These dependencies will
need to be updated here manually if the package versions in core's
`maintenance/resources/foreign-resources.yaml` file change. Versions should
be pinned exactly to avoid any potential problems.


## See also

* [WikibaseMediaInfo page at mediawiki.org](https://www.mediawiki.org/wiki/Extension:WikibaseMediaInfo)
* [Structured Data project on Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Structured_data)
