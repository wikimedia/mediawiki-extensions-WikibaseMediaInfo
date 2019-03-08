WikibaseMediaInfo is an extension to [Wikibase](http://www.wikiba.se/) adding a
MediaInfo entity for handling structured data about multimedia files.

The extension hooks into the File Page. It stores supplemental metadata
(captions and depicts statements) about the file in a [MediaInfo
Entity](#MediaInfo Entity (M-item)). The user can view, create, edit, and delete
this data.

## Requirements
- [CirrusSearch](https://www.mediawiki.org/wiki/Extension:CirrusSearch#Installation)
- [Wikibase](https://www.mediawiki.org/wiki/Wikibase/Installation) (follow
  instructions for setting up repo and client)

## Installation
After CirrusSearch and Wikibase are set up properly, enable the extension by
adding `wfLoadExtension( 'WikibaseMediaInfo' );` along with the required config
variables to `LocalSettings.php`.

You might need to run `composer install` in the extension directory, or in the
root directory of your MediaWiki installation if you are using a setup that
merges all extension's dependencies into MediaWiki's vendor directory.

## Configuration
Extension configuration variables are sets of key-value pairs. They are
documented in more detail in `WikibaseMediaInfo/extension.json`. Config
variables should be added to`LocalSettings.php`. The following config options
are available for this extension:

#### Required Config (must be added to LocalSettings)
- **`$wgMediaInfoEnableFilePageDepicts`**  _(temporary feature flag)_\
   Enables MediaInfo the depicts widget on the File Page when set to true.

- **`$wgMediaInfoProperties`**\
   Establishes the main linked property used to build the MediaInfo entity in
   Wikibase. Value is an array of key-value pairs connecting a label name to an
   existing wikibase database id.\
    `['depicts': 'P1]`

- **`$wgDepictsQualifierProperties`**\
    Establishes the descriptors or qualifiers of the MediaInfo entity defined
    in `$wgMediaInfoProperties`. Value is an array of key-value pairs connecting
    a label name to an existing wikibase database id.\
      ```
      [
      'features' =>  'P2',
      'color' =>  'P3',
      'wears' =>  'P4',
      'part' =>  'P5',
      'inscription' =>  'P6',
      'symbolizes' =>  'P7',
      'position' =>  'P8',
      'quantity' =>  'P9',
      ];
      ```

- **`$wgMediaInfoSearchFiletypes`**\
    List of filetypes to search in. E.g.:\
      ```
      [
          {
              "label": "wikibasemediainfo-filetype-bitmap",
              "data": "bitmap",
              "selected": true
          },
          {
              "label": "wikibasemediainfo-filetype-video",
              "data": "video",
              "selected": true
          },
      ];
      ```

Other Config:
   - **`$wgUploadWizardConfig['wikibase']['enabled']`**\
   Enables MediaInfo data on UploadWizard when set to true.
   - **`$wgMediaInfoEnableSearch`** _(temporary feature flag)_\
   Defaults to false.

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

* The claim has a real value (i.e. its value is not ‘no value’ or ‘unknown value’) **AND**
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
