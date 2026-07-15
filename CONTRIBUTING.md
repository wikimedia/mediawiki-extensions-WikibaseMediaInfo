# Contributing to WikibaseMediaInfo

Thank you for your interest in contributing to WikibaseMediaInfo.

WikibaseMediaInfo is a MediaWiki extension that adds a MediaInfo entity to
Wikibase for structured data about multimedia files (captions and statements
such as depicts). It is used on Wikimedia Commons File pages and related
surfaces. The Reader Growth team is currently the maintainer of last resort
while stewardship for this codebase is under review.

## Support level

WikibaseMediaInfo has **Support Level: Pending** (also listed as Undecided in
the Reader Growth maintenance model).

Bug fixes, documentation, tests, and compatibility work are especially welcome.
New feature work should start with a Phabricator task and maintainer discussion
before implementation. Review capacity may be limited.

For definitions of support levels, see
[Reader Growth maintenance levels and responsibilities](https://www.mediawiki.org/wiki/Readers/Reader_Growth/Maintenance_Levels_and_Responsibilities).

## How to contribute

Before contributing, please review:

- The [README](README.md) for installation, configuration, and testing
- The [extension page](https://www.mediawiki.org/wiki/Extension:WikibaseMediaInfo)
- The [development guide](https://www.mediawiki.org/wiki/Extension:WikibaseMediaInfo/Development)
  for a fuller local Commons + Wikidata-style setup

This repository does not currently include an `OWNERS.md` file.

## Code contributions

The canonical repository is on
[Gerrit](https://gerrit.wikimedia.org/r/admin/repos/mediawiki/extensions/WikibaseMediaInfo).

To contribute code:

1. Set up a [Wikimedia developer account](https://www.mediawiki.org/wiki/Developer_account)
   and follow the [Gerrit/Tutorial](https://www.mediawiki.org/wiki/Gerrit/Tutorial).
2. Clone the repository and install the commit-msg hook:

   ```sh
   git clone "ssh://USERNAME@gerrit.wikimedia.org:29418/mediawiki/extensions/WikibaseMediaInfo"
   cd WikibaseMediaInfo
   git review -s
   ```

3. Make a focused change, then run linting and tests when possible:

   ```sh
   composer test
   npm test
   ```

4. Submit the patch with `git review`.

Follow
[MediaWiki commit message guidelines](https://www.mediawiki.org/wiki/Gerrit/Commit_message_guidelines),
including a `Bug: TXXXXXX` footer when your change relates to a Phabricator
task.

## Reporting issues

Tasks and bug reports are tracked on
[Phabricator](https://phabricator.wikimedia.org/tag/wikibasemediainfo/).
Please search for existing tasks before creating a new one.

## Code of Conduct

Participation in Wikimedia technical spaces is governed by the
[Wikimedia Code of Conduct](https://www.mediawiki.org/wiki/Special:MyLanguage/Code_of_Conduct).
See also [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) in this repository.
