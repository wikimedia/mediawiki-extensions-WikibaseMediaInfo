<?php

declare( strict_types = 1 );

namespace Wikibase\MediaInfo;

use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\ResourceLoader\Hook\ResourceLoaderRegisterModulesHook;
use MediaWiki\ResourceLoader\ResourceLoader;

/**
 * @license GPL-2.0-or-later
 */
class ResourceLoaderHooks implements ResourceLoaderRegisterModulesHook {

	public function __construct(
		private readonly ExtensionRegistry $extensionRegistry,
	) {
	}

	public function onResourceLoaderRegisterModules( ResourceLoader $rl ): void {
		$extensionJson = json_decode(
			file_get_contents( __DIR__ . '/../extension.json' ),
			associative: true
		);
		'@phan-var array $extensionJson';
		$modules = json_decode(
			file_get_contents( __DIR__ . '/../extraResourceModulesProcessedByHookHandler.json' ),
			associative: true
		);
		'@phan-var array $modules';
		foreach ( $modules as &$module ) {
			$module['localBasePath'] ??= __DIR__ . '/../' . $extensionJson['ResourceFileModulePaths']['localBasePath'];
			$module['remoteExtPath'] ??= $extensionJson['ResourceFileModulePaths']['remoteExtPath'];
		}

		if ( $this->extensionRegistry->isLoaded( 'WikibaseQualityConstraints' ) ) {
			$modules['wikibase.mediainfo.statements']['messages'][] = 'wbqc-issues-short';
			$modules['wikibase.mediainfo.statements']['messages'][] = 'wbqc-issues-long';
			$modules['wikibase.mediainfo.statements']['messages'][] = 'wbqc-potentialissues-short';
			$modules['wikibase.mediainfo.statements']['messages'][] = 'wbqc-potentialissues-long';
			$modules['wikibase.mediainfo.statements']['messages'][] = 'wbqc-suggestions-short';
			$modules['wikibase.mediainfo.statements']['messages'][] = 'wbqc-suggestions-long';
			$modules['wikibase.mediainfo.statements']['messages'][] = 'wbqc-parameterissues-short';
			$modules['wikibase.mediainfo.statements']['messages'][] = 'wbqc-parameterissues-long';
		}

		$rl->register( $modules );
	}

}
