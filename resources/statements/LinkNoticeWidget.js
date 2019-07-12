'use strict';

/**
 * Dismissable message box which appears above statements UI in both Filepage
 * and UploadWizard.
 * @param {Object} config
 */
var LinkNoticeWidget = function ( config ) {
	var defaults = {
		type: 'warning',
		label: mw.message( 'wikibasemediainfo-statements-link-notice' ).text(),
		classes: [ 'wbmi-link-notice' ]
	};

	this.config = $.extend( defaults, config );
	this.prefKey = 'wbmi-wikidata-link-notice-dismissed';

	LinkNoticeWidget.parent.call( this, this.config );
	this.setIcon( 'info' );

	this.dismissControl = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'close',
		label: mw.message( 'wikibasemediainfo-statements-link-notice-dismiss' ).text(),
		invisibleLabel: true,
		title: mw.message( 'wikibasemediainfo-statements-link-notice-dismiss' ).text(),
		classes: [ 'wbmi-link-notice__dismiss-icon' ]
	} );

	this.$element.append( this.dismissControl.$element );
	this.dismissControl.connect( this, { click: 'dismiss' } );
};

OO.inheritClass( LinkNoticeWidget, OO.ui.MessageWidget );

/**
 * Detach the widget and store the user's decision.
 */
LinkNoticeWidget.prototype.dismiss = function () {
	var storage = mw.storage,
		user = mw.user;

	if ( user.isAnon() ) {
		storage.set( this.prefKey, 1 );
	} else {
		new mw.Api().saveOption( this.prefKey, 1 );
		user.options.set( this.prefKey, 1 );
	}

	this.$element.detach();
};

/**
 * Determines whether or not the widget should be shown to the user. Defaults
 * to true. Type coercion is necessary due to the limitations of browser
 * localstorage.
 * @return {boolean}
 */
LinkNoticeWidget.prototype.isDismissed = function () {
	var storage = mw.storage,
		user = mw.user,
		numVal;

	if ( user.isAnon() ) {
		numVal = Number( storage.get( this.prefKey ) ) || 0;
	} else {
		numVal = Number( user.options.get( this.prefKey ) );
	}

	return Boolean( numVal );
};

module.exports = LinkNoticeWidget;
