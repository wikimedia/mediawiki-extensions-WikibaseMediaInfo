'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	LinkNoticeWidget;

/**
 * Dismissable message box which appears above statements UI in both Filepage
 * and UploadWizard.
 *
 * @param {Object} config
 */
LinkNoticeWidget = function ( config ) {
	this.prefKey = 'wbmi-wikidata-link-notice-dismissed';

	this.state = {
		isDismissed: this.isDismissed(),
		canDisplay: this.canDisplay()
	};

	LinkNoticeWidget.parent.call( this, config );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/LinkNoticeWidget.mustache+dom'
	);
};
OO.inheritClass( LinkNoticeWidget, OO.ui.Widget );
OO.mixinClass( LinkNoticeWidget, ComponentWidget );

/**
 * @inheritDoc
 */
LinkNoticeWidget.prototype.getTemplateData = function () {
	var noticeWidget, dismissControl;

	noticeWidget = new OO.ui.MessageWidget( {
		type: 'warning',
		label: mw.msg( 'wikibasemediainfo-statements-link-notice-text' ),
		classes: [ 'wbmi-link-notice' ]
	} );
	noticeWidget.setIcon( 'info' );

	dismissControl = new OO.ui.ButtonWidget( {
		framed: false,
		icon: 'close',
		label: mw.msg( 'wikibasemediainfo-statements-link-notice-dismiss' ),
		invisibleLabel: true,
		title: mw.msg( 'wikibasemediainfo-statements-link-notice-dismiss' ),
		classes: [ 'wbmi-link-notice__dismiss-icon' ]
	} );

	noticeWidget.$element.append( dismissControl.$element );
	dismissControl.connect( this, { click: 'dismiss' } );

	return {
		canDisplay: this.state.canDisplay,
		isDismissed: this.state.isDismissed,
		noticeWidget: noticeWidget
	};
};

/**
 * Store the user's decision and rerender.
 *
 * @return {jQuery.Promise}
 */
LinkNoticeWidget.prototype.dismiss = function () {
	if ( mw.user.isAnon() ) {
		mw.storage.set( this.prefKey, 1 );
	} else {
		new mw.Api().saveOption( this.prefKey, 1 );
		mw.user.options.set( this.prefKey, 1 );
	}

	return this.setState( { isDismissed: true } );
};

/**
 * Determines whether or not the widget should be shown to the user. Defaults
 * to true. Type coercion is necessary due to the limitations of browser
 * localstorage.
 *
 * @return {boolean}
 */
LinkNoticeWidget.prototype.isDismissed = function () {
	var numVal;

	if ( mw.user.isAnon() ) {
		numVal = Number( mw.storage.get( this.prefKey ) ) || 0;
	} else {
		numVal = Number( mw.user.options.get( this.prefKey ) );
	}

	return Boolean( numVal );
};

/**
 * Returns whether or not the widget should be be displayed at all, as
 * determined by the presence of the i18n message to be displayed.
 *
 * @return {boolean}
 */
LinkNoticeWidget.prototype.canDisplay = function () {
	var message = mw.message( 'wikibasemediainfo-statements-link-notice-text' );
	return message.exists() && message.text() !== '-';
};

module.exports = LinkNoticeWidget;
