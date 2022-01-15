'use strict';

var AnonWarning = require( './AnonWarning.js' ),
	CaptionData = require( './CaptionData.js' ),
	CaptionDataEditor = require( './CaptionDataEditor.js' ),
	CaptionsEditActionsWidget = require( './CaptionsEditActionsWidget.js' ),
	LicenseDialogWidget = require( './LicenseDialogWidget.js' ),
	ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	wbTermsLanguages = require( 'wikibase.mediainfo.statements' ).config.wbTermsLanguages,
	CaptionsPanel;

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
 * @mixin OO.ui.mixin.PendingElement
 *
 * @constructor
 * @param {Object} [config]
 * @param {datamodel.MediaInfo} config.mediaInfo
 * @param {boolean} [config.canEdit] True if the captions should be editable on the page
 * @param {string[]} [config.userLanguages] The language the user has indicated that they use (via babel)
 * @param {string[]} [config.languageFallbackChain]
 * @param {number} [config.warnWithinMaxCaptionLength] Show a warning when the caption length is within X
 *   characters of the max
 */
CaptionsPanel = function ( config ) {
	var self = this;
	config = config || {};

	// Parent constructor
	CaptionsPanel.parent.call( this, config );

	// Mixin constructor
	OO.ui.mixin.PendingElement.call( this, config );

	this.userLanguages = config.userLanguages || [];
	this.languageFallbackChain = config.languageFallbackChain || [ 'en' ];
	this.canEdit = ( typeof config.canEdit === 'undefined' ) ? true : config.canEdit;
	this.warnWithinMaxCaptionLength = config.warnWithinMaxCaptionLength;
	this.savedCaptionsData = this.captionsDataFromMediaInfoEntity( config.mediaInfo );

	this.api = wikibase.api.getLocationAgnosticMwApi(
		mw.config.get(
			'wbmiRepoApiUrl',
			mw.config.get( 'wbRepoApiUrl' )
		)
	);

	// Create the various widgets
	this.licenseDialogWidget = new LicenseDialogWidget();
	this.editActionsWidget = new CaptionsEditActionsWidget();
	this.editActionsWidget.connect( this, { add: 'addNewEmptyLanguageRow' } );
	this.editActionsWidget.connect( this, { publish: 'sendData' } );
	this.editActionsWidget.connect( this, { cancel: 'onCancel' } );

	this.state = $.extend(
		{},
		this.getCaptionsState( this.savedCaptionsData ),
		{
			editing: false,
			disabled: false,
			captionsDataEditors: {},
			displayAllLanguages: false
		}
	);

	ComponentWidget.call(
		this,
		'wikibase.mediainfo.filePageDisplay',
		'templates/filepage/CaptionsPanel.mustache+dom'
	);

	// Set the target pending element to first child of $element, which is the first node of the
	// rendered template
	this.renderPromise.then( function () {
		self.$pending = self.$element.children( ':first' );
	} );
};

/* Inheritance */
OO.inheritClass( CaptionsPanel, OO.ui.Widget );
OO.mixinClass( CaptionsPanel, ComponentWidget );
OO.mixinClass( CaptionsPanel, OO.ui.mixin.PendingElement );

/**
 * @param {datamodel.MediaInfo} mediaInfo
 * @return {Object} An object with langCodes as keys and CaptionData objects as values
 * @private
 */
CaptionsPanel.prototype.captionsDataFromMediaInfoEntity = function ( mediaInfo ) {
	var captionsData = {};
	if ( mediaInfo.labels !== undefined ) {
		Object.keys( mediaInfo.labels ).forEach( function ( langCode ) {
			captionsData[ langCode ] = new CaptionData(
				langCode,
				mediaInfo.labels[ langCode ].value
			);
		} );
	}
	return captionsData;
};

/**
 * @param {Object} captionsData An object with langCodes as keys and CaptionData objects as values
 * @return {{captionsData:Object, orderedLanguageCodes:Array}}
 */
CaptionsPanel.prototype.getCaptionsState = function ( captionsData ) {
	// ensure we have the interface language
	captionsData = this.ensureCaptionDataArrayHasLanguage(
		captionsData,
		this.languageFallbackChain[ 0 ]
	);

	if ( this.canEdit ) {
		captionsData = this.addCaptionsDataForUserLanguages( captionsData );
	}

	return {
		captionsData: captionsData,
		orderedLanguageCodes: this.getOrderedLangCodes( captionsData )
	};
};

