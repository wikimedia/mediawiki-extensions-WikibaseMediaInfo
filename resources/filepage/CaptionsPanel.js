( function ( mw, sd, wb, $ ) {

	'use strict';

	/**
	 * Panel for displaying/editing structured data multi-lingual captions
	 *
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {Object} header jquery element containing the panel header
	 * @cfg {Object} table jquery table element containing the existing data
	 * @cfg {int} warnWithinMaxCaptionLength Show a warning when the caption length is within X characters of the max
	 */
	sd.CaptionsPanel = function CaptionsPanel( config ) {

		var currentRevision = mw.config.get( 'wbCurrentRevision' ),
			languages = mw.config.get( 'wgULSLanguages' ),
			data = {},
			languageSelectors = [],
			textInputs = [],
			editToggle = new sd.EditToggle( config, this ),
			languagesViewWidget = new sd.LanguagesViewWidget( config ),
			editActionsWidget = new sd.EditActionsWidget( config, this ),
			api = new wb.api.RepoApi(
				wb.api.getLocationAgnosticMwApi( mw.config.get( 'wbRepoApiUrl' ) )
			);

		var readDataFromReadOnlyRow = function ( $tableRow ) {
			var $languageTD = $tableRow.find( 'td.language' ),
				$captionTD = $tableRow.find( 'td.caption' );
			return new sd.CaptionData(
				$languageTD.attr( 'lang' ),
				$languageTD.html(),
				$languageTD.attr( 'dir' ),
				$captionTD.hasClass( 'wbmi-empty' ) ? '' : $captionTD.html()
			);
		};

		var getDataForLangCode = function ( languageCode ) {
			var captionData = new sd.CaptionData(
				languageCode,
				languages[ languageCode ],
				$.uls.data.getDir( languageCode ),
				''
			);
			if ( data[ languageCode ] !== undefined ) {
				captionData = data[ languageCode ];
			}
			return captionData;
		};

		var dataExistsForLangCode = function ( languageCode ) {
			var data = getDataForLangCode( languageCode );
			if ( data.text !== '' ) {
				return true;
			}
			return false;
		};

		var createTableRow = function ( index, languageCode, direction, languageContent, captionContent ) {
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
				$captionTD.html( mw.message( 'wikibasemediainfo-filepage-caption-empty' ).text() );
			}

			return $( '<tr>' )
				.addClass( 'entity-terms' )
				.attr( 'index', index )
				.append( $languageTD, $captionTD );
		};

		var createIndexedReadOnlyRow = function ( index, captionData ) {
			return createTableRow(
				index,
				captionData.languageCode,
				captionData.direction,
				captionData.languageText,
				captionData.text
			);
		};

		var refreshTableRowIndices = function () {
			config.table.find( 'tr.entity-terms' ).each( function ( index ) {
				$( this ).attr( 'index', index );
			} );
		};

		var addUserLanguageRowsIfNotPresent = function () {
			$.each( mw.config.get( 'wbUserSpecifiedLanguages' ), function ( index, langCode ) {
				if ( dataExistsForLangCode( langCode ) === false ) {
					var tableRow = createIndexedReadOnlyRow(
						0,
						new sd.CaptionData(
							langCode,
							languages[ langCode ],
							$.uls.data.getDir( langCode ),
							''
						)
					);
					$( config.table ).prepend( tableRow );
				}
			} );
			refreshTableRowIndices();
		};

		var getAvailableLanguages = function ( excludeLanguages, includeLanguage ) {
			var languages = {};
			$.extend( languages, mw.config.get( 'wgULSLanguages' ) );
			$.each( excludeLanguages, function ( index, languageCode ) {
				if ( languageCode !== includeLanguage ) {
					delete languages[ languageCode ];
				}
			} );
			return languages;
		};

		var refreshLanguageSelectorsOptions = function () {
			var currentlySelectedLanguages = [];
			$.each( languageSelectors, function ( index, languageSelector ) {
				currentlySelectedLanguages.push( languageSelector.getValue() );
			} );
			$.each( languageSelectors, function ( index, languageSelector ) {
				languageSelector.updateLanguages(
					getAvailableLanguages(
						currentlySelectedLanguages,
						languageSelector.getValue()
					)
				);
			} );
		};

		var warnIfTextApproachingLimit = function ( textInput ) {
			var $captionTD = textInput.$element.parents( 'td.caption' ),
				lengthDiff = mw.config.get( 'maxCaptionLength' ) - textInput.getValue().length;
			$captionTD.find( 'div.warning' ).remove();
			if ( lengthDiff >= 0 && lengthDiff < config.warnWithinMaxCaptionLength ) {
				$captionTD.append(
					$( '<div>' )
						.addClass( 'warning' )
						.html(
							mw.message(
								'wikibasemediainfo-filepage-caption-approaching-limit',
								lengthDiff
							).text()
						)
				);
			}
		};

		var doTextInputChecks = function () {
			var textInputChecks = [];
			$.each( textInputs, function ( index, textInput ) {
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
									.html(
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

		var createTableRowDeleter = function ( $tableRow ) {
			var deleter = new OO.ui.ButtonWidget( {
				icon: 'trash',
				framed: false,
				flags: 'destructive',
				classes: [ 'deleter' ]
			} );
			deleter.$element.on( 'click', function () {
				languageSelectors.splice(
					$tableRow.attr( 'index' ),
					1
				);
				textInputs.splice(
					$tableRow.attr( 'index' ),
					1
				);
				$tableRow.remove();
				refreshTableRowIndices();
				refreshLanguageSelectorsOptions();
			} );
			return deleter;
		};

		var createIndexedEditableRow = function ( index, allCurrentCaptionLangCodes, captionData ) {
			var languageSelector,
				textInput,
				$tableRow;

			if ( captionData === undefined ) {
				captionData = new sd.CaptionData( '', '', '', '', '' );
			}

			languageSelector = new sd.UlsWidget( {
				languages: getAvailableLanguages( allCurrentCaptionLangCodes, captionData.languageCode )
			} );
			if ( captionData.languageCode !== '' ) {
				languageSelector.setValue( captionData.languageCode );
			}
			languageSelector.on( 'select', function () {
				var dir,
					$parentTableRow;
				refreshLanguageSelectorsOptions();
				dir = $.uls.data.getDir( languageSelector.getValue() );
				$parentTableRow = languageSelector.$element.parents( 'tr.entity-terms' );
				$parentTableRow.find( 'td.language' ).attr( 'dir', dir );
				$parentTableRow.find( 'td.caption' ).attr( 'dir', dir );
				$parentTableRow.find( 'td.caption textarea' ).attr( 'dir', dir );
			} );
			languageSelectors[ index ] = languageSelector;

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
				warnIfTextApproachingLimit( textInput );
				$.when.apply( null, doTextInputChecks() )
					.then(
						function () {
							editActionsWidget.enablePublish();
						},
						function () {
							editActionsWidget.disablePublish();
						}
					);
			} );
			textInputs[ index ] = textInput;

			$tableRow = createTableRow(
				index,
				captionData.languageCode,
				captionData.direction,
				languageSelectors[ index ].$element,
				textInputs[ index ].$element
			);
			$tableRow.find( 'td.caption' )
				.append( createTableRowDeleter( $tableRow ).$element );
			return $tableRow;
		};

		var findRemovedLanguages = function () {
			var langCodesWithoutData = [];
			$.each( data, function ( i, captionData ) {
				var langCodeHasData = false;
				$.each( languageSelectors, function ( j, languageSelector ) {
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

		var disableAllFormInputs = function () {
			$.each( languageSelectors, function ( index, languageSelector ) {
				languageSelector.setDisabled( true );
			} );
			$.each( textInputs, function ( index, textInput ) {
				textInput.setDisabled( true );
				textInput.$element.parents( '.caption' ).find( '.deleter' ).hide();
			} );
		};

		var enableAllFormInputs = function () {
			$.each( languageSelectors, function ( index, languageSelector ) {
				languageSelector.setDisabled( false );
			} );
			$.each( textInputs, function ( index, textInput ) {
				textInput.setDisabled( false );
				textInput.$element.parents( '.caption' ).find( '.deleter' ).show();
			} );
		};

		var sendIndividualLabel = function ( index, language, text ) {
			var deferred = $.Deferred();
			api.setLabel(
				mw.config.get( 'wbEntityId' ),
				currentRevision,
				text,
				language
			)
				.done( function ( result ) {
					data[ language ] = new sd.CaptionData(
						language,
						languages[ language ],
						$.uls.data.getDir( language ),
						text
					);
					currentRevision = result.entity.lastrevid;
					languageSelectors.splice( index, 1 );
					textInputs.splice( index, 1 );
					config.table.find( 'tr.entity-terms[index="' + index + '"]' ).replaceWith(
						createIndexedReadOnlyRow( index, data[ language ] )
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

		var updateData = function ( chain ) {
			var rowsWithoutLanguage = [];
			config.table.find( 'tr.entity-terms' ).each( function () {
				var index = $( this ).attr( 'index' ),
					languageCode = languageSelectors[ index ].getValue(),
					text = textInputs[ index ].getValue(),
					existingDataForLanguage = getDataForLangCode( languageCode );

				// Ignore rows where no language code has been selected
				if ( languageCode === undefined ) {
					rowsWithoutLanguage.push( $( this ) );
					return true;
				}

				if ( existingDataForLanguage.text !== text ) {
					chain = chain.then( function () {
						return sendIndividualLabel(
							index,
							languageCode,
							text
						);
					} );
				} else {
					$( this ).replaceWith(
						createIndexedReadOnlyRow(
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

		var deleteIndividualLabel = function ( languageCode ) {
			var deferred = $.Deferred();
			api.setLabel(
				mw.config.get( 'wbEntityId' ),
				currentRevision,
				'',
				languageCode
			)
				.done( function () {
					delete data[ languageCode ];
					deferred.resolve();
				} )
				.fail( function ( errorCode, error ) {
					// Display the old data for the language we've attempted and failed to delete
					var currentlyDisplayedLanguages = [],
						newIndex,
						errorRow,
						rejection;
					config.table.find( 'tr.entity-terms' ).each( function () {
						var dataInRow = readDataFromReadOnlyRow( $( this ) );
						currentlyDisplayedLanguages.push( dataInRow.languageCode );
					} );
					newIndex = config.table.find( 'tr.entity-terms' ).length;
					errorRow = createIndexedEditableRow(
						newIndex,
						currentlyDisplayedLanguages,
						data[ languageCode ]
					);
					errorRow.insertBefore( config.table.find( '.editActions' ) );
					rejection = wb.api.RepoApiError.newFromApiResponse( error, 'save' );
					rejection.index = newIndex;
					deferred.reject( rejection );
				} );
			return deferred.promise();
		};

		var deleteRemovedData = function ( chain, removedLanguages ) {
			$.each( removedLanguages, function ( i, languageCode ) {
				chain = chain.then( function () {
					return deleteIndividualLabel(
						languageCode
					);
				} );
			} );
			return chain;
		};

		this.makeEditable = function () {
			config.table.addClass( 'editable' );
			editToggle.hide();
			languagesViewWidget.hide();
			editActionsWidget.show();
			var allCurrentCaptionLangCodes = [];
			config.table.find( 'tr.entity-terms' ).each( function () {
				var dataInRow = readDataFromReadOnlyRow( $( this ) );
				allCurrentCaptionLangCodes.push( dataInRow.languageCode );
			} );
			config.table.find( 'tr.entity-terms' ).each( function ( index ) {
				$( this ).replaceWith(
					createIndexedEditableRow(
						index,
						allCurrentCaptionLangCodes,
						readDataFromReadOnlyRow( $( this ) )
					)
				);
			} );
		};

		this.makeReadOnly = function () {
			config.table.removeClass( 'editable' );
			editActionsWidget.hide();
			config.table.find( 'tr.entity-terms' ).each( function () {
				$( this ).remove();
			} );
			$.each( data, function ( index, captionData ) {
				config.table.append(
					createIndexedReadOnlyRow( index, captionData )
				);
			} );
			addUserLanguageRowsIfNotPresent();
			languagesViewWidget.refreshLabel();
			languagesViewWidget.expand();
			editToggle.show();
		};

		this.addNewEditableLanguageRow = function () {
			var tableRow = createIndexedEditableRow(
				config.table.find( 'tr.entity-terms' ).length
			);
			tableRow.insertBefore( config.table.find( '.editActions' ) );
			refreshLanguageSelectorsOptions();
		};

		this.sendData = function () {
			var chain = $.Deferred().resolve().promise(),
				removedLanguages = findRemovedLanguages(),
				self = this;
			editActionsWidget.setStateSending();
			disableAllFormInputs();

			chain = updateData( chain );
			chain = deleteRemovedData( chain, removedLanguages );
			chain
				.then( function () {
					self.makeReadOnly();
				} )
				.catch( function ( error ) {
					var $captionTD;
					enableAllFormInputs();
					$captionTD =
						config.table.find( 'tr.entity-terms[index="' + error.index + '"] .caption' );
					$captionTD.find( 'div.error' ).remove();
					$captionTD.find( 'div.warning' ).remove();
					$captionTD.append(
						$( '<div>' )
							.addClass( 'error' )
							.html( error.detailedMessage )
					);
				} )
				.always( function () {
					editActionsWidget.setStateReady();
				} );
		};

		this.initialize = function () {
			config.table.find( 'tr.entity-terms' ).each( function ( index ) {
				var captionData;
				$( this ).attr( 'index', index );
				captionData = readDataFromReadOnlyRow( $( this ) );
				data[ captionData.languageCode ] = captionData;
			} );
			addUserLanguageRowsIfNotPresent();
			languagesViewWidget.refreshLabel();
			languagesViewWidget.collapse();
		};

	};

}( mediaWiki, mediaWiki.mediaInfo.structuredData, wikibase, jQuery ) );
