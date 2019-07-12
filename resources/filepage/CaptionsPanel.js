'use strict';

var AnonWarning = require( './AnonWarning.js' ),
	CaptionData = require( './CaptionData.js' ),
	CaptionsEditActionsWidget = require( './CaptionsEditActionsWidget.js' ),
	LanguagesViewWidget = require( './LanguagesViewWidget.js' ),
	LicenseDialogWidget = require( './LicenseDialogWidget.js' ),
	UlsWidget = require( './UlsWidget.js' ),
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
 * @mixins OO.ui.mixin.PendingElement
 *
 * @constructor
 * @param {Object} [config]
 * @cfg {Object} classes CSS classes of DOM elements
 * @cfg {string} classes.header CSS class of header
 * @cfg {string} classes.content CSS class of content
 * @cfg {string} classes.entityTerm CSS class of entityTerm
 * @cfg {boolean} captionsExist True if there is existing caption data, false if not
 * @cfg {int} warnWithinMaxCaptionLength Show a warning when the caption length is within X
 *   characters of the max
 * @cfg {string[]} userLanguages The language the user has indicated that they use (via babel)
 */
CaptionsPanel = function ( config ) {
	this.config = config || {};

	// Parent constructor
	CaptionsPanel.super.apply( this, arguments );

	// Mixin constructors
	OO.ui.mixin.PendingElement.call( this, this.config );

	this.captionsData = {};
	this.captionsExist = config.captionsExist;
	this.editing = false;
	this.languageSelectors = [];
	this.textInputs = [];

	this.licenseDialogWidget = new LicenseDialogWidget();

	this.editToggle = new OO.ui.ButtonWidget( {
		label: mw.message( 'wikibasemediainfo-filepage-edit' ).text(),
		framed: false,
		flags: 'progressive',
		title: mw.message( 'wikibasemediainfo-filepage-edit-captions' ).text(),
		classes: [ 'wbmi-entityview-editButton' ]
	} );
	this.editToggle.connect( this, { click: 'makeEditable' } );

	this.languagesViewWidget = new LanguagesViewWidget( this.config );

	this.editActionsWidget = new CaptionsEditActionsWidget(
		{ appendToSelector: '.' + config.classes.content },
		this
	);
	// TODO: can we make the dependency on WB object more explicit?
	this.api = wikibase.api.getLocationAgnosticMwApi(
		mw.config.get(
			'wbmiRepoApiUrl',
			mw.config.get( 'wbRepoApiUrl' )
		)
	);
	this.selectors = {};
	this.selectors.content = '.' + this.config.classes.content;
	this.selectors.entityTerm = '.' + this.config.classes.entityTerm;
	this.captionLanguagesDataAttr = 'data-caption-languages';

	this.userLanguages = this.config.userLanguages || [];
};

/* Inheritance */
OO.inheritClass( CaptionsPanel, OO.ui.Element );
OO.mixinClass( CaptionsPanel, OO.ui.mixin.PendingElement );

/**
 * @param {Object} $row jquery object representing a caption language and value in the DOM
 * @return {CaptionData} The data contained in the row
 * @private
 */
CaptionsPanel.prototype.readDataFromReadOnlyRow = function ( $row ) {
	var $language = $row.find( '.wbmi-language-label' ),
		$caption = $row.find( '.wbmi-caption-value' );
	return new CaptionData(
		$language.attr( 'lang' ),
		$caption.hasClass( 'wbmi-entityview-emptyCaption' ) ? '' : $caption.text()
	);
};

/**
 * Get the caption data for a language
 * @param {string} languageCode
 * @return {CaptionData} Caption data for a language
 * @private
 */
CaptionsPanel.prototype.getDataForLangCode = function ( languageCode ) {
	var captionData = new CaptionData( languageCode, '' );
	if ( this.captionsData[ languageCode ] !== undefined ) {
		captionData = this.captionsData[ languageCode ];
	}
	return captionData;
};

/**
 * Create a DOM element containing caption data
 *
 * @param {int} index Elements containing caption data are indexed in order from 0
 * @param {string} languageCode Language code
 * @param {string} direction 'rtl' or 'ltr'
 * @param {string} languageContent The name of the language in the current interface language
 * @param {string} captionContent The actual text of the caption
 * @param {boolean} showCaption True to show the caption when the page is loaded
 * @return {jQuery} DOM element
 * @private
 */
