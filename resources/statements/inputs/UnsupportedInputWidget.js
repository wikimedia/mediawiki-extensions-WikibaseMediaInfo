'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	AbstractInputWidget = require( './AbstractInputWidget.js' ),
	UnsupportedInputWidget;

/**
 * @param {Object} config Configuration options
 * @param {boolean} [config.isQualifier]
 */
UnsupportedInputWidget = function MediaInfoStatementsUnsupportedInputWidget( config ) {
	config = config || {};

	this.state = {
		isQualifier: !!config.isQualifier
	};

	this.input = new OO.ui.TextInputWidget( {
		value: null,
		classes: [ 'wbmi-input-widget__input' ],
		isRequired: false,
		disabled: true
	} );

	UnsupportedInputWidget.parent.call( this );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/inputs/UnsupportedInputWidget.mustache+dom'
	);
};
OO.inheritClass( UnsupportedInputWidget, OO.ui.Widget );
OO.mixinClass( UnsupportedInputWidget, AbstractInputWidget );
OO.mixinClass( UnsupportedInputWidget, ComponentWidget );

/**
 * @inheritDoc
 */
UnsupportedInputWidget.prototype.getTemplateData = function () {
	return {
		isQualifier: this.state.isQualifier,
		input: this.input
	};
};

/**
 * @inheritDoc
 */
UnsupportedInputWidget.prototype.getRawValue = function () {
	return this.getData().getValue();
};

/**
 * @inheritDoc
 */
UnsupportedInputWidget.prototype.getData = function () {
	if ( !this.state.data || !this.state.data.getValue ) {
		throw new Error( 'No data' );
	}

	return this.state.data;
};

/**
 * @inheritDoc
 */
UnsupportedInputWidget.prototype.setData = function ( data ) {
	var self = this;

	if ( data.equals( this.state.data ) ) {
		return $.Deferred().resolve( this.$element ).promise();
	}

	return this.setState( { data: data } ).then( function ( $element ) {
		self.emit( 'change', self );
		return $element;
	} );
};

/**
 * @inheritDoc
 */
UnsupportedInputWidget.prototype.clear = function () {
	return this.setState( { data: undefined } );
};

/**
 * @inheritdoc
 */
UnsupportedInputWidget.prototype.focus = function () {
	this.input.focus();
};

/**
 * @inheritdoc
 */
UnsupportedInputWidget.prototype.setDisabled = function () {
	// this input type is *always* disabled
	this.input.setDisabled( true );
	ComponentWidget.prototype.setDisabled.call( this, true );
};

module.exports = UnsupportedInputWidget;
