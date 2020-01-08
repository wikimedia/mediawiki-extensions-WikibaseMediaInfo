<?php

namespace Wikibase\MediaInfo;

use FileContentsHasher;
use LightnCandy\LightnCandy;
use RuntimeException;
use TemplateParser;

/**
 * A simple core Mustache TemplateParser override to allow it to
 * compile files with `.mustache+dom` extension, as might be used
 * on the frontend for more advanced DOM-based rendering.
 */
class MustacheDomTemplateParser extends TemplateParser {

	/**
	 * @inheritDoc
	 */
	protected function getTemplateFilename( $templateName ) {
		// perform parent's validity checks...
		parent::getTemplateFilename( $templateName );

		// but use a different filename
		return "{$this->templateDir}/{$templateName}.mustache+dom";
	}

	/**
	 * @suppress PhanTypeMismatchArgument
	 * @inheritDoc
	 */
	protected function compile( $templateName ) {
		$filename = $this->getTemplateFilename( $templateName );

		if ( !file_exists( $filename ) ) {
			throw new RuntimeException( "Could not find template `{$templateName}` at {$filename}" );
		}

		$files = [ $filename ];
		$contents = file_get_contents( $filename );
		$compiled = LightnCandy::compile(
			$contents,
			[
				'flags' => $this->compileFlags,
				'basedir' => $this->templateDir,
				'fileext' => '.mustache+dom',
				'partialresolver' => function ( $cx, $partialName ) use ( $templateName, &$files ) {
					$filename = "{$this->templateDir}/{$partialName}.mustache+dom";
					if ( !file_exists( $filename ) ) {
						throw new RuntimeException( sprintf(
							'Could not compile template `%s`: Could not find partial `%s` at %s',
							$templateName,
							$partialName,
							$filename
						) );
					}

					$fileContents = file_get_contents( $filename );

					if ( $fileContents === false ) {
						throw new RuntimeException( sprintf(
							'Could not compile template `%s`: Could not find partial `%s` at %s',
							$templateName,
							$partialName,
							$filename
						) );
					}

					$files[] = $filename;

					return $fileContents;
				}
			]
		);
		if ( !$compiled ) {
			// This shouldn't happen because LightnCandy::FLAG_ERROR_EXCEPTION is set
			// Errors should throw exceptions instead of returning false
			// Check anyway for paranoia
			throw new RuntimeException( "Could not compile template `{$filename}`" );
		}

		return [
			'phpCode' => $compiled,
			'files' => $files,
			'filesHash' => FileContentsHasher::getFileContentsHash( $files ),
		];
	}

}
