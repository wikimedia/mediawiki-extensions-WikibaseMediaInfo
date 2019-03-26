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
		var self = this,
			currentlySelectedLanguages = [];

		this.languageSelectors.forEach( function ( languageSelector ) {
			currentlySelectedLanguages.push( languageSelector.getValue() );
		} );
		this.languageSelectors.forEach( function ( languageSelector ) {
			languageSelector.updateLanguages(
				self.getAvailableLanguages(
					currentlySelectedLanguages,
					languageSelector.getValue()
				)
			);
		} );
	};

	/**
	 * Update DOM with errors on text input  - connected to text input 'change' events
	 *
	 *  @param {string} textInput caption text
	 */
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

	/**
	 * Runs validity checks on captions text and returns functions for updating DOM
	 *
	 * @returns {Array<Promise>} show/hide error messages when resolved
	 */
	sd.CaptionsPanel.prototype.validateCaptionsAndReturnUpdates = function () {
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

	/**
	 * Check for changes to caption text by language or number of captions
	 * @return bool
	*/
	sd.CaptionsPanel.prototype.hasChanges = function () {
		var self = this,
			$captions = $( self.contentSelector ).find( self.entityTermSelector ),
			hasChanges = $captions.length < Object.keys( self.captionsData ).length;

		$captions.each( function () {
			var index = $( this ).attr( 'data-index' ),
				languageCode = self.languageSelectors[ index ].getValue(),
				text = self.textInputs[ index ].getValue(),
				existingDataForLanguage = self.getDataForLangCode( languageCode );

			if ( languageCode !== undefined && existingDataForLanguage.text !== text ) {
				hasChanges = true;
			}
		} );

		return hasChanges;
	};

	/**
	 * Enable/Disable publish button based on presence of captions changes
	 */
	sd.CaptionsPanel.prototype.refreshPublishState = function () {
		var self = this,
			hasChanges = self.hasChanges();

		if ( hasChanges ) {
			self.editActionsWidget.enablePublish();
		} else {
			self.editActionsWidget.disablePublish();
		}
	};

	/**
	 * Apply validations and refresh publish button - connected to text input 'change' events
	 */
	sd.CaptionsPanel.prototype.onCaptionsChange = function () {
		var self = this,
			validations = self.validateCaptionsAndReturnUpdates(); // This is an array of promises

		$.when.apply( null, validations )
			.then( function () {
				self.refreshPublishState();
			} )
			.catch( function () {
				self.editActionsWidget.disablePublish();
			} );
	};

	sd.CaptionsPanel.prototype.createRowDeleter = function ( $row ) {
		var self = this,
			deleter = new OO.ui.ButtonWidget( {
				icon: 'trash',
				framed: false,
				flags: 'destructive',
				classes: [ 'wbmi-caption-deleteButton' ]
			} );

		deleter.$element.on( 'click', function () {
			self.languageSelectors.splice(
				$row.attr( 'data-index' ),
				1
			);
			self.textInputs.splice(
				$row.attr( 'data-index' ),
				1
			);
			$row.remove();
			self.refreshRowIndices();
			self.refreshLanguageSelectorsOptions();
			self.refreshPublishState();
		} );
		return deleter;
	};

	sd.CaptionsPanel.prototype.createIndexedEditableRow = function (
		index, captionLangCodes, captionData
	) {
		var self = this,
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
			self.refreshLanguageSelectorsOptions();
			dir = $.uls.data.getDir( languageSelector.getValue() );
			$parentRow = languageSelector.$element.parents( self.entityTermSelector );
			$parentRow.find( '.wbmi-language-label' ).attr( 'dir', dir );
			$parentRow.find( '.wbmi-caption-value' ).attr( 'dir', dir );
			$parentRow.find( '.wbmi-caption-textInput' ).attr( 'dir', dir );
			self.refreshPublishState();
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

		textInput.connect( this, {
			change: [ 'onCaptionsChange', 'warnIfTextApproachingLimit' ],
			enter: 'sendData'
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
		var self = this,
			langCodesWithoutData = [];

		// eslint-disable-next-line no-jquery/no-each-util
		$.each( this.captionsData, function ( i, captionData ) {
			var langCodeHasData = false;
			self.languageSelectors.forEach( function ( languageSelector ) {
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
		var self = this;
		this.languageSelectors.forEach( function ( languageSelector ) {
			languageSelector.setDisabled( true );
		} );
		this.textInputs.forEach( function ( textInput ) {
			textInput.disconnect( self, { change: 'onCaptionsChange' } );
			textInput.setDisabled( true );
			textInput.$element.parents( '.wbmi-caption-value' ).find( '.wbmi-caption-deleteButton' ).hide();
		} );
	};

	sd.CaptionsPanel.prototype.enableAllFormInputs = function () {
		var self = this;

		this.languageSelectors.forEach( function ( languageSelector ) {
			languageSelector.setDisabled( false );
		} );
		this.textInputs.forEach( function ( textInput ) {
			textInput.setDisabled( false );
			textInput.$element.parents( '.wbmi-caption-value' ).find( '.wbmi-caption-deleteButton' ).show();
			textInput.connect( self, { change: 'onCaptionsChange' } );
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
		var self = this,
			textInput = self.textInputs[ index ],
			deferred = $.Deferred();

		textInput.disconnect( self, { change: 'onCaptionsChange' } );
		self.api.postWithToken(
			'csrf',
			self.getWbSetLabelParams( language, text )
		)
			.done( function ( result ) {
				var showCaptionFlags = self.getShowCaptionFlagsByLangCode(),
					captionLanguages = self.getCaptionLanguagesList();
				self.captionsExist = true;
				self.captionsData[ language ] = new sd.CaptionData( language, text );
				sd.currentRevision = result.entity.lastrevid;
				self.languageSelectors.splice( index, 1 );
				self.textInputs.splice( index, 1 );
				$( self.contentSelector )
					.find( self.entityTermSelector + '[data-index="' + index + '"]' )
					.replaceWith(
						self.createIndexedReadOnlyRow(
							index,
							self.captionsData[ language ],
							showCaptionFlags[ language ]
						)
					);
				if ( captionLanguages.indexOf( language ) === -1 ) {
					captionLanguages.push( language );
					self.setCaptionLanguagesList( captionLanguages );
				}
				textInput.connect( self, { change: 'onCaptionsChange' } );
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
		var self = this,
			rowsWithoutLanguage = [];

		$( this.contentSelector ).find( this.entityTermSelector ).each( function () {
			var index = $( this ).attr( 'data-index' ),
				languageCode = self.languageSelectors[ index ].getValue(),
				text = self.textInputs[ index ].getValue(),
				existingDataForLanguage = self.getDataForLangCode( languageCode );

			// Ignore rows where no language code has been selected
			if ( languageCode === undefined ) {
				rowsWithoutLanguage.push( $( self ) );
				return true;
			}

			if ( existingDataForLanguage.text !== text ) {
				chain = chain.then( function () {
					return self.sendIndividualLabel(
						index,
						languageCode,
						text
					);
				} );
			} else {
				var showCaptionFlags = self.getShowCaptionFlagsByLangCode();
				$( this ).replaceWith(
					self.createIndexedReadOnlyRow(
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
				self.editActionsWidget.disablePublish();
				deferred.reject( rejection );
			} );
		return deferred.promise();
	};

	sd.CaptionsPanel.prototype.deleteRemovedData = function ( chain, removedLanguages ) {
		var self = this;

		removedLanguages.forEach( function ( languageCode ) {
			chain = chain.then( function () {
				return self.deleteIndividualLabel(
					languageCode
				);
			} );
		} );
		return chain;
	};

	sd.CaptionsPanel.prototype.refreshDataFromApi = function () {
		var self = this,
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
				$.each( self.captionsData, function ( index, captionData ) {
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
				self.captionsData = refreshedLabelsData;
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
		var self = this;

		if ( mw.user.isAnon() ) {
			var msg = mw.message( 'anoneditwarning' );
			mw.notify( msg, {
				autoHide: false,
				type: 'warn',
				tag: 'wikibasemediainfo-anonymous-edit-warning'
			} );
		}

		// show dialog informing user of licensing
		self.licenseDialogWidget.getConfirmationIfNecessary().then( function () {
		// Set the target pending element to the layout box
			self.$pending = $( '.' + self.config.headerClass ).parent();
			self.pushPending();

			self.refreshDataFromApi()
				.always( function () {
					self.redrawCaptionsContent();
					var $captionsContent = $( self.contentSelector );
					$captionsContent.addClass( 'wbmi-entityview-editable' );
					self.editToggle.$element.hide();
					self.languagesViewWidget.hide();
					self.editActionsWidget.show();
					self.editActionsWidget.disablePublish();
					var captionLangCodes = [];
					$captionsContent.find( self.entityTermSelector ).each( function () {
						var dataInRow = self.readDataFromReadOnlyRow( $( this ) );
						captionLangCodes.push( dataInRow.languageCode );
					} );
					$captionsContent.find( self.entityTermSelector ).each( function ( index ) {
						var captionData = self.readDataFromReadOnlyRow( $( this ) );

						$( this ).replaceWith(
							self.createIndexedEditableRow(
								index,
								captionLangCodes,
								captionData
							)
						);
					} );
					self.popPending();
				} );
		} );
	};

	sd.CaptionsPanel.prototype.makeReadOnly = function () {
		var self = this,
			hasChanges = self.hasChanges(),
			allowCloseWindow = mw.confirmCloseWindow( {
				message: mw.message( 'wikibasemediainfo-filepage-cancel-confirm' ).text(),
				test: function () { return hasChanges; }
			} );

		var closeWindowConfirmed = allowCloseWindow.trigger();

		if ( closeWindowConfirmed ) {
			var $captionsContent = $( self.contentSelector );
			$captionsContent.removeClass( 'wbmi-entityview-editable' );
			self.editActionsWidget.hide();
			self.redrawCaptionsContent();
			self.languagesViewWidget.expand();
			self.editToggle.$element.show();
		}

	};

	sd.CaptionsPanel.prototype.addNewEditableLanguageRow = function () {
		var $captionsContent = $( this.contentSelector );
		var row = this.createIndexedEditableRow(
			$captionsContent.find( this.entityTermSelector ).length
		);
		row.insertBefore( $captionsContent.find( '.wbmi-entityview-editActions' ) );
		this.refreshLanguageSelectorsOptions();
	};

	sd.CaptionsPanel.prototype.sendData = function () {
		var chain = $.Deferred().resolve().promise(),
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
				self.enableAllFormInputs();
				$caption =
					$( self.contentSelector ).find(
						self.entityTermSelector + '[data-index="' + error.index + '"] .wbmi-caption-value'
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
				self.editActionsWidget.setStateReady();
			} );
	};

	sd.CaptionsPanel.prototype.initialize = function () {
		var self = this;

		// Only allow editing if we're NOT on a diff page or viewing an older revision
		// eslint-disable-next-line no-jquery/no-global-selector
		if ( $( '.diff' ).length === 0 && $( '.mw-revision' ).length === 0 ) {
			$( '.' + this.config.headerClass ).append( this.editToggle.$element );
		}

		$( this.contentSelector ).find( this.entityTermSelector ).each( function ( index ) {
			var captionData;
			$( this ).attr( 'data-index', index );
			captionData = self.readDataFromReadOnlyRow( $( this ) );
			self.captionsData[ captionData.languageCode ] = captionData;
		} );
		this.addCaptionsDataForUserLanguages();
		this.languagesViewWidget.refreshLabel();
		this.languagesViewWidget.collapse();
	};

}( mw.mediaInfo.structuredData, wikibase ) );
