'use strict';

var UlsWidget;

/**
 * @constructor
 * @param {Object} [config]
 * @param {Object} [config.languages] Keys are 2-letter language codes, values are language autonyms
 * @param {Object} [config.language] Language code for default language
 * @param {Object} [config.label] Label for dropdown
 */
UlsWidget = function ( config ) {
	this.languageValue = '';
	this.label = config.label || '';

	// create an empty dropdown to give this element the appearance of a dropdown,
	// even though it'll show a ULS widget when opened
	this.dropdown = new OO.ui.DropdownWidget( $.extend( {}, config, {
		classes: [ 'wbmi-input-uls' ],
		menu: {},
		label: this.label
	} ) );

	// Show the ULS when a user tabs into the language selection field
	this.dropdown.$handle.on( 'keyup', function ( e ) {
		if ( e.key === 'Tab' ) {
			$( this ).trigger( 'click' );
		}
	} );

	this.initialiseUls( config.languages );

	if ( config.language ) {
		this.setValue( config.language );
	}

	UlsWidget.parent.call( this );
	this.$element = this.dropdown.$element;
};
OO.inheritClass( UlsWidget, OO.ui.Widget );

/**
 * @param {Object} [languages] Keys are 2-letter language codes, values are language autonyms
 */
UlsWidget.prototype.initialiseUls = function ( languages ) {
	var ulsWidget = this;

	this.languages = languages;

	this.uls = this.dropdown.$handle.uls( {
		onSelect: function ( language ) {
			ulsWidget.setValue( language );
			ulsWidget.dropdown.$handle.focus();
		},
		onReady: function () {
			// ULS throws away languages for which it doesn't have any data,
			// but we still want to allow/accept them when users input that
			// language code manually
			// this hacky little bit will repopulate the language list
			this.languages = ulsWidget.languages;
			this.recreateLanguageFilter();
		},
		// clone languages list: uls will mess with it internally,
		// removing languages it doesn't know
		languages: $.extend( {}, languages ),
		onVisible: function () {
			// Re-position the ULS *after* the widget has been rendered, so that we can be
			// sure it's in the right place
			var offset = ulsWidget.$element.offset();
			if ( this.$menu.css( 'direction' ) === 'rtl' ) {
				offset.left = offset.left - parseInt( this.$menu.css( 'width' ) ) + ulsWidget.$element.width();
			}
			this.$menu.css( offset );
		}
	} );
};

/**
 * @param {Object} [languages] Keys are 2-letter language codes, values are language autonyms
 */
UlsWidget.prototype.updateLanguages = function ( languages ) {
	this.uls.off().removeData( 'uls' );
	this.initialiseUls( languages );
};

/**
 * @param {string} value 2-letter language code
 */
UlsWidget.prototype.setValue = function ( value ) {
	var current = this.languageValue;
	this.languageValue = value;

	// T209380: We want this to be the language autonym for the display value
	this.dropdown.setLabel( $.uls.data.getAutonym( value ) || this.label );
	if ( current !== value ) {
		this.emit( 'select' );
	}
};

/**
 * @return {string} 2-letter language code
 */
UlsWidget.prototype.getValue = function () {
	return this.languageValue;
};

/**
 * @param {boolean} disabled
 */
UlsWidget.prototype.setDisabled = function ( disabled ) {
	this.dropdown.setDisabled( disabled );
	UlsWidget.parent.prototype.setDisabled.call( this, disabled );
};

module.exports = UlsWidget;