CaptionsPanel.prototype.createCaptionRow = function (
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

	rowClasses = [ this.config.classes.entityTerm ];
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

/**
 * Create a read-only DOM element containing caption data
 *
 * @param {int} index Elements containing caption data are indexed in order from 0
 * @param {CaptionData} captionData The caption data
 * @param {boolean} showCaption True to show the caption when the page is loaded
 * @return {jQuery} DOM element
 * @private
 */
CaptionsPanel.prototype.createIndexedReadOnlyRow = function (
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

/**
 * Refresh the indices of the DOM elements containing caption data so that they start at 0 and
 * proceed in ascending order
 *
 * @private
 */
CaptionsPanel.prototype.refreshRowIndices = function () {
	$( this.selectors.content ).find( this.selectors.entityTerm ).each( function ( index ) {
		$( this ).attr( 'data-index', index );
	} );
};

/**
 * Adds DOM elements containing empty captions data for every user language that doesn't already
 * have data, and re-orders
 *
 * Should only be called on initialisation, because it relies on only the interface language
 * (and possible the first fallback, if the interface language has no caption) having the
 * 'wbmi-entityview-showLabel' class
 *
 * @private
 */
CaptionsPanel.prototype.addCaptionsDataForUserLanguages = function () {
	var self = this,
		captionsOrderHasChanged;

	// Create CaptionData objects for user languages that we don't already have on the screen
	this.userLanguages.forEach( function ( langCode ) {
		var caption;

		if (
			Object.prototype.hasOwnProperty.call( self.captionsData, langCode ) === false
		) {
			caption = new CaptionData( langCode, '' );
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
 * (and possibly the first fallback, if the interface language has no caption) having the
 * 'wbmi-entityview-showLabel' class
 *
 * @return {boolean} True if the language list order has changed
 * @private
 */
CaptionsPanel.prototype.reorderLanguageList = function () {
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
	return rearrangedCaptionLanguages !== captionLanguages;
};

/**
 * @return {string[]} A list of languages for which there are captions
 * @private
 */
CaptionsPanel.prototype.getCaptionLanguagesList = function () {
	var knownLanguages = Object.keys( $.uls.data.languages ),
		captionLanguagesData = $( this.selectors.content ).attr( this.captionLanguagesDataAttr ) || '';

	return captionLanguagesData.split( ',' )
		// Drop languages that ULS doesn't know about
		.filter( function ( languageCode ) {
			return ( knownLanguages.indexOf( languageCode ) !== -1 );
		} );
};

/**
 * Saves the list of languages that have captions into the DOM
 *
 * @param {string[]} languagesList Lang codes for languages that have captions
 * @private
 */
CaptionsPanel.prototype.setCaptionLanguagesList = function ( languagesList ) {
	$( this.selectors.content ).attr(
		this.captionLanguagesDataAttr,
		languagesList.join( ',' )
	);
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
	$.extend( languages, mw.config.get( 'wbTermsLanguages' ) );
	( excludeLanguages || [] ).forEach( function ( languageCode ) {
		delete languages[ languageCode ];
	} );
	return languages;
};

/**
 * @private
 */
CaptionsPanel.prototype.refreshLanguageSelectorsOptions = function () {
	var self = this,
		currentlySelectedLanguages = [];

	this.languageSelectors.forEach( function ( languageSelector ) {
		currentlySelectedLanguages.push( languageSelector.getValue() );
	} );
	this.languageSelectors.forEach( function ( languageSelector ) {
		languageSelector.updateLanguages(
			self.getAvailableLanguages(
				currentlySelectedLanguages.filter( function ( langCode ) {
					return langCode !== languageSelector.getValue();
				} )
			)
		);
	} );
};

/**
 * Update DOM with errors on text input  - connected to text input 'change' events
 *
 *  @param {string} textInput caption text
 *  @private
 */
CaptionsPanel.prototype.warnIfTextApproachingLimit = function ( textInput ) {
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
 * @return {Array<Promise>} show/hide error messages when resolved
 * @private
 */
CaptionsPanel.prototype.validateCaptionsAndReturnUpdates = function () {
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
 * @return {boolean} True if any captions have been changed/added/deleted
 */
CaptionsPanel.prototype.hasChanges = function () {
	var $captions, hasChanges,
		self = this;

	$captions = $( self.selectors.content ).find( self.selectors.entityTerm );
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

CaptionsPanel.prototype.isEditable = function () {
	return this.editing;
};

/**
 * Enable/Disable publish button based on presence of captions changes
 *
 * @private
 */
CaptionsPanel.prototype.refreshPublishState = function () {
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
 *
 * @private
 */
CaptionsPanel.prototype.onCaptionsChange = function () {
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

/**
 * @param {jQuery} $row jQuery element representing language/caption in the DOM
 * @return {OO.ui.ButtonWidget} deleter OOUI widget to delete a single caption from the DOM
 * @private
 */
CaptionsPanel.prototype.createRowDeleter = function ( $row ) {
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

/**
 * Create an indexed jquery element that allows editing of a caption (ULS for lang,
 * textbox for caption)
 *
 * @param {int} index The index of the DOM element (starting at 0, in ascending order on the page)
 * @param {string[]} [captionLangCodes] Lang codes for existing captions
 * @param {CaptionData} [captionData] Data for the caption if it already exists
 * @return {jQuery} jquery element
 * @private
 */
CaptionsPanel.prototype.createIndexedEditableRow = function (
	index, captionLangCodes, captionData
) {
	var self = this,
		languageSelector,
		textInput,
		$row;

	if ( captionData === undefined ) {
		captionData = new CaptionData();
	}

	captionLangCodes = captionLangCodes || [];
	captionData = captionData || {};

	languageSelector = new UlsWidget( {
		languages: this.getAvailableLanguages(
			captionLangCodes.filter( function ( langCode ) {
				return langCode !== captionData.languageCode;
			} )
		)
	} );
	if ( captionData.languageCode !== '' ) {
		languageSelector.setValue( captionData.languageCode );
	}
	languageSelector.on( 'select', function () {
		var dir,
			$parentRow;
		self.refreshLanguageSelectorsOptions();
		dir = $.uls.data.getDir( languageSelector.getValue() );
		$parentRow = languageSelector.$element.parents( self.selectors.entityTerm );
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
	$row.append( this.createRowDeleter( $row ).$element );
	return $row;
};

/**
 * @return {string[]} Any languages for which captions have been removed
 * @private
 */
CaptionsPanel.prototype.findRemovedLanguages = function () {
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

/**
 * @private
 */
CaptionsPanel.prototype.disableAllFormInputs = function () {
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

/**
 * @private
 */
CaptionsPanel.prototype.enableAllFormInputs = function () {
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
	if ( this.captionsExist === true ) {
		apiParams.baserevid = mw.mediaInfo.structuredData.currentRevision;
	}
	return apiParams;
};

/**
 * Send an individual caption to the backend
 *
 * @param {int} index Index to keep track of what's been sent (starts at 0)
 * @param {string} language Language of the caption
 * @param {string} text Text of the caption
 * @return {Promise} Promise for chaining
 * @private
 */
CaptionsPanel.prototype.sendIndividualLabel = function ( index, language, text ) {
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
			self.captionsData[ language ] = new CaptionData( language, text );
			mw.mediaInfo.structuredData.currentRevision = result.entity.lastrevid;
			$( self.selectors.content )
				.find( self.selectors.entityTerm + '[data-index="' + index + '"]' )
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
			deferred.resolve();
		} )
		.fail( function ( errorCode, error ) {
			var rejection = wikibase.api.RepoApiError.newFromApiResponse( error, 'save' );

			rejection.index = index;
			deferred.reject( rejection );
		} )
		.always( function () {
			textInput.connect( self, { change: 'onCaptionsChange' } );
		} );
	return deferred.promise();
};

/**
 * @param {Promise} chain Promise chain to add to
 * @return {Promise} Promise chain with new promise added
 * @private
 */
CaptionsPanel.prototype.sendDataToAPI = function ( chain ) {
	var self = this,
		rowsWithoutLanguage = [];

	$( this.selectors.content ).find( this.selectors.entityTerm ).each( function () {
		var showCaptionFlags,
			index = $( this ).attr( 'data-index' ),
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
			showCaptionFlags = self.getShowCaptionFlagsByLangCode();
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

/**
 * @param {string} langCodeToDelete The language code of the label to be deleted
 * @return {Promise} Promise from async 'delete' api call
 * @private
 */
CaptionsPanel.prototype.deleteIndividualLabel = function ( langCodeToDelete ) {
	var self = this,
		deferred = $.Deferred(),
		$captionsContent = $( this.selectors.content );
	this.api.postWithToken(
		'csrf',
		this.getWbSetLabelParams( langCodeToDelete, '' )
	)
		.done( function ( result ) {
			var updatedCaptionLanguages,
				captionLanguages = self.getCaptionLanguagesList();
			// Update revision id
			mw.mediaInfo.structuredData.currentRevision = result.entity.lastrevid;
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
				updatedCaptionLanguages = [];
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
			$captionsContent.find( self.selectors.entityTerm ).each( function () {
				var dataInRow = self.readDataFromReadOnlyRow( $( this ) );
				currentlyDisplayedLanguages.push( dataInRow.languageCode );
			} );
			newIndex = $captionsContent.find( self.selectors.entityTerm ).length;
			errorRow = self.createIndexedEditableRow(
				newIndex,
				currentlyDisplayedLanguages,
				self.captionsData[ langCodeToDelete ]
			);
			errorRow.insertBefore( $captionsContent.find( '.wbmi-entityview-editActions' ) );
			rejection = wikibase.api.RepoApiError.newFromApiResponse( error, 'save' );
			rejection.index = newIndex;
			self.editActionsWidget.disablePublish();
			deferred.reject( rejection );
		} );
	return deferred.promise();
};

/**
 * @param {Promise} chain Promise chain to add async api call to
 * @param {string[]} removedLanguages Array of languages for which captions have been deleted
 * @return {Promise} Promise chain with all delete api calls added
 * @private
 */
CaptionsPanel.prototype.deleteRemovedData = function ( chain, removedLanguages ) {
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

/**
 * @return {Promise} Promise returned from async refresh api call
 * @private
 */
CaptionsPanel.prototype.refreshDataFromApi = function () {
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
			mw.mediaInfo.structuredData.currentRevision = result.entities[ entityId ].lastrevid;
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
					refreshedLabelsData[ languageCode ] = new CaptionData(
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

/**
 * @private
 */
CaptionsPanel.prototype.redrawCaptionsContent = function () {
	var self = this,
		$captionsContent = $( this.selectors.content ),
		showCaptionFlags = this.getShowCaptionFlagsByLangCode(),
		count = 0,
		languageCodesInOrder = this.getCaptionLanguagesList();

	$captionsContent.find( this.selectors.entityTerm ).each( function () {
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
 * @return {Object} Array of showCaption flags, indexed by langCode
 * @private
 */
CaptionsPanel.prototype.getShowCaptionFlagsByLangCode = function () {
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

CaptionsPanel.prototype.makeEditable = function () {
	var self = this;

	// Show IP address logging notice to anon users
	if ( mw.user.isAnon() ) {
		AnonWarning.notifyOnce();
	}

	// show dialog informing user of licensing
	self.licenseDialogWidget.getConfirmationIfNecessary().then( function () {
	// Set the target pending element to the layout box
		self.$pending = $( '.' + self.config.classes.header ).parent();
		self.pushPending();

		self.refreshDataFromApi()
			.always( function () {
				var $captionsContent, captionLangCodes;

				self.redrawCaptionsContent();
				$captionsContent = $( self.selectors.content );
				$captionsContent.addClass( 'wbmi-entityview-editable' );
				self.editToggle.$element.hide();
				self.languagesViewWidget.hide();
				self.editActionsWidget.show();
				self.editActionsWidget.disablePublish();
				captionLangCodes = [];
				$captionsContent.find( self.selectors.entityTerm ).each( function () {
					var dataInRow = self.readDataFromReadOnlyRow( $( this ) );
					captionLangCodes.push( dataInRow.languageCode );
				} );
				$captionsContent.find( self.selectors.entityTerm ).each( function ( index ) {
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
				self.editing = true;
			} );
	} );
};

CaptionsPanel.prototype.makeReadOnly = function () {
	var $captionsContent = $( this.selectors.content );

	this.editing = false;
	$captionsContent.removeClass( 'wbmi-entityview-editable' );
	this.editActionsWidget.hide();
	this.redrawCaptionsContent();
	this.languagesViewWidget.expand();
	this.editToggle.$element.show();
};

CaptionsPanel.prototype.addNewEditableLanguageRow = function () {
	var $captionsContent = $( this.selectors.content ),
		row = this.createIndexedEditableRow(
			$captionsContent.find( this.selectors.entityTerm ).length
		);
	row.insertBefore( $captionsContent.find( '.wbmi-entityview-editActions' ) );
	this.refreshLanguageSelectorsOptions();
};

CaptionsPanel.prototype.sendData = function () {
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
				$( self.selectors.content ).find(
					self.selectors.entityTerm + '[data-index="' + error.index + '"] .wbmi-caption-value'
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

CaptionsPanel.prototype.initialize = function () {
	var self = this;

	// Only allow editing if we're NOT on a diff page or viewing an older revision
	// eslint-disable-next-line no-jquery/no-global-selector
	if ( $( '.diff-currentversion-title' ).length === 0 && $( '.mw-revision' ).length === 0 ) {
		$( '.' + this.config.classes.header ).append( this.editToggle.$element );
	}

	$( this.selectors.content ).find( this.selectors.entityTerm ).each( function ( index ) {
		var captionData;
		$( this ).attr( 'data-index', index );
		captionData = self.readDataFromReadOnlyRow( $( this ) );
		self.captionsData[ captionData.languageCode ] = captionData;
	} );
	this.addCaptionsDataForUserLanguages();
	this.languagesViewWidget.refreshLabel();
	this.languagesViewWidget.collapse();
};

module.exports = CaptionsPanel;
