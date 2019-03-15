( function ( sd, wb ) {
	'use strict';

	/**
	 * Panel for displaying/editing structured data multi-lingual captions
	 *
	 * RULES FOR LANGUAGE ORDERING/DISPLAY
	 *
	 * Order
	 * -----
	 *
	 * 1. Show a caption for the interface language of the page (whether or not it has a value)
	 * 2. If there is no caption for the interface language, show the first caption in the fallback
	 *    chain that has a value (if any)
	 * 3. If the logged-in user has Babel languages, and they haven’t already been shown, then show
	 *    captions for all of them next, whether or not they have values
	 * 4. Show everything else with a value
	 *
	 * Display
	 * -------
	 *
	 * 1, 2, 3 are always displayed
	 * 4 are hidden/shown by the languagesViewWidget
	 * ... or, in other words - the first caption is always shown, the first non-blank caption
	 * is always shown, all user languages are always shown, and everything else may be hidden.
	 *
	 * @extends OO.ui.Element
	 * @mixins OO.ui.mixin.PendingElement
	 *
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {string} headerClass CSS class of captions header element
	 * @cfg {string} contentClass CSS class of captions content container
	 * @cfg {string} entityTermClass CSS class of individual caption
	 * @cfg {bool} captionsExist True if there is existing caption data, false if not
	 * @cfg {int} warnWithinMaxCaptionLength Show a warning when the caption length is within X
	 *   characters of the max
	 */
	sd.CaptionsPanel = function CaptionsPanel( config ) {
		this.config = config || {};

		// Parent constructor
		sd.CaptionsPanel.super.apply( this, arguments );

		// Mixin constructors
		OO.ui.mixin.PendingElement.call( this, this.config );

		this.captionsData = {};
		this.captionsExist = config.captionsExist;
		this.languageSelectors = [];
		this.textInputs = [];

		this.licenseDialogWidget = new sd.LicenseDialogWidget();
		this.licenseAcceptance = $.Deferred().promise();

		this.editToggle = new OO.ui.ButtonWidget( {
			label: mw.message( 'wikibasemediainfo-filepage-edit' ).text(),
			framed: false,
			flags: 'progressive',
			title: mw.message( 'wikibasemediainfo-filepage-edit-captions' ).text(),
			classes: [ 'wbmi-entityview-editButton' ]
		} );
		this.editToggle.connect( this, { click: 'makeEditable' } );

		this.languagesViewWidget = new sd.LanguagesViewWidget( this.config );
		this.editActionsWidget = new sd.CaptionsEditActionsWidget(
			{ appendToSelector: '.' + config.contentClass },
			this
		);
		this.api = wb.api.getLocationAgnosticMwApi( mw.config.get( 'wbRepoApiUrl' ) );
		this.contentSelector = '.' + this.config.contentClass;
		this.entityTermSelector = '.' + this.config.entityTermClass;
		this.captionLanguagesDataAttr = 'data-caption-languages';

		this.userLanguages = mw.config.get( 'wbUserSpecifiedLanguages' ).slice();
	};

	/* Inheritance */
	OO.inheritClass( sd.CaptionsPanel, OO.ui.Element );
	OO.mixinClass( sd.CaptionsPanel, OO.ui.mixin.PendingElement );

	sd.CaptionsPanel.prototype.readDataFromReadOnlyRow = function ( $row ) {
		var $language = $row.find( '.wbmi-language-label' ),
			$caption = $row.find( '.wbmi-caption-value' );
		return new sd.CaptionData(
			$language.attr( 'lang' ),
			$caption.hasClass( 'wbmi-entityview-emptyCaption' ) ? '' : $caption.text()
		);
	};

	sd.CaptionsPanel.prototype.getDataForLangCode = function ( languageCode ) {
		var captionData = new sd.CaptionData( languageCode, '' );
		if ( this.captionsData[ languageCode ] !== undefined ) {
			captionData = this.captionsData[ languageCode ];
		}
		return captionData;
	};

	sd.CaptionsPanel.prototype.dataExistsForLangCode = function ( languageCode ) {
		var data = this.getDataForLangCode( languageCode );
		if ( data.text !== '' ) {
			return true;
		}
		return false;
	};

	sd.CaptionsPanel.prototype.createCaptionRow = function (
		index, languageCode, direction, languageContent, captionContent, showCaption
	) {
		var language, caption, row, rowClasses;

		language = new OO.ui.Element( {
			content: [ languageContent ],
			classes: [ 'wbmi-language-label' ]
		} );
		caption = new OO.ui.Element( {
			content: [ captionContent ],
			classes: [ 'wbmi-caption-value' ]
		} );

		if ( languageCode !== '' ) {
			language.$element.attr( 'lang', languageCode );
			caption.$element.attr( 'lang', languageCode );
		}
		if ( direction !== '' ) {
			language.$element.attr( 'dir', direction );
			caption.$element.attr( 'dir', direction );
		}

		if ( captionContent === '' ) {
			caption.$element.addClass( 'wbmi-entityview-emptyCaption' );
			caption.$element.text( mw.message( 'wikibasemediainfo-filepage-caption-empty' ).text() );
		}

		rowClasses = [ this.config.entityTermClass ];
		if ( showCaption ) {
			rowClasses.push( 'wbmi-entityview-showLabel' );
		}
		row = new OO.ui.HorizontalLayout( {
			items: [ language, caption ],
			classes: rowClasses
		} );
		row.$element.attr( 'data-index', index );
		return row.$element;
	};

	sd.CaptionsPanel.prototype.createIndexedReadOnlyRow = function (
		index,
		captionData,
		showCaption
	) {
		return this.createCaptionRow(
			index,
			mw.html.escape( captionData.languageCode ),
			mw.html.escape( captionData.direction ),
			mw.html.escape( captionData.languageText ),
			captionData.text,
			showCaption
		);
	};

	sd.CaptionsPanel.prototype.refreshRowIndices = function () {
		$( this.contentSelector ).find( this.entityTermSelector ).each( function ( index ) {
			$( this ).attr( 'data-index', index );
		} );
	};

	/**
	 * Should only be called on initialisation, because it relies on only the interface language
	 * (and possible the first fallback, if the interface language has no caption) having the
	 * 'wbmi-entityview-showLabel' class
	 */
	sd.CaptionsPanel.prototype.addCaptionsDataForUserLanguages = function () {
		var self = this,
			captionsOrderHasChanged = false;

		// Create CaptionData objects for user languages that we don't already have on the screen
		this.userLanguages.forEach( function ( langCode ) {
			if (
				Object.prototype.hasOwnProperty.call( self.captionsData, langCode ) === false
			) {
				var caption = new sd.CaptionData( langCode, '' );
				self.captionsData[ langCode ] = caption;
			}
		} );

		captionsOrderHasChanged = this.reorderLanguageList();
		if ( captionsOrderHasChanged ) {
			this.redrawCaptionsContent();
		}
		this.refreshRowIndices();
	};

	/**
	 * Create a re-arranged list of languages, based on the rules specified in the class
	 * comments
	 *
	 * Should only be called on initialisation, because it relies on only the interface language
	 * (and possible the first fallback, if the interface language has no caption) having the
	 * 'wbmi-entityview-showLabel' class
	 *
	 * @return bool True if the language list order has changed
	 */
	sd.CaptionsPanel.prototype.reorderLanguageList = function () {
		var captionLanguages = this.getCaptionLanguagesList(),
			// eslint-disable-next-line no-jquery/no-global-selector
			$visibleLanguageNodes = $( '.wbmi-entityview-showLabel .wbmi-language-label' ),
			rearrangedCaptionLanguages = [];

		$visibleLanguageNodes.each( function () {
			rearrangedCaptionLanguages.push( $( this ).attr( 'lang' ) );
		} );
		this.userLanguages.forEach( function ( langCode ) {
			if ( rearrangedCaptionLanguages.indexOf( langCode ) === -1 ) {
				rearrangedCaptionLanguages.push( langCode );
			}
		} );
		captionLanguages.forEach( function ( langCode ) {
			if ( rearrangedCaptionLanguages.indexOf( langCode ) === -1 ) {
				rearrangedCaptionLanguages.push( langCode );
			}
		} );
		// Save the re-arranged list in the DOM
		this.setCaptionLanguagesList( rearrangedCaptionLanguages );
		if ( rearrangedCaptionLanguages !== captionLanguages ) {
			return true;
		}
		return false;
	};

	sd.CaptionsPanel.prototype.getCaptionLanguagesList = function () {
		var knownLanguages = Object.keys( $.uls.data.languages );

		return $( this.contentSelector ).attr( this.captionLanguagesDataAttr ).split( ',' )
			// Drop languages that ULS doesn't know about
			.filter( function ( languageCode ) {
				return ( knownLanguages.indexOf( languageCode ) !== -1 );
			} );
	};

	sd.CaptionsPanel.prototype.setCaptionLanguagesList = function ( languagesList ) {
		return $( this.contentSelector ).attr(
			this.captionLanguagesDataAttr,
			languagesList.join( ',' )
		);
	};

	sd.CaptionsPanel.prototype.getAvailableLanguages = function (
		excludeLanguages, includeLanguage
	) {
		var languages = {};
		$.extend( languages, mw.config.get( 'wgULSLanguages' ) );
		( excludeLanguages || [] ).forEach( function ( languageCode ) {
			if ( languageCode !== includeLanguage ) {
				delete languages[ languageCode ];
			}
		} );
		return languages;
	};

	sd.CaptionsPanel.prototype.refreshLanguageSelectorsOptions = function () {
		var captionsPanel = this,
			currentlySelectedLanguages = [];

		this.languageSelectors.forEach( function ( languageSelector ) {
			currentlySelectedLanguages.push( languageSelector.getValue() );
		} );
		this.languageSelectors.forEach( function ( languageSelector ) {
			languageSelector.updateLanguages(
				captionsPanel.getAvailableLanguages(
					currentlySelectedLanguages,
					languageSelector.getValue()
				)
			);
		} );
	};

	sd.CaptionsPanel.prototype.warnIfTextApproachingLimit = function ( textInput ) {
		var $caption = textInput.$element.parents( '.wbmi-caption-value' ),
			lengthDiff = mw.config.get( 'maxCaptionLength' ) - textInput.getValue().length;
		$caption.find( 'div.wbmi-caption-publishWarning' ).remove();
		if ( lengthDiff >= 0 && lengthDiff < this.config.warnWithinMaxCaptionLength ) {
			$caption.append(
				$( '<div>' )
					.addClass( 'wbmi-caption-publishWarning' )
					.text(
						mw.message(
							'wikibasemediainfo-filepage-caption-approaching-limit',
							lengthDiff
						).text()
					)
			);
		}
	};

	sd.CaptionsPanel.prototype.doTextInputChecks = function () {
		var textInputChecks = [];
		this.textInputs.forEach( function ( textInput ) {
			textInputChecks.push(
				textInput.getValidity()
					.done( function () {
						textInput.$element.parents( '.wbmi-caption-value' ).find( 'div.wbmi-caption-publishError' ).remove();
					} )
					.fail( function () {
						var $caption = textInput.$element.parents( '.wbmi-caption-value' );
						$caption.find( 'div.wbmi-caption-publishWarning' ).remove();
						$caption.find( 'div.wbmi-caption-publishError' ).remove();
						$caption.append(
							$( '<div>' )
								.addClass( 'wbmi-caption-publishError' )
								.text(
									mw.message(
										'wikibasemediainfo-filepage-caption-too-long',
										textInput.getValue().length - mw.config.get( 'maxCaptionLength' )
									).text()
								)
						);
					} )
			);
		} );
		return textInputChecks;
	};

	// TODO: Re-write to be simpler and merge in doTextInputChecks (which is only called by this)?
	sd.CaptionsPanel.prototype.refreshPublishState = function () {
		var captionsPanel = this,
			checks = this.doTextInputChecks();

		checks.push( this.licenseAcceptance );

		// disable publishing first, and only re-enable if/once all checks have cleared
		$.when.apply( null, checks )
			.then( function () {
				var $captions = $( captionsPanel.contentSelector ).find( captionsPanel.entityTermSelector ),
					hasChanges = $captions.length < Object.keys( captionsPanel.captionsData ).length;

				$captions.each( function () {
					var index = $( this ).attr( 'data-index' ),
						languageCode = captionsPanel.languageSelectors[ index ].getValue(),
						text = captionsPanel.textInputs[ index ].getValue(),
						existingDataForLanguage = captionsPanel.getDataForLangCode( languageCode );

					// Ignore rows where no language code has been selected
					if ( languageCode !== undefined && existingDataForLanguage.text !== text ) {
						hasChanges = true;
					}
				} );

				if ( !hasChanges ) {
					return $.Deferred().reject().promise();
				}
			} )
			.then(
				captionsPanel.editActionsWidget.enablePublish.bind( captionsPanel.editActionsWidget ),
				captionsPanel.editActionsWidget.disablePublish.bind( captionsPanel.editActionsWidget )
			);
	};

	sd.CaptionsPanel.prototype.createRowDeleter = function ( $row ) {
		var captionsPanel = this,
			deleter = new OO.ui.ButtonWidget( {
				icon: 'trash',
				framed: false,
				flags: 'destructive',
				classes: [ 'wbmi-caption-deleteButton' ]
			} );

		deleter.$element.on( 'click', function () {
			captionsPanel.languageSelectors.splice(
				$row.attr( 'data-index' ),
				1
			);
			captionsPanel.textInputs.splice(
				$row.attr( 'data-index' ),
				1
			);
			$row.remove();
			captionsPanel.refreshRowIndices();
			captionsPanel.refreshLanguageSelectorsOptions();
			captionsPanel.refreshPublishState();
		} );
		return deleter;
	};

	sd.CaptionsPanel.prototype.createIndexedEditableRow = function (
		index, captionLangCodes, captionData
	) {
		var captionsPanel = this,
			languageSelector,
			textInput,
			$row;

		if ( captionData === undefined ) {
			captionData = new sd.CaptionData();
		}

		languageSelector = new sd.UlsWidget( {
			languages: this.getAvailableLanguages( captionLangCodes, captionData.languageCode )
		} );
		if ( captionData.languageCode !== '' ) {
			languageSelector.setValue( captionData.languageCode );
		}
		languageSelector.on( 'select', function () {
			var dir,
				$parentRow;
			captionsPanel.refreshLanguageSelectorsOptions();
			dir = $.uls.data.getDir( languageSelector.getValue() );
			$parentRow = languageSelector.$element.parents( captionsPanel.entityTermSelector );
			$parentRow.find( '.wbmi-language-label' ).attr( 'dir', dir );
			$parentRow.find( '.wbmi-caption-value' ).attr( 'dir', dir );
			$parentRow.find( '.wbmi-caption-textInput' ).attr( 'dir', dir );
			captionsPanel.refreshPublishState();
		} );
		this.languageSelectors[ index ] = languageSelector;

		textInput = new OO.ui.TextInputWidget( {
			validate: function ( value ) {
				return value.length <= mw.config.get( 'maxCaptionLength' );
			},
			value: captionData.text,
			dir: captionData.direction,
			placeholder: captionData.text === '' ? mw.message( 'wikibasemediainfo-filepage-caption-empty' ).text() : '',
			classes: [ 'wbmi-caption-textInput' ]
		} );
		textInput.on( 'change', function () {
			captionsPanel.warnIfTextApproachingLimit( textInput );
			captionsPanel.refreshPublishState();
		} );
		textInput.on( 'enter', function () {
			captionsPanel.sendData();
		} );
		this.textInputs[ index ] = textInput;

		$row = this.createCaptionRow(
			index,
			mw.html.escape( captionData.languageCode ),
			mw.html.escape( captionData.direction ),
			this.languageSelectors[ index ].$element,
			this.textInputs[ index ].$element,
			false
		);
		$row.find( '.wbmi-caption-value' )
			.append( this.createRowDeleter( $row ).$element );
		return $row;
	};

	sd.CaptionsPanel.prototype.findRemovedLanguages = function () {
		var captionsPanel = this,
			langCodesWithoutData = [];

		// eslint-disable-next-line no-jquery/no-each-util
		$.each( this.captionsData, function ( i, captionData ) {
			var langCodeHasData = false;
			captionsPanel.languageSelectors.forEach( function ( languageSelector ) {
				if ( languageSelector.getValue() === captionData.languageCode ) {
					langCodeHasData = true;
					return false;
				}
			} );
			if ( langCodeHasData === false && captionData.text !== '' ) {
				langCodesWithoutData.push( captionData.languageCode );
			}
		} );
		return langCodesWithoutData;
	};

	sd.CaptionsPanel.prototype.disableAllFormInputs = function () {
		this.languageSelectors.forEach( function ( languageSelector ) {
			languageSelector.setDisabled( true );
		} );
		this.textInputs.forEach( function ( textInput ) {
			textInput.setDisabled( true );
			textInput.$element.parents( '.wbmi-caption-value' ).find( '.wbmi-caption-deleteButton' ).hide();
		} );
	};

	sd.CaptionsPanel.prototype.enableAllFormInputs = function () {
		this.languageSelectors.forEach( function ( languageSelector ) {
			languageSelector.setDisabled( false );
		} );
		this.textInputs.forEach( function ( textInput ) {
			textInput.setDisabled( false );
			textInput.$element.parents( '.wbmi-caption-value' ).find( '.wbmi-caption-deleteButton' ).show();
		} );
	};

	/**
	 * Get a value object for sending data to the api
	 *
	 * @param language
	 * @param text
	 * @returns {{bot: number, action: string, id, value: *, language: *}}
	 */
	sd.CaptionsPanel.prototype.getWbSetLabelParams = function ( language, text ) {
		var apiParams = {
			/*
			 * Unconditionally set the bot parameter to match the UI behavior of core.
			 * In normal page editing, if you have the "bot" user right and edit through the GUI
			 * interface, your edit is marked as bot no matter what.
			 * @see https://gerrit.wikimedia.org/r/71246
			 * @see https://phabricator.wikimedia.org/T189477
			 */
			bot: 1,
			action: 'wbsetlabel',
			id: mw.config.get( 'wbEntityId' ),
			value: text,
			language: language
		};
		if ( this.captionsExist === true ) {
			apiParams.baserevid = sd.currentRevision;
		}
		return apiParams;
	};

	sd.CaptionsPanel.prototype.sendIndividualLabel = function ( index, language, text ) {
		var captionsPanel = this,
			deferred = $.Deferred();

		this.api.postWithToken(
			'csrf',
			this.getWbSetLabelParams( language, text )
		)
			.done( function ( result ) {
				var showCaptionFlags = captionsPanel.getShowCaptionFlagsByLangCode(),
					captionLanguages = captionsPanel.getCaptionLanguagesList();
				captionsPanel.captionsExist = true;
				captionsPanel.captionsData[ language ] = new sd.CaptionData( language, text );
				sd.currentRevision = result.entity.lastrevid;
				captionsPanel.languageSelectors.splice( index, 1 );
				captionsPanel.textInputs.splice( index, 1 );
				$( captionsPanel.contentSelector )
					.find( captionsPanel.entityTermSelector + '[data-index="' + index + '"]' )
					.replaceWith(
						captionsPanel.createIndexedReadOnlyRow(
							index,
							captionsPanel.captionsData[ language ],
							showCaptionFlags[ language ]
						)
					);
				if ( captionLanguages.indexOf( language ) === -1 ) {
					captionLanguages.push( language );
					captionsPanel.setCaptionLanguagesList( captionLanguages );
				}
				deferred.resolve();
			} )
			.fail( function ( errorCode, error ) {
				var rejection = wb.api.RepoApiError.newFromApiResponse( error, 'save' );

				rejection.index = index;
				deferred.reject( rejection );
			} );
		return deferred.promise();
	};

	sd.CaptionsPanel.prototype.sendDataToAPI = function ( chain ) {
		var captionsPanel = this,
			rowsWithoutLanguage = [];

		$( this.contentSelector ).find( this.entityTermSelector ).each( function () {
			var index = $( this ).attr( 'data-index' ),
				languageCode = captionsPanel.languageSelectors[ index ].getValue(),
				text = captionsPanel.textInputs[ index ].getValue(),
				existingDataForLanguage = captionsPanel.getDataForLangCode( languageCode );

			// Ignore rows where no language code has been selected
			if ( languageCode === undefined ) {
				rowsWithoutLanguage.push( $( captionsPanel ) );
				return true;
			}

			if ( existingDataForLanguage.text !== text ) {
				chain = chain.then( function () {
					return captionsPanel.sendIndividualLabel(
						index,
						languageCode,
						text
					);
				} );
			} else {
				var showCaptionFlags = captionsPanel.getShowCaptionFlagsByLangCode();
				$( this ).replaceWith(
					captionsPanel.createIndexedReadOnlyRow(
						index,
						existingDataForLanguage,
						showCaptionFlags[ languageCode ]
					)
				);
			}
		} );
		rowsWithoutLanguage.forEach( function ( row ) {
			row.remove();
		} );
		return chain;
	};

	sd.CaptionsPanel.prototype.deleteIndividualLabel = function ( langCodeToDelete ) {
		var self = this,
			deferred = $.Deferred(),
			$captionsContent = $( this.contentSelector );

		this.api.postWithToken(
			'csrf',
			this.getWbSetLabelParams( langCodeToDelete, '' )
		)
			.done( function ( result ) {
				var captionLanguages = self.getCaptionLanguagesList();

				// Update revision id
				sd.currentRevision = result.entity.lastrevid;

				// Update the captions data, and the language list if necessary
				if (
					captionLanguages[ 0 ] === langCodeToDelete ||
					self.userLanguages.indexOf( langCodeToDelete ) !== -1
				) {
					// Blank the data if the language is either the first in the language list
					// (i.e. it's the interface language) or it's one of the user's languages
					self.captionsData[ langCodeToDelete ].text = '';
				} else {
					// Otherwise delete the data
					delete self.captionsData[ langCodeToDelete ];
					// ... and delete the language from the language list
					var updatedCaptionLanguages = [];
					captionLanguages.forEach( function ( langCode ) {
						if ( langCode !== langCodeToDelete ) {
							updatedCaptionLanguages.push( langCode );
						}
					} );
					self.setCaptionLanguagesList( updatedCaptionLanguages );
				}

				deferred.resolve();
			} )
			.fail( function ( errorCode, error ) {
				// Display the old data for the language we've attempted and failed to delete
				var currentlyDisplayedLanguages = [],
					newIndex,
					errorRow,
					rejection;
				$captionsContent.find( this.entityTermSelector ).each( function () {
					var dataInRow = self.readDataFromReadOnlyRow( $( this ) );
					currentlyDisplayedLanguages.push( dataInRow.languageCode );
				} );
				newIndex = $captionsContent.find( this.entityTermSelector ).length;
				errorRow = self.createIndexedEditableRow(
					newIndex,
					currentlyDisplayedLanguages,
					self.captionsData[ langCodeToDelete ]
				);
				errorRow.insertBefore( $captionsContent.find( '.wbmi-entityview-editActions' ) );
				rejection = wb.api.RepoApiError.newFromApiResponse( error, 'save' );
				rejection.index = newIndex;
				deferred.reject( rejection );
			} );
		return deferred.promise();
	};

	sd.CaptionsPanel.prototype.deleteRemovedData = function ( chain, removedLanguages ) {
		var captionsPanel = this;

		removedLanguages.forEach( function ( languageCode ) {
			chain = chain.then( function () {
				return captionsPanel.deleteIndividualLabel(
					languageCode
				);
			} );
		} );
		return chain;
	};

	sd.CaptionsPanel.prototype.refreshDataFromApi = function () {
		var captionsPanel = this,
			deferred = $.Deferred(),
			entityId = mw.config.get( 'wbEntityId' );

		this.api
			.get( {
				action: 'wbgetentities',
				props: 'info|labels',
				ids: entityId
			} )
			.done( function ( result ) {
				var refreshedLabelsData = {};
				sd.currentRevision = result.entities[ entityId ].lastrevid;
				// Add any empty CaptionData objects to the list first, as they won't be returned
				// from the api
				// eslint-disable-next-line no-jquery/no-each-util
				$.each( captionsPanel.captionsData, function ( index, captionData ) {
					if ( captionData.text === '' ) {
						refreshedLabelsData[ captionData.languageCode ] = captionData;
					}
				} );
				// eslint-disable-next-line no-jquery/no-each-util
				$.each(
					result.entities[ entityId ].labels,
					function ( languageCode, labelObject ) {
						refreshedLabelsData[ languageCode ] = new sd.CaptionData(
							languageCode,
							labelObject.value
						);
					}
				);
				captionsPanel.captionsData = refreshedLabelsData;
				deferred.resolve();
			} )
			.fail( function () {
				// Ignore the failure and just make do with the data we already have
				deferred.reject();
			} );
		return deferred.promise();
	};

	sd.CaptionsPanel.prototype.redrawCaptionsContent = function () {
		var self = this,
			$captionsContent = $( this.contentSelector ),
			showCaptionFlags = this.getShowCaptionFlagsByLangCode(),
			count = 0,
			languageCodesInOrder = this.getCaptionLanguagesList();

		$captionsContent.find( this.entityTermSelector ).each( function () {
			$( this ).remove();
		} );

		languageCodesInOrder.forEach( function ( langCode ) {
			var captionData = self.captionsData[ langCode ];
			$captionsContent.append(
				self.createIndexedReadOnlyRow(
					count,
					captionData,
					showCaptionFlags[ captionData.languageCode ]
				)
			);
			count++;
		} );
		this.languagesViewWidget.refreshLabel();
	};

	/**
	 * Returns an array of showCaption flags for each element of labelsData, indexed by langCode
	 *
	 * See class comments for rules on when to show/hide captions
	 *
	 */
	sd.CaptionsPanel.prototype.getShowCaptionFlagsByLangCode = function () {
		var self = this,
			captionLanguages = this.getCaptionLanguagesList(),
			firstCaptionIsBlank,
			indexedShowCaptionFlags = {};

		captionLanguages.forEach( function ( langCode, index ) {
			var captionData = self.captionsData[ langCode ],
				showCaption;
			if ( index === 0 ) {
				showCaption = true;
				firstCaptionIsBlank = ( captionData.text === '' );
			} else if (
				index === 1 &&
				firstCaptionIsBlank &&
				captionData.text !== ''
			) {
				showCaption = true;
			} else {
				if ( self.userLanguages.indexOf( langCode ) === -1 ) {
					showCaption = false;
				} else {
					showCaption = true;
				}
			}
			indexedShowCaptionFlags[ langCode ] = showCaption;
		} );
		return indexedShowCaptionFlags;
	};

	sd.CaptionsPanel.prototype.makeEditable = function () {
		var captionsPanel = this;

		this.refreshPublishState();

		// show dialog informing user of licensing & store the returned promise
		// in licenseAcceptance - submit won't be possible until dialog is closed
		this.licenseAcceptance =
			this.licenseDialogWidget.getConfirmationIfNecessary().always(
				captionsPanel.refreshPublishState.bind( captionsPanel )
			);

		// Set the target pending element to the layout box
		this.$pending = $( '.' + this.config.headerClass ).parent();
		this.pushPending();

		this.refreshDataFromApi()
			.always( function () {
				captionsPanel.redrawCaptionsContent();
				var $captionsContent = $( captionsPanel.contentSelector );
				$captionsContent.addClass( 'wbmi-entityview-editable' );
				captionsPanel.editToggle.$element.hide();
				captionsPanel.languagesViewWidget.hide();
				captionsPanel.editActionsWidget.show();
				captionsPanel.refreshPublishState();
				var captionLangCodes = [];
				$captionsContent.find( captionsPanel.entityTermSelector ).each( function () {
					var dataInRow = captionsPanel.readDataFromReadOnlyRow( $( this ) );
					captionLangCodes.push( dataInRow.languageCode );
				} );
				$captionsContent.find( captionsPanel.entityTermSelector ).each( function ( index ) {
					var captionData = captionsPanel.readDataFromReadOnlyRow( $( this ) );

					$( this ).replaceWith(
						captionsPanel.createIndexedEditableRow(
							index,
							captionLangCodes,
							captionData
						)
					);
				} );
				captionsPanel.popPending();
			} );
	};

	sd.CaptionsPanel.prototype.makeReadOnly = function () {
		var $captionsContent = $( this.contentSelector );
		$captionsContent.removeClass( 'wbmi-entityview-editable' );
		this.editActionsWidget.hide();
		this.redrawCaptionsContent();
		this.languagesViewWidget.expand();
		this.editToggle.$element.show();
	};

	sd.CaptionsPanel.prototype.addNewEditableLanguageRow = function () {
		var $captionsContent = $( this.contentSelector );
		var row = this.createIndexedEditableRow(
			$captionsContent.find( this.entityTermSelector ).length
		);
		row.insertBefore( $captionsContent.find( '.wbmi-entityview-editActions' ) );
		this.refreshLanguageSelectorsOptions();
		this.refreshPublishState();
	};

	sd.CaptionsPanel.prototype.sendData = function () {
		var captionsPanel = this,
			chain = $.Deferred().resolve().promise(),
			removedLanguages = this.findRemovedLanguages(),
			self = this;

		this.editActionsWidget.setStateSending();
		this.disableAllFormInputs();

		chain = this.sendDataToAPI( chain );
		chain = this.deleteRemovedData( chain, removedLanguages );
		chain
			.then( function () {
				self.makeReadOnly();
			} )
			.catch( function ( error ) {
				var $caption;
				captionsPanel.enableAllFormInputs();
				$caption =
					$( captionsPanel.contentSelector ).find(
						captionsPanel.entityTermSelector + '[data-index="' + error.index + '"] .wbmi-caption-value'
					);
				$caption.find( 'div.wbmi-caption-publishError' ).remove();
				$caption.find( 'div.wbmi-caption-publishWarning' ).remove();
				$caption.append(
					$( '<div>' )
						.addClass( 'wbmi-caption-publishError' )
						.html( error.detailedMessage )
				);
			} )
			.always( function () {
				captionsPanel.editActionsWidget.setStateReady();
			} );
	};

	sd.CaptionsPanel.prototype.initialize = function () {
		var captionsPanel = this;

		// Only allow editing if we're NOT on a diff page or viewing an older revision
		// eslint-disable-next-line no-jquery/no-global-selector
		if ( $( '.diff' ).length === 0 && $( '.mw-revision' ).length === 0 ) {
			$( '.' + this.config.headerClass ).append( this.editToggle.$element );
		}

		$( this.contentSelector ).find( this.entityTermSelector ).each( function ( index ) {
			var captionData;
			$( this ).attr( 'data-index', index );
			captionData = captionsPanel.readDataFromReadOnlyRow( $( this ) );
			captionsPanel.captionsData[ captionData.languageCode ] = captionData;
		} );
		this.addCaptionsDataForUserLanguages();
		this.languagesViewWidget.refreshLabel();
		this.languagesViewWidget.collapse();
	};

}( mw.mediaInfo.structuredData, wikibase ) );
