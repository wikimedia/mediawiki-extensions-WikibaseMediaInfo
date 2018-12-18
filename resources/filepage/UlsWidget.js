( function ( sd, OO ) {

	/**
	 * A ULS widget for the captions section of the structured data in a File page
	 *
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {Object} [languages] Keys are 2-letter language codes, values are language autonyms
	 */
	sd.UlsWidget = function UlsWidget( config ) {
		sd.UlsWidget.parent.call( this );

		// create an empty dropdown to give this element the appearance of a dropdown,
		// even though it'll show a ULS widget when opened
		this.dropdown = new OO.ui.DropdownWidget( $.extend( {}, config, {
			menu: {}
		} ) );
		this.$element.append( this.dropdown.$element );

		// Show the ULS when a user tabs into the language selection field
		this.dropdown.$handle.on( 'keyup', function ( e ) {
			if ( e.key === 'Tab' ) {
				$( this ).click();
			}
		} );

		this.initialiseUls( config.languages );
	};
	OO.inheritClass( sd.UlsWidget, OO.ui.Widget );
	OO.mixinClass( sd.UlsWidget, OO.EventEmitter );

	/**
	 * @param {Object} [languages] Keys are 2-letter language codes, values are language autonyms
	 */
	sd.UlsWidget.prototype.initialiseUls = function ( languages ) {
		var ulsWidget = this;

		this.languages = languages;

		this.uls = this.dropdown.$handle.uls( {
			onSelect: function ( language ) {
				ulsWidget.setValue( language );
				ulsWidget.dropdown.$handle.focus();
			},
			languages: languages,
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
	sd.UlsWidget.prototype.updateLanguages = function ( languages ) {
		this.uls.off().removeData( 'uls' );
		this.initialiseUls( languages );
	};

	/**
	 * @param {string} value 2-letter language code
	 */
	sd.UlsWidget.prototype.setValue = function ( value ) {
		var current = this.languageValue;
		this.languageValue = value;
		// T209380: We want this to be the language autonym for the display value
		this.dropdown.setLabel( $.uls.data.getAutonym( value ) );
		if ( current !== value ) {
			this.emit( 'select' );
		}
	};

	/**
	 * @return {string} 2-letter language code
	 */
	sd.UlsWidget.prototype.getValue = function () {
		return this.languageValue;
	};

}( mw.mediaInfo.structuredData, OO ) );