/**
 * If the input object does not have a CaptionData object for the specified langCode, add a
 * blank one
 *
 * @param {Object} captionDataArray Object with langCodes as keys and CaptionData objects as values
 * @param {string} langCode
 * @return {Object} Object with langCodes as keys and CaptionData objects as values
 * @private
 */
CaptionsPanel.prototype.ensureCaptionDataArrayHasLanguage = function (
	captionDataArray,
	langCode
) {
	if ( captionDataArray[ langCode ] === undefined ) {
		captionDataArray[ langCode ] = new CaptionData( langCode );
	}
	return captionDataArray;
};

/**
 * If the input object does not have a CaptionData object for each user language,
 * add a blank one
 *
 * @param {Object} captionDataArray Object with langCodes as keys and CaptionData objects as values
 * @return {Object} Object with langCodes as keys and CaptionData objects as values
 * @private
 */
CaptionsPanel.prototype.addCaptionsDataForUserLanguages = function ( captionDataArray ) {
	var self = this;
	// Create CaptionData objects for user languages that we don't already have on the screen
	this.userLanguages.forEach( function ( langCode ) {
		captionDataArray = self.ensureCaptionDataArrayHasLanguage( captionDataArray, langCode );
	} );
	return captionDataArray;
};

/**
 * Returns a list of langCodes from captionDataArray, ordered based on the rules specified
 * in the class comments
 *
 * @param {Object} captionDataArray Object with langCodes as keys and CaptionData objects as values
 * @return {Array}
 * @private
 */
CaptionsPanel.prototype.getOrderedLangCodes = function ( captionDataArray ) {
	var i,
		captionLanguages = Object.keys( captionDataArray ),
		rearrangedCaptionLanguages = [];

	// First language in fallback chain (i.e. the interface language) is always first
	rearrangedCaptionLanguages.push( this.languageFallbackChain[ 0 ] );

	// If there is no data for the interface language, then the first language in the fallback
	// chain with a value goes next
	if (
		typeof captionDataArray[ this.languageFallbackChain[ 0 ] ] !== CaptionData ||
		captionDataArray[ this.languageFallbackChain[ 0 ] ].text !== ''
	) {
		for ( i = 1; i < this.languageFallbackChain.length; i++ ) {
			if (
				captionDataArray[ this.languageFallbackChain[ i ] ] &&
				captionDataArray[ this.languageFallbackChain[ i ] ].text !== ''
			) {
				rearrangedCaptionLanguages.push( this.languageFallbackChain[ i ] );
				break;
			}
		}
	}

	// User languages go next
	this.userLanguages.forEach( function ( langCode ) {
		if ( rearrangedCaptionLanguages.indexOf( langCode ) === -1 ) {
			rearrangedCaptionLanguages.push( langCode );
		}
	} );

	// And finally all other languages
	captionLanguages.forEach( function ( langCode ) {
		if ( rearrangedCaptionLanguages.indexOf( langCode ) === -1 ) {
			rearrangedCaptionLanguages.push( langCode );
		}
	} );

	return rearrangedCaptionLanguages;
};

/**
 * @return {Object|jQuery.Promise<Object>}
 */
CaptionsPanel.prototype.getTemplateData = function () {
	if ( this.state.editing === true ) {
		return this.getTemplateDataEditable();
	} else {
		return this.getTemplateDataReadOnly();
	}
};

/**
 * @return {Object|jQuery.Promise<Object>}
 */
CaptionsPanel.prototype.getTemplateDataEditable = function () {
	var self = this,
		templateCaptions = [],
		data = {
			editing: true,
			title: mw.msg( 'wikibasemediainfo-entitytermsforlanguagelistview-caption' ),
			editActionsWidget: this.editActionsWidget
		},
		inputErrorFound = false;

	Object.keys( this.state.captionsDataEditors ).forEach( function ( guid ) {
		var captionDataEditor = self.state.captionsDataEditors[ guid ];

		templateCaptions.push( {
			show: true,
			empty: false,
			textDirection: $.uls.data.getDir( captionDataEditor.getLanguageCode() ),
			langCode: captionDataEditor.getLanguageCode(),
			language: captionDataEditor.getLanguageSelector(),
			caption: captionDataEditor.getTextInput(),
			deleter: captionDataEditor.getDeleter(),
			inputError: captionDataEditor.getInputError(),
			inputWarning: captionDataEditor.getInputWarning()
		} );

		if ( captionDataEditor.getInputError() !== '' ) {
			inputErrorFound = true;
		}
	} );
	data.captions = templateCaptions;

	if ( !this.hasChanges() ) {
		data.editActionsWidget.disablePublish();
	} else {
		if ( inputErrorFound ) {
			data.editActionsWidget.disablePublish();
		} else {
			data.editActionsWidget.enablePublish();
		}
	}

	return data;
};

