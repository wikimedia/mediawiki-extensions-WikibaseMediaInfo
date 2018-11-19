( function ( sd, wb ) {
	'use strict';

	/**
	 * Panel for displaying/editing structured data multi-lingual captions
	 *
	 * @extends OO.ui.Element
	 *
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {Object} header jquery element containing the panel header
	 * @cfg {Object} table jquery table element containing the existing data
	 * @cfg {int} warnWithinMaxCaptionLength Show a warning when the caption length is within X
	 *   characters of the max
	 */
	sd.CaptionsPanel = function CaptionsPanel( config ) {
		this.config = config || {};

		// Parent constructor
		sd.CaptionsPanel.super.apply( this, arguments );

		this.currentRevision = mw.config.get( 'wbCurrentRevision' );
		this.languages = mw.config.get( 'wbTermsLanguages' );
		this.labelsData = {};
		this.languageSelectors = [];
		this.textInputs = [];
		this.editToggle = new sd.EditToggle( this.config, this );
		this.languagesViewWidget = new sd.LanguagesViewWidget( this.config );
		this.editActionsWidget = new sd.EditActionsWidget( config, this );
		this.api = wb.api.getLocationAgnosticMwApi( mw.config.get( 'wbRepoApiUrl' ) );
		this.tableSelector = '.' + this.config.tableClass;
	};

	/* Inheritance */
	OO.inheritClass( sd.CaptionsPanel, OO.ui.Element );

	sd.CaptionsPanel.prototype.injectEmptyEntityView = function () {
		var captionsPanel = this;

		$( this.config.entityViewAppendSelector )
			.append(
				$( '<h1>' )
					.addClass( 'mw-slot-header' )
					.text(
						mw.message( 'wikibasemediainfo-filepage-structured-data-heading' )
							.text()
					),
				$( '<div>' )
					.addClass( captionsPanel.config.entityViewClass )
					.addClass( 'emptyEntity' )
					.attr( 'dir', 'auto' )
					.attr( 'id', 'wb-mediainfo-' + mw.config.get( 'wbEntityId' ) )
			);
	};

	sd.CaptionsPanel.prototype.injectEmptyCaptionsData = function () {
		var $panelHeader = $( '<h3>' )
			.addClass( this.config.headerClass )
			.text( mw.message( 'wikibasemediainfo-filepage-captions-title' ).text() );
		var $panelContent = $( '<table>' )
			.addClass( this.config.tableClass )
			.addClass( 'filepage-mediainfo-entitytermstable' )
			.attr( 'cellspacing', 0 )
			.attr( 'cellpadding', 0 );
		var panelLayout = new OO.ui.PanelLayout( {
			scrollable: false,
			padded: false,
			expanded: false,
			framed: true,
			$content: [ $panelHeader, $panelContent ]
		} );

		$( '.' + this.config.entityViewClass )
			.append(
				$( '<div>' )
					.addClass( 'filepage-mediainfo-entitytermsview' )
					.append(
						panelLayout.$element
					)
			);
	};

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
		if ( this.labelsData[ languageCode ] !== undefined ) {
			captionData = this.labelsData[ languageCode ];
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
		index, languageCode, direction, languageContent, captionContent
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

		return $( '<tr>' )
			.addClass( 'entity-terms' )
			.attr( 'index', index )
			.append( $languageTD, $captionTD );
	};

	sd.CaptionsPanel.prototype.createIndexedReadOnlyRow = function ( index, captionData ) {
		return this.createTableRow(
			index,
			mw.html.escape( captionData.languageCode ),
			mw.html.escape( captionData.direction ),
			mw.html.escape( captionData.languageText ),
			mw.html.escape( captionData.text )
		);
	};

	sd.CaptionsPanel.prototype.refreshTableRowIndices = function () {
		$( this.tableSelector ).find( 'tr.entity-terms' ).each( function ( index ) {
			$( this ).attr( 'index', index );
		} );
	};

	sd.CaptionsPanel.prototype.addUserLanguageRowsIfNotPresent = function () {
		var captionsPanel = this;

		$.each( mw.config.get( 'wbUserSpecifiedLanguages' ), function ( index, langCode ) {
			if ( captionsPanel.dataExistsForLangCode( langCode ) === false ) {
				var tableRow = captionsPanel.createIndexedReadOnlyRow(
					0,
					new sd.CaptionData(
						langCode,
						captionsPanel.languages[ langCode ],
						$.uls.data.getDir( langCode ),
						''
					)
				);
				$( captionsPanel.tableSelector ).prepend( tableRow );
			}
		} );
		this.refreshTableRowIndices();
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
				$tableRow.attr( 'index' ),
				1
			);
			captionsPanel.textInputs.splice(
				$tableRow.attr( 'index' ),
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
			captionData = new sd.CaptionData( '', '', '', '', '' );
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
			this.textInputs[ index ].$element
		);
		$tableRow.find( 'td.caption' )
			.append( this.createTableRowDeleter( $tableRow ).$element );
		return $tableRow;
	};

	sd.CaptionsPanel.prototype.findRemovedLanguages = function () {
		var captionsPanel = this,
			langCodesWithoutData = [];

		$.each( this.labelsData, function ( i, captionData ) {
			var langCodeHasData = false;
			$.each( captionsPanel.languageSelectors, function ( j, languageSelector ) {
				if ( languageSelector.getValue() === captionData.languageCode ) {
					langCodeHasData = true;
					return false;
				}
			} );
			if ( langCodeHasData === false ) {
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
				captionsPanel.markEntityAsNonEmpty();
				captionsPanel.labelsData[ language ] = new sd.CaptionData(
					language,
					captionsPanel.languages[ language ],
					$.uls.data.getDir( language ),
					text
				);
				captionsPanel.currentRevision = result.entity.lastrevid;
				captionsPanel.languageSelectors.splice( index, 1 );
				captionsPanel.textInputs.splice( index, 1 );
				$( captionsPanel.tableSelector )
					.find( 'tr.entity-terms[index="' + index + '"]' )
					.replaceWith(
						captionsPanel.createIndexedReadOnlyRow(
							index, captionsPanel.labelsData[ language ]
						)
					);
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
			var index = $( this ).attr( 'index' ),
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
				$( this ).replaceWith(
					captionsPanel.createIndexedReadOnlyRow(
						index,
						existingDataForLanguage
					)
				);
			}
		} );
		$.each( rowsWithoutLanguage, function ( index, row ) {
			row.remove();
		} );
		return chain;
	};

	sd.CaptionsPanel.prototype.deleteIndividualLabel = function ( languageCode ) {
		var captionsPanel = this,
			deferred = $.Deferred(),
			$captionsTable = $( this.tableSelector );

		this.api.postWithToken(
			'csrf',
			this.getWbSetLabelParams( languageCode, '' )
		)
			.done( function ( result ) {
				delete captionsPanel.labelsData[ languageCode ];
				captionsPanel.currentRevision = result.entity.lastrevid;
				deferred.resolve();
			} )
			.fail( function ( errorCode, error ) {
				// Display the old data for the language we've attempted and failed to delete
				var currentlyDisplayedLanguages = [],
					newIndex,
					errorRow,
					rejection;
				$captionsTable.find( 'tr.entity-terms' ).each( function () {
					var dataInRow = captionsPanel.readDataFromReadOnlyRow( $( this ) );
					currentlyDisplayedLanguages.push( dataInRow.languageCode );
				} );
				newIndex = $captionsTable.find( 'tr.entity-terms' ).length;
				errorRow = captionsPanel.createIndexedEditableRow(
					newIndex,
					currentlyDisplayedLanguages,
					captionsPanel.labelsData[ languageCode ]
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
				captionsPanel.currentRevision = result.entities[ entityId ].lastrevid;
				captionsPanel.labelsData = {};
				$.each(
					result.entities[ entityId ].labels,
					function ( languageCode, labelObject ) {
						captionsPanel.labelsData[ languageCode ] = new sd.CaptionData(
							languageCode,
							captionsPanel.languages[ languageCode ],
							$.uls.data.getDir( languageCode ),
							labelObject.value
						);
					}
				);
				deferred.resolve();
			} )
			.fail( function () {
				// Ignore the failure and just make do with the data we already have
				deferred.reject();
			} );
		return deferred.promise();
	};

	sd.CaptionsPanel.prototype.refreshCaptionsTable = function ( labelsData ) {
		var captionsPanel = this,
			$captionsTable = $( this.tableSelector );

		$captionsTable.find( 'tr.entity-terms' ).each( function () {
			$( this ).remove();
		} );
		$.each( labelsData, function ( index, captionData ) {
			$captionsTable.append(
				captionsPanel.createIndexedReadOnlyRow( index, captionData )
			);
		} );
		this.addUserLanguageRowsIfNotPresent();
		this.languagesViewWidget.refreshLabel();
	};

	sd.CaptionsPanel.prototype.refreshAndMakeEditable = function () {
		var captionsPanel = this;

		this.refreshDataFromApi()
			.always( function () {
				captionsPanel.refreshCaptionsTable( captionsPanel.labelsData );
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
					$( this ).replaceWith(
						captionsPanel.createIndexedEditableRow(
							index,
							captionLangCodes,
							captionsPanel.readDataFromReadOnlyRow( $( this ) )
						)
					);
				} );
			} );
	};

	sd.CaptionsPanel.prototype.makeReadOnly = function () {
		var $captionsTable = $( this.tableSelector );
		$captionsTable.removeClass( 'editable' );
		this.editActionsWidget.hide();
		this.refreshCaptionsTable( this.labelsData );
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
						'tr.entity-terms[index="' + error.index + '"] .caption'
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

		if ( $( '.' + this.config.entityViewClass ).length === 0 ) {
			this.injectEmptyEntityView();
		}
		if ( $( '.' + this.config.tableClass ).length === 0 ) {
			this.injectEmptyCaptionsData();
		}
		this.editToggle.initialize();
		$( this.tableSelector ).find( 'tr.entity-terms' ).each( function ( index ) {
			var captionData;
			$( this ).attr( 'index', index );
			captionData = captionsPanel.readDataFromReadOnlyRow( $( this ) );
			captionsPanel.labelsData[ captionData.languageCode ] = captionData;
		} );
		this.addUserLanguageRowsIfNotPresent();
		this.languagesViewWidget.refreshLabel();
		this.languagesViewWidget.collapse();
	};

}( mw.mediaInfo.structuredData, wikibase ) );
