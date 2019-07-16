'use strict';

/**
 * Dismissable message box which appears above statements UI in both Filepage
 * and UploadWizard.
 * @param {Object} config
 */
var LinkNoticeWidget = function ( config ) {
	this.prefKey = 'wbmi-wikidata-link-notice-dismissed';

	LinkNoticeWidget.parent.call( this, this.config );

	this.noticeWidget = new OO.ui.MessageWidget( $.extend( {
		type: 'warning',
		label: mw.message( 'wikibasemediainfo-statements-link-notice-text' ).text(),
		classes: [ 'wbmi-link-notice' ]
	}, config ) );
	this.noticeWidget.setIcon( 'info' );

	this.dismissControl = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'close',
		label: mw.message( 'wikibasemediainfo-statements-link-notice-dismiss' ).text(),
		invisibleLabel: true,
		title: mw.message( 'wikibasemediainfo-statements-link-notice-dismiss' ).text(),
		classes: [ 'wbmi-link-notice__dismiss-icon' ]
	} );

	this.dismissControl.connect( this, { click: 'dismiss' } );

	this.render();
};
OO.inheritClass( LinkNoticeWidget, OO.ui.Widget );

LinkNoticeWidget.prototype.render = function () {
	var $container,
		data,
		template;

	this.noticeWidget.$element.append( this.dismissControl.$element );

	data = {
		canDisplay: this.canDisplay(),
		isDismissed: this.isDismissed(),
		noticeWidget: this.noticeWidget
	};

	template = mw.template.get(
		'wikibase.mediainfo.statements',
		'templates/statements/LinkNoticeWidget.mustache+dom'
	);

	$container = template.render( data );
	this.$element.empty().append( $container );
};

/**
 * Store the user's decision and rerender.
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

	this.render();
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

/**
 * Returns whether or not the widget should be be displayed at all, as
 * determined by the presence of the i18n message to be displayed.
 * @return {boolean}
 */
LinkNoticeWidget.prototype.canDisplay = function () {
	var message = mw.message( 'wikibasemediainfo-statements-link-notice-text' );

	// never display if other statements is not enabled, regardless of message
	if ( mw.config.get( 'wbmiEnableOtherStatements', false ) ) {
		return message.exists() && message.text() !== '-';
	} else {
		return false;
	}
};

module.exports = LinkNoticeWidget;