/**
 * @return {Object|jQuery.Promise<Object>}
 */
CaptionsPanel.prototype.getTemplateDataReadOnly = function () {
	var self = this,
		templateCaptions = [],
		showCaptionFlags = this.getShowCaptionFlagsByLangCode(),
		count = 0,
		data;

	// basic template data
	data = {
		editing: false,
		title: mw.msg( 'wikibasemediainfo-entitytermsforlanguagelistview-caption' )
	};

	// the "edit" button
	if ( this.canEdit ) {
		data.editToggle = new OO.ui.ButtonWidget( {
			label: mw.msg( 'wikibasemediainfo-filepage-edit' ),
			framed: false,
			flags: 'progressive',
			title: mw.msg( 'wikibasemediainfo-filepage-edit-captions' ),
			classes: [ 'wbmi-entityview-editButton' ]
		} );
		data.editToggle.connect( this, { click: [ 'makeEditable' ] } );
	} else {
		data.editToggle = '';
	}

	// "see X more languages"/"see fewer languages" link
	if ( self.getHideableLanguageCount() > 0 ) {
		data.languagesViewWidget = new OO.ui.ButtonWidget( {
			icon: this.state.displayAllLanguages ? 'collapse' : 'expand',
			flags: 'progressive',
			framed: false,
			label: this.state.displayAllLanguages ?
				mw.msg( 'wikibasemediainfo-filepage-fewer-languages' ) :
				mw.msg(
					'wikibasemediainfo-filepage-more-languages',
					self.getHideableLanguageCount()
				)
		} ).on(
			'click',
			this.setState.bind( this, { displayAllLanguages: !this.state.displayAllLanguages } )
		);
	}

	// captions data
	this.state.orderedLanguageCodes.forEach( function ( langCode ) {
		var captionData = self.state.captionsData[ langCode ],
			language,
			caption;

		language = captionData.languageText;
		caption = captionData.text ?
			mw.html.escape( captionData.text ) :
			mw.message( 'wikibasemediainfo-filepage-caption-empty' ).escaped();

		templateCaptions.push( {
			show: self.state.displayAllLanguages ? true : showCaptionFlags[ langCode ],
			index: count,
			textDirection: captionData.direction,
			langCode: captionData.languageCode,
			language: language,
			caption: caption,
			empty: captionData.text === ''
		} );
		count++;

	} );
	data.captions = templateCaptions;

	return data;
};

/**
 * Triggered when cancelling the edit mode.
 */
CaptionsPanel.prototype.onCancel = function () {
	var self = this;

	if ( this.hasChanges() ) {
		OO.ui.confirm(
			mw.msg( 'wikibasemediainfo-filepage-cancel-confirm' ),
			{
				title: mw.msg( 'wikibasemediainfo-filepage-cancel-confirm-title' ),
				actions: [
					{
						action: 'accept',
						label: mw.msg( 'wikibasemediainfo-filepage-cancel-confirm-accept' ),
						flags: [ 'primary', 'destructive' ]
					},
					{
						action: 'reject',
						label: mw.msg( 'ooui-dialog-message-reject' ),
						flags: 'safe'
					}
				]
			}
		).then( function ( confirmed ) {
			if ( confirmed ) {
				self.restoreToSaved();
			}
		} );
	} else {
		this.restoreToSaved();
	}
};

/**
 * Recreate this.state.captionsDataEditors with one element removed, and update
 * this.state.captionsData
 *
 * @param {string} guidToRemove
 */
CaptionsPanel.prototype.onCaptionDeleted = function ( guidToRemove ) {
	var modifiedCaptionsDataEditors = $.extend( {}, this.state.captionsDataEditors );
	delete modifiedCaptionsDataEditors[ guidToRemove ];
	this.setState( {
		captionsDataEditors: modifiedCaptionsDataEditors
	} ).then( this.onDataChanged.bind( this ) );
};

