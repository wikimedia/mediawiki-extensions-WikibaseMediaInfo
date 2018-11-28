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
	 * @cfg {Object} header jquery element containing the panel header
	 * @cfg {Object} table jquery table element containing the existing data
	 * @cfg {int} warnWithinMaxCaptionLength Show a warning when the caption length is within X
	 *   characters of the max
	 */
	sd.CaptionsPanel = function CaptionsPanel( config ) {
		var self = this;
		this.config = config || {};

		// Parent constructor
		sd.CaptionsPanel.super.apply( this, arguments );

		// Mixin constructors
		OO.ui.mixin.PendingElement.call( this, this.config );

		this.currentRevision = mw.config.get( 'wbCurrentRevision' );
		this.languages = mw.config.get( 'wbTermsLanguages' );
		this.captionsData = {};
		this.languageSelectors = [];
		this.textInputs = [];
		this.editToggle = new sd.EditToggle( this.config, this );
		this.languagesViewWidget = new sd.LanguagesViewWidget( this.config );
		this.editActionsWidget = new sd.EditActionsWidget( config, this );
		this.api = wb.api.getLocationAgnosticMwApi( mw.config.get( 'wbRepoApiUrl' ) );
		this.tableSelector = '.' + this.config.tableClass;
		this.captionLanguagesDataAttr = 'data-label-languages';

		this.userLanguages = [];
		$.each( mw.config.get( 'wbUserSpecifiedLanguages' ), function ( index, langCode ) {
			self.userLanguages.push( langCode );
		} );
	};

	/* Inheritance */
	OO.inheritClass( sd.CaptionsPanel, OO.ui.Element );
	OO.mixinClass( sd.CaptionsPanel, OO.ui.mixin.PendingElement );

	sd.CaptionsPanel.prototype.readDataFromReadOnlyRow = function ( $tableRow ) {
		var $languageTD = $tableRow.find( 'td.language' ),
			$captionTD = $tableRow.find( 'td.caption' );
		return new sd.CaptionData(
			$languageTD.attr( 'lang' ),
			$languageTD.text(),
			$languageTD.attr( 'dir' ),
			$captionTD.hasClass( 'wbmi-empty' ) ? '' : $captionTD.text()
		);
	};

	sd.CaptionsPanel.prototype.getDataForLangCode = function ( languageCode ) {
		var captionData = new sd.CaptionData(
			languageCode,
			this.languages[ languageCode ],
			$.uls.data.getDir( languageCode ),
			''
		);
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

	sd.CaptionsPanel.prototype.createTableRow = function (
		index, languageCode, direction, languageContent, captionContent, showCaption
	) {
		var $languageTD = $( '<td>' )
			.addClass( 'language' )
			.append( languageContent );
		var $captionTD = $( '<td>' )
			.addClass( 'caption' )
			.append( captionContent );
		if ( languageCode !== '' ) {
			$languageTD.attr( 'lang', languageCode );
			$captionTD.attr( 'lang', languageCode );
		}
		if ( direction !== '' ) {
			$languageTD.attr( 'dir', direction );
			$captionTD.attr( 'dir', direction );
		}

		if ( captionContent === '' ) {
			$captionTD.addClass( 'wbmi-empty' );
			$captionTD.text( mw.message( 'wikibasemediainfo-filepage-caption-empty' ).text() );
		}

		var $row = $( '<tr>' )
			.addClass( 'entity-terms' )
			.attr( 'data-index', index )
			.append( $languageTD, $captionTD );
		if ( showCaption ) {
			$row.addClass( 'showLabel' );
		}
		return $row;
	};

	sd.CaptionsPanel.prototype.createIndexedReadOnlyRow = function (
		index,
		captionData,
		showCaption
	) {
		return this.createTableRow(
			index,
			mw.html.escape( captionData.languageCode ),
			mw.html.escape( captionData.direction ),
			mw.html.escape( captionData.languageText ),
			mw.html.escape( captionData.text ),
			showCaption
		);
	};

	sd.CaptionsPanel.prototype.refreshTableRowIndices = function () {
		$( this.tableSelector ).find( 'tr.entity-terms' ).each( function ( index ) {
			$( this ).attr( 'data-index', index );
		} );
	};

	/**
	 * Should only be called on initialisation, because it relies on only the interface language
	 * (and possible the first fallback, if the interface language has no caption) having the
	 * 'showLabel' class
	 */
	sd.CaptionsPanel.prototype.addCaptionsDataForUserLanguages = function () {
		var self = this,
			captionsOrderHasChanged = false;

		// Create CaptionData objects for user languages that we don't already have on the screen
		this.userLanguages.forEach( function ( langCode ) {
			if (
				Object.prototype.hasOwnProperty.call( self.captionsData, langCode ) === false
			) {
				var caption = new sd.CaptionData(
					langCode,
					self.languages[ langCode ],
					$.uls.data.getDir( langCode ),
					''
				);
				self.captionsData[ langCode ] = caption;
			}
		} );

		captionsOrderHasChanged = this.reorderLanguageList();
		if ( captionsOrderHasChanged ) {
			this.redrawCaptionsTable();
		}
		this.refreshTableRowIndices();
	};

	/**
	 * Create a re-arranged list of languages, based on the rules specified in the class
	 * comments
	 *
	 * Should only be called on initialisation, because it relies on only the interface language
	 * (and possible the first fallback, if the interface language has no caption) having the
	 * 'showLabel' class
	 *
	 * @return bool True if the language list order has changed
	 */
	sd.CaptionsPanel.prototype.reorderLanguageList = function () {
		var captionLanguages = this.getCaptionLanguagesList(),
			$visibleLanguageNodes = $( '.showLabel .language' ),
			rearrangedCaptionLanguages = [];

		$.each( $visibleLanguageNodes, function ( index, node ) {
			rearrangedCaptionLanguages.push( $( node ).attr( 'lang' ) );
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
		return $( this.tableSelector ).attr( this.captionLanguagesDataAttr ).split( ',' );
	};

	sd.CaptionsPanel.prototype.setCaptionLanguagesList = function ( languagesList ) {
		return $( this.tableSelector ).attr(
			this.captionLanguagesDataAttr,
			languagesList.join( ',' )
		);
	};

	sd.CaptionsPanel.prototype.getAvailableLanguages = function (
		excludeLanguages, includeLanguage
	) {
		var languages = {};
		$.extend( languages, mw.config.get( 'wgULSLanguages' ) );
		$.each( excludeLanguages, function ( index, languageCode ) {
			if ( languageCode !== includeLanguage ) {
				delete languages[ languageCode ];
			}
		} );
		return languages;
	};

	sd.CaptionsPanel.prototype.refreshLanguageSelectorsOptions = function () {
		var captionsPanel = this,
			currentlySelectedLanguages = [];

		$.each( this.languageSelectors, function ( index, languageSelector ) {
			currentlySelectedLanguages.push( languageSelector.getValue() );
		} );
		$.each( this.languageSelectors, function ( index, languageSelector ) {
			languageSelector.updateLanguages(
				captionsPanel.getAvailableLanguages(
					currentlySelectedLanguages,
					languageSelector.getValue()
				)
			);
		} );
	};

	sd.CaptionsPanel.prototype.warnIfTextApproachingLimit = function ( textInput ) {
		var $captionTD = textInput.$element.parents( 'td.caption' ),
			lengthDiff = mw.config.get( 'maxCaptionLength' ) - textInput.getValue().length;
		$captionTD.find( 'div.warning' ).remove();
		if ( lengthDiff >= 0 && lengthDiff < this.config.warnWithinMaxCaptionLength ) {
			$captionTD.append(
				$( '<div>' )
					.addClass( 'warning' )
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
		$.each( this.textInputs, function ( index, textInput ) {
			textInputChecks.push(
				textInput.getValidity()
					.done( function () {
						textInput.$element.parents( 'td.caption' ).find( 'div.error' ).remove();
					} )
					.fail( function () {
						var $captionTD = textInput.$element.parents( 'td.caption' );
						$captionTD.find( 'div.warning' ).remove();
						$captionTD.find( 'div.error' ).remove();
						$captionTD.append(
							$( '<div>' )
								.addClass( 'error' )
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

	sd.CaptionsPanel.prototype.createTableRowDeleter = function ( $tableRow ) {
		var captionsPanel = this,
			deleter = new OO.ui.ButtonWidget( {
				icon: 'trash',
				framed: false,
				flags: 'destructive',
				classes: [ 'deleter' ]
			} );

		deleter.$element.on( 'click', function () {
			captionsPanel.languageSelectors.splice(
				$tableRow.attr( 'data-index' ),
				1
			);
			captionsPanel.textInputs.splice(
				$tableRow.attr( 'data-index' ),
				1
			);
			$tableRow.remove();
			captionsPanel.refreshTableRowIndices();
			captionsPanel.refreshLanguageSelectorsOptions();
		} );
		return deleter;
	};

	sd.CaptionsPanel.prototype.createIndexedEditableRow = function (
		index, captionLangCodes, captionData
	) {
		var captionsPanel = this,
			languageSelector,
			textInput,
			$tableRow;

		if ( captionData === undefined ) {
			captionData = new sd.CaptionData( '', '', '', '' );
		}

		languageSelector = new sd.UlsWidget( {
			languages: this.getAvailableLanguages( captionLangCodes, captionData.languageCode )
		} );
		if ( captionData.languageCode !== '' ) {
			languageSelector.setValue( captionData.languageCode );
		}
		languageSelector.on( 'select', function () {
			var dir,
				$parentTableRow;
			captionsPanel.refreshLanguageSelectorsOptions();
			dir = $.uls.data.getDir( languageSelector.getValue() );
			$parentTableRow = languageSelector.$element.parents( 'tr.entity-terms' );
			$parentTableRow.find( 'td.language' ).attr( 'dir', dir );
			$parentTableRow.find( 'td.caption' ).attr( 'dir', dir );
			$parentTableRow.find( 'td.caption textarea' ).attr( 'dir', dir );
		} );
		this.languageSelectors[ index ] = languageSelector;

		textInput = new OO.ui.MultilineTextInputWidget( {
			rows: 1,
			autosize: true,
			validate: function ( value ) {
				return value.length <= mw.config.get( 'maxCaptionLength' );
			},
			value: captionData.text,
			dir: captionData.direction,
			placeholder: captionData.text === '' ? mw.message( 'wikibasemediainfo-filepage-caption-empty' ).text() : '',
			classes: [ 'textInput' ]
		} );
		textInput.on( 'change', function () {
			captionsPanel.warnIfTextApproachingLimit( textInput );
			$.when.apply( null, captionsPanel.doTextInputChecks() )
				.then(
					function () {
						captionsPanel.editActionsWidget.enablePublish();
					},
					function () {
						captionsPanel.editActionsWidget.disablePublish();
					}
				);
		} );
		this.textInputs[ index ] = textInput;

		$tableRow = this.createTableRow(
			index,
			mw.html.escape( captionData.languageCode ),
			mw.html.escape( captionData.direction ),
			this.languageSelectors[ index ].$element,
			this.textInputs[ index ].$element,
			false
		);
		$tableRow.find( 'td.caption' )
			.append( this.createTableRowDeleter( $tableRow ).$element );
		return $tableRow;
	};

	sd.CaptionsPanel.prototype.findRemovedLanguages = function () {
		var captionsPanel = this,
			langCodesWithoutData = [];

		$.each( this.captionsData, function ( i, captionData ) {
			var langCodeHasData = false;
			$.each( captionsPanel.languageSelectors, function ( j, languageSelector ) {
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
		$.each( this.languageSelectors, function ( index, languageSelector ) {
			languageSelector.setDisabled( true );
		} );
		$.each( this.textInputs, function ( index, textInput ) {
			textInput.setDisabled( true );
			textInput.$element.parents( '.caption' ).find( '.deleter' ).hide();
		} );
	};

	sd.CaptionsPanel.prototype.enableAllFormInputs = function () {
		$.each( this.languageSelectors, function ( index, languageSelector ) {
			languageSelector.setDisabled( false );
		} );
		$.each( this.textInputs, function ( index, textInput ) {
			textInput.setDisabled( false );
			textInput.$element.parents( '.caption' ).find( '.deleter' ).show();
		} );
	};

	sd.CaptionsPanel.prototype.entityIsEmpty = function () {
		return $( '.emptyEntity' ).length > 0;
	};

	sd.CaptionsPanel.prototype.markEntityAsNonEmpty = function () {
		$( '.' + this.config.entityViewClass ).removeClass( 'emptyEntity' );
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
		if ( !this.entityIsEmpty() ) {
			apiParams.baserevid = this.currentRevision;
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
				captionsPanel.markEntityAsNonEmpty();
				captionsPanel.captionsData[ language ] = new sd.CaptionData(
					language,
					captionsPanel.languages[ language ],
					$.uls.data.getDir( language ),
					text
				);
				captionsPanel.currentRevision = result.entity.lastrevid;
				captionsPanel.languageSelectors.splice( index, 1 );
				captionsPanel.textInputs.splice( index, 1 );
				$( captionsPanel.tableSelector )
					.find( 'tr.entity-terms[data-index="' + index + '"]' )
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

		$( this.tableSelector ).find( 'tr.entity-terms' ).each( function () {
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
		$.each( rowsWithoutLanguage, function ( index, row ) {
			row.remove();
		} );
		return chain;
	};

	sd.CaptionsPanel.prototype.deleteIndividualLabel = function ( langCodeToDelete ) {
		var self = this,
			deferred = $.Deferred(),
			$captionsTable = $( this.tableSelector );

		this.api.postWithToken(
			'csrf',
			this.getWbSetLabelParams( langCodeToDelete, '' )
		)
			.done( function ( result ) {
				var captionLanguages = self.getCaptionLanguagesList();

				// Update revision id
				self.currentRevision = result.entity.lastrevid;

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
					$.each( captionLanguages, function ( index, langCode ) {
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
				$captionsTable.find( 'tr.entity-terms' ).each( function () {
					var dataInRow = self.readDataFromReadOnlyRow( $( this ) );
					currentlyDisplayedLanguages.push( dataInRow.languageCode );
				} );
				newIndex = $captionsTable.find( 'tr.entity-terms' ).length;
				errorRow = self.createIndexedEditableRow(
					newIndex,
					currentlyDisplayedLanguages,
					self.captionsData[ langCodeToDelete ]
				);
				errorRow.insertBefore( $captionsTable.find( '.editActions' ) );
				rejection = wb.api.RepoApiError.newFromApiResponse( error, 'save' );
				rejection.index = newIndex;
				deferred.reject( rejection );
			} );
		return deferred.promise();
	};

	sd.CaptionsPanel.prototype.deleteRemovedData = function ( chain, removedLanguages ) {
		var captionsPanel = this;

		$.each( removedLanguages, function ( i, languageCode ) {
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
				captionsPanel.currentRevision = result.entities[ entityId ].lastrevid;
				// Add any empty CaptionData objects to the list first, as they won't be returned
				// from the api
				$.each( captionsPanel.captionsData, function ( index, captionData ) {
					if ( captionData.text === '' ) {
						refreshedLabelsData[ captionData.languageCode ] = captionData;
					}
				} );
				$.each(
					result.entities[ entityId ].labels,
					function ( languageCode, labelObject ) {
						refreshedLabelsData[ languageCode ] = new sd.CaptionData(
							languageCode,
							captionsPanel.languages[ languageCode ],
							$.uls.data.getDir( languageCode ),
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

	sd.CaptionsPanel.prototype.redrawCaptionsTable = function () {
		var self = this,
			$captionsTable = $( this.tableSelector ),
			showCaptionFlags = this.getShowCaptionFlagsByLangCode(),
			count = 0,
			languageCodesInOrder = this.getCaptionLanguagesList();

		$captionsTable.find( 'tr.entity-terms' ).each( function () {
			$( this ).remove();
		} );

		languageCodesInOrder.forEach( function ( langCode ) {
			var captionData = self.captionsData[ langCode ];
			$captionsTable.append(
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

		$.each( captionLanguages, function ( index, langCode ) {
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

	sd.CaptionsPanel.prototype.refreshAndMakeEditable = function () {
		var captionsPanel = this;

		// Set the target pending element to the layout box
		this.$pending = $( '.' + this.config.headerClass ).parent();
		this.pushPending();

		this.refreshDataFromApi()
			.always( function () {
				captionsPanel.redrawCaptionsTable();
				var $captionsTable = $( captionsPanel.tableSelector );
				$captionsTable.addClass( 'editable' );
				captionsPanel.editToggle.hide();
				captionsPanel.languagesViewWidget.hide();
				captionsPanel.editActionsWidget.show();
				var captionLangCodes = [];
				$captionsTable.find( 'tr.entity-terms' ).each( function () {
					var dataInRow = captionsPanel.readDataFromReadOnlyRow( $( this ) );
					captionLangCodes.push( dataInRow.languageCode );
				} );
				$captionsTable.find( 'tr.entity-terms' ).each( function ( index ) {
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
		var $captionsTable = $( this.tableSelector );
		$captionsTable.removeClass( 'editable' );
		this.editActionsWidget.hide();
		this.redrawCaptionsTable();
		this.languagesViewWidget.expand();
		this.editToggle.show();
	};

	sd.CaptionsPanel.prototype.addNewEditableLanguageRow = function () {
		var $captionsTable = $( this.tableSelector );
		var tableRow = this.createIndexedEditableRow(
			$captionsTable.find( 'tr.entity-terms' ).length
		);
		tableRow.insertBefore( $captionsTable.find( '.editActions' ) );
		this.refreshLanguageSelectorsOptions();
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
				var $captionTD;
				captionsPanel.enableAllFormInputs();
				$captionTD =
					$( captionsPanel.tableSelector ).find(
						'tr.entity-terms[data-index="' + error.index + '"] .caption'
					);
				$captionTD.find( 'div.error' ).remove();
				$captionTD.find( 'div.warning' ).remove();
				$captionTD.append(
					$( '<div>' )
						.addClass( 'error' )
						.html( error.detailedMessage )
				);
			} )
			.always( function () {
				captionsPanel.editActionsWidget.setStateReady();
			} );
	};

	sd.CaptionsPanel.prototype.initialize = function () {
		var captionsPanel = this;

		this.editToggle.initialize();
		$( this.tableSelector ).find( 'tr.entity-terms' ).each( function ( index ) {
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
