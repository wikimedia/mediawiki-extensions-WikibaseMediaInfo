<?php

namespace Wikibase\MediaInfo;

use MediaWiki\Extension\Scribunto\Hooks\ScribuntoExternalLibrariesHook;
use MediaWiki\Registration\ExtensionRegistry;
use Wikibase\Client\WikibaseClient;
use Wikibase\MediaInfo\DataAccess\Scribunto\WikibaseMediaInfoEntityLibrary;
use Wikibase\MediaInfo\DataAccess\Scribunto\WikibaseMediaInfoLibrary;

class ScribuntoHooks implements
	ScribuntoExternalLibrariesHook
{

	/**
	 * External libraries for Scribunto
	 *
	 * @param string $engine
	 * @param string[] &$extraLibraries
	 */
	public function onScribuntoExternalLibraries( $engine, array &$extraLibraries ) {
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			return;
		}
		$allowDataTransclusion = WikibaseClient::getSettings()->getSetting( 'allowDataTransclusion' );
		if ( $engine === 'lua' && $allowDataTransclusion === true ) {
			$extraLibraries['mw.wikibase.mediainfo'] = WikibaseMediaInfoLibrary::class;
			$extraLibraries['mw.wikibase.mediainfo.entity'] = [
				'class' => WikibaseMediaInfoEntityLibrary::class,
				'deferLoad' => true,
			];
		}
	}

}