/**
 * 1. Make sure each language can only be selected once
 * 2. Update the direction of textInputs based on selected languages
 * 3. Update this.state.captions from this.state.captionsDataEditors
 */
CaptionsPanel.prototype.onDataChanged = function () {
	var self = this, captionsData = {};
	this.refreshLanguageSelectorsOptions();
	Object.keys( this.state.captionsDataEditors ).forEach( function ( guid ) {
		var langSelector = self.state.captionsDataEditors[ guid ].languageSelector,
			langCode = langSelector.getValue(),
			textInput = self.state.captionsDataEditors[ guid ].textInput;
		if ( langCode ) {
			textInput.setDir( $.uls.data.getDir( langCode ) );
			if ( textInput.getValue() ) {
				captionsData[ langCode ] = new CaptionData(
					langCode,
					textInput.getValue()
				);
			}
		}
	} );
	this.setState( this.getCaptionsState( captionsData ) );
};

/**
 * Restores to a read-only view with the saved captions data
 */
CaptionsPanel.prototype.restoreToSaved = function () {
	var restoredState = $.extend( {}, this.getCaptionsState( this.savedCaptionsData ), {
		editing: false,
		disabled: false
	} );
	this.setState( restoredState );
};

/**
 * Gets all languages that we accept captions for EXCEPT languages in excludeLanguages
 *
 * @param {string[]} excludeLanguages Languages to exclude from the return array
 * @return {Object} Lang codes as keys, lang names in interface language as values
 * @private
 */
CaptionsPanel.prototype.getAvailableLanguages = function ( excludeLanguages ) {
	var languages = {};
	$.extend( languages, wbTermsLanguages );
	( excludeLanguages || [] ).forEach( function ( languageCode ) {
		delete languages[ languageCode ];
	} );
	return languages;
};

/**
 * Make sure available languages in each language selector don't include languages that are
 * selected in another selector
 *
 * @private
 */
CaptionsPanel.prototype.refreshLanguageSelectorsOptions = function () {
	var self = this,
		currentlySelectedLanguages = [],
		captionsDataEditors = this.state.captionsDataEditors;

	Object.keys( captionsDataEditors ).forEach( function ( guid ) {
		currentlySelectedLanguages.push( captionsDataEditors[ guid ].languageSelector.getValue() );
	} );
	Object.keys( captionsDataEditors ).forEach( function ( guid ) {
		captionsDataEditors[ guid ].languageSelector.updateLanguages(
			self.getAvailableLanguages(
				currentlySelectedLanguages.filter( function ( langCode ) {
					return langCode !== captionsDataEditors[ guid ].languageSelector.getValue();
				} )
			)
		);
	} );
};

/**
 * @return {boolean} True if any captions have been changed/added/deleted
 */
CaptionsPanel.prototype.hasChanges = function () {
	var self = this,
		nonEmptyCaptionsData = {},
		hasChanges;
	hasChanges = Object.keys( this.state.captionsData ).some( function ( langCode ) {
		if ( self.state.captionsData[ langCode ].text !== '' ) {
			nonEmptyCaptionsData[ langCode ] = self.state.captionsData[ langCode ];
			if ( !self.savedCaptionsData[ langCode ] ) {
				hasChanges = true;
				return true;
			} else if (
				self.state.captionsData[ langCode ].text !== self.savedCaptionsData[ langCode ].text
			) {
				hasChanges = true;
				return true;
			}
		}
		return false;
	} );
	if (
		Object.keys( nonEmptyCaptionsData ).length !==
		Object.keys( this.savedCaptionsData ).length
	) {
		hasChanges = true;
	}
	return hasChanges;
};

/**
 * Get a value object for sending data to the api
 *
 * @param {string} language Language code
 * @param {string} text Caption text
 * @return {{bot: number, action: string, id, value: *, language: *}} Value object
 * @private
 */
CaptionsPanel.prototype.getWbSetLabelParams = function ( language, text ) {
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
	// Don't send baserevid unless we already have saved captions (a quirk of the api)
	if ( Object.keys( this.savedCaptionsData ).length > 0 ) {
		apiParams.baserevid = mw.mediaInfo.structuredData.currentRevision;
	}
	return apiParams;
};

/**
 * Returns an object containing of showCaption flags for each element of labelsData, indexed by
 * langCode. Flags are set to true if a caption *must always* be shown
 *
 * See class comments for rules on when to show/hide captions
 *
 * @return {Object}
 * Array of showCaption flags, indexed by langCode
 * @private
 */
CaptionsPanel.prototype.getShowCaptionFlagsByLangCode = function () {
	var self = this,
		firstCaptionIsBlank,
		indexedShowCaptionFlags = {};

	this.state.orderedLanguageCodes.forEach( function ( langCode, index ) {
		var captionData = self.state.captionsData[ langCode ],
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

/**
 * Returns the number of languages which may be hidden from the user
 *
 * See class comments for rules on when to show/hide captions
 *
 * @return {number}
 * @private
 */
CaptionsPanel.prototype.getHideableLanguageCount = function () {
	var showCaptionFlags = this.getShowCaptionFlagsByLangCode();

	return Object.keys( showCaptionFlags ).filter(
		function ( langCode ) {
			return showCaptionFlags[ langCode ] === false;
		}
	).length;
};

CaptionsPanel.prototype.makeEditable = function () {
	var self = this;

	// Show IP address logging notice to anon users
	if ( mw.user.isAnon() ) {
		AnonWarning.notifyOnce();
	}

	// show dialog informing user of licensing
	self.licenseDialogWidget.getConfirmationIfNecessary().then( function () {
		var entityId = mw.config.get( 'wbEntityId' );
		self.pushPending();
		// refresh caption data from the api
		self.api
			.get( {
				action: 'wbgetentities',
				props: 'info|labels',
				ids: entityId
			} )
			.done( function ( result ) {
				mw.mediaInfo.structuredData.currentRevision = result.entities[ entityId ].lastrevid;
				self.savedCaptionsData = self.captionsDataFromMediaInfoEntity(
					result.entities[ entityId ]
				);
			} )
			.fail( function () {
				// Ignore the failure and just make do with the data we already have saved
			} )
			.always( function () {
				var captionsDataEditors = {},
					captionsState = self.getCaptionsState(
						// Copy by value so the saved data isn't modified
						$.extend( {}, self.savedCaptionsData )
					);

				captionsState.orderedLanguageCodes.forEach( function ( langCode ) {
					var guid = self.createGuid();
					captionsDataEditors[ guid ] = self.createCaptionDataEditor(
						guid,
						self.savedCaptionsData[ langCode ] || new CaptionData( langCode )
					);
				} );

				self.setState(
					$.extend(
						captionsState,
						{
							captionsDataEditors: captionsDataEditors,
							editing: true
						}
					)
				).then( function () {
					self.refreshLanguageSelectorsOptions();
					self.popPending();
				} );
			} );
	} );
};

CaptionsPanel.prototype.addNewEmptyLanguageRow = function () {
	var guid = this.createGuid(),
		captionsDataEditors = $.extend(
			{},
			this.state.captionsDataEditors
		);
	captionsDataEditors[ guid ] = this.createCaptionDataEditor( guid, new CaptionData() );
	this.setState( {
		captionsDataEditors: captionsDataEditors
	} ).then( this.refreshLanguageSelectorsOptions.bind( this ) );
};

CaptionsPanel.prototype.sendData = function () {
	var self = this,
		captionsDataEditors = $.extend( {}, this.state.captionsDataEditors ),
		promise = $.Deferred().resolve().promise();

	this.setSending();

	// Send changed data
	Object.keys( captionsDataEditors ).forEach( function ( guid ) {
		var captionDataEditor = captionsDataEditors[ guid ],
			langCode = captionDataEditor.getLanguageCode(),
			text = captionDataEditor.getText(),
			savedData = self.savedCaptionsData[ langCode ];

		if ( text && langCode && ( !savedData || savedData.text !== text ) ) {
			promise = promise.then( function () {
				return self.api.postWithToken(
					'csrf',
					self.getWbSetLabelParams( langCode, text )
				)
					.done( function ( result ) {
						mw.mediaInfo.structuredData.currentRevision = result.entity.lastrevid;
						self.savedCaptionsData[ langCode ] =
							new CaptionData( langCode, text );
					} )
					.fail( function ( errorCode, error ) {
						var apiError =
							wikibase.api.RepoApiError.newFromApiResponse( error, 'save' );
						captionDataEditor.setInputError( apiError.detailedMessage );
					} );
			} );
		}
	} );

	// Delete removed data
	Object.keys( this.savedCaptionsData ).forEach( function ( langCode ) {
		var captionsData = self.state.captionsData[ langCode ];
		if ( !captionsData || captionsData.text === '' ) {
			promise = promise.then( function () {
				return self.api.postWithToken(
					'csrf',
					self.getWbSetLabelParams( langCode, '' )
				)
					.done( function ( result ) {
						mw.mediaInfo.structuredData.currentRevision = result.entity.lastrevid;
						delete self.savedCaptionsData[ langCode ];
					} )
					.fail( function ( errorCode, error ) {
						var apiError =
								wikibase.api.RepoApiError.newFromApiResponse( error, 'save' ),
							guid = self.createGuid(),
							captionDataEditor = self.createCaptionDataEditor( guid, self.savedCaptionsData[ langCode ] );
						captionDataEditor.setInputError( apiError.detailedMessage );
						captionsDataEditors[ guid ] = captionDataEditor;
					} );
			} );
		}
	} );

	promise.then( function () {
		self.setState(
			$.extend(
				{},
				self.getCaptionsState( self.savedCaptionsData ),
				{
					editing: false,
					captionsDataEditors: {},
					displayAllLanguages: true
				}
			)
		);
	} ).catch( function () {
		self.setState( {
			editing: true,
			captionsDataEditors: captionsDataEditors
		} );
	} ).always( function () {
		self.setReady();
	} );
};

/**
 * @param {string} guid
 * @param {CaptionData} captionData
 * @return {CaptionDataEditor}
 */
CaptionsPanel.prototype.createCaptionDataEditor = function ( guid, captionData ) {
	var captionDataEditor = new CaptionDataEditor( guid, captionData, { warnWithinMaxCaptionLength: this.warnWithinMaxCaptionLength } );
	this.enableCaptionDataEditor( captionDataEditor );
	return captionDataEditor;
};

/**
 * @param {CaptionDataEditor} captionDataEditor
 */
CaptionsPanel.prototype.enableCaptionDataEditor = function ( captionDataEditor ) {
	captionDataEditor.setDisabled( false );

	captionDataEditor.connect( this, { captionDeleted: 'onCaptionDeleted' } );
	captionDataEditor.connect( this, { languageSelectorUpdated: 'onDataChanged' } );
	captionDataEditor.connect( this, { textInputChanged: 'onDataChanged' } );
	captionDataEditor.connect( this, { textInputSubmitted: 'sendData' } );
};

/**
 * @param {CaptionDataEditor} captionDataEditor
 */
CaptionsPanel.prototype.disableCaptionDataEditor = function ( captionDataEditor ) {
	captionDataEditor.setDisabled( true );

	captionDataEditor.disconnect( this, { captionDeleted: 'onCaptionDeleted' } );
	captionDataEditor.disconnect( this, { languageSelectorUpdated: 'onDataChanged' } );
	captionDataEditor.disconnect( this, { textInputChanged: 'onDataChanged' } );
	captionDataEditor.disconnect( this, { textInputSubmitted: 'sendData' } );
};

/**
 * Puts the panel into a 'sending' state without re-rendering
 */
CaptionsPanel.prototype.setSending = function () {
	var self = this;
	this.editActionsWidget.setStateSending();
	Object.keys( this.state.captionsDataEditors ).forEach( function ( guid ) {
		self.disableCaptionDataEditor( self.state.captionsDataEditors[ guid ] );
	} );
	this.pushPending();
};

/**
 * Puts the panel into a ready' state without re-rendering
 */
CaptionsPanel.prototype.setReady = function () {
	var self = this;
	this.editActionsWidget.setStateReady();
	Object.keys( this.state.captionsDataEditors ).forEach( function ( guid ) {
		self.enableCaptionDataEditor( self.state.captionsDataEditors[ guid ] );
	} );
	this.popPending();
};

/**
 * Create a GUID for keeping track of CaptionDataEditWidgets
 *
 * @see derived from https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 * @return {string}
 */
CaptionsPanel.prototype.createGuid = function () {
	return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(
		/[x]/g, function () {
			return ( Math.random() * 16 ).toString( 16 ).substring( 0, 1 );
		}
	);
};

CaptionsPanel.prototype.isEditable = function () {
	return this.state.editable;
};

CaptionsPanel.prototype.isDisabled = function () {
	return false;
};

module.exports = CaptionsPanel;
