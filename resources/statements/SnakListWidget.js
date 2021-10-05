'use strict';

/**
 * @constructor
 * @param {Object} config Configuration options
 * @param {string} [config.editing] True for edit mode, False for read mode
 * @param {string} [config.addText] Text for "add" button
 */
var SnakWidget = require( './SnakWidget.js' ),
	ConstraintsReportHandlerElement = require( './ConstraintsReportHandlerElement.js' ),
	ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	datamodel = require( 'wikibase.datamodel' ),
	SnakListWidget;

/**
 * @param {Object} [config] Configuration options
 */
SnakListWidget = function MediaInfoStatementsSnakListWidget( config ) {
	this.config = $.extend( {
		editing: false,
		addText: ''
	}, config );

	// set these first - the parent constructor could call other methods
	// (e.g. setDisabled) which may cause a re-render, and will need
	// some of these...
	this.state = {
		editing: this.config.editing,
		snaks: [],
		constraintsReport: null
	};

	SnakListWidget.parent.call( this, $.extend( {}, config ) );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/SnakListWidget.mustache+dom'
	);
	ConstraintsReportHandlerElement.call( this, $.extend( {}, config ) );
};

OO.inheritClass( SnakListWidget, OO.ui.Widget );
OO.mixinClass( SnakListWidget, ComponentWidget );
OO.mixinClass( SnakListWidget, ConstraintsReportHandlerElement );

/**
 * @inheritDoc
 */
SnakListWidget.prototype.getTemplateData = function () {
	var errors = this.getErrors(),
		errorMessages = ( errors.length > 0 ) ?
			errors.map( function ( error ) {
				return new OO.ui.MessageWidget( {
					type: 'error',
					label: error,
					classes: [ 'wbmi-statement-error-msg--inline' ]
				} );
			} ) : null,
		addButton;

	addButton = new OO.ui.ButtonWidget( {
		classes: [ 'wbmi-snaklist-add-snak' ],
		label: this.config.addText,
		flags: 'progressive',
		framed: false
	} );
	addButton.connect( this, { click: [ 'addWidget' ] } );

	return {
		errors: errorMessages,
		editing: this.state.editing,
		snaks: this.state.snaks,
		disabled: this.isDisabled(),
		addButton: addButton,
		constraintsReport: this.state.constraintsReport &&
			this.popupFromResults( this.state.constraintsReport )
	};
};

/**
 * @param {SnakWidget[]} snaks
 * @return {jQuery.Promise}
 * @fires OO.EmitterList#remove
 */
SnakListWidget.prototype.removeWidgets = function ( snaks ) {
	var self = this,
		newWidgets = [],
		removedWidgets = [];

	this.state.snaks.forEach( function ( snak ) {
		if ( snaks.indexOf( snak ) < 0 ) {
			// not present in array of items to remove = keep
			newWidgets.push( snak );
		} else {
			removedWidgets.push( snak );
		}
	} );

	return this.setState( { snaks: newWidgets } ).then( function () {
		removedWidgets.forEach( function ( snak ) {
			self.emit( 'change', snak );
		} );
		if ( newWidgets.length === 0 ) {
			self.emit( 'empty' );
		}
	} );
};

/**
 * @param {datamodel.Snak|undefined} [data]
 * @return {SnakWidget}
 */
SnakListWidget.prototype.createWidget = function ( data ) {
	var widget = new SnakWidget( { editing: this.state.editing } ),
		promise = $.Deferred().resolve().promise(),
		self = this;

	if ( data ) {
		promise = widget.setData( data );
	}

	return promise.then(
		function () {
			widget.connect( self, { delete: [ 'removeWidgets', [ widget ] ] } );
			widget.connect( self, { change: [ 'emit', 'change' ] } );
			return widget;
		}
	);
};

/**
 * @param {datamodel.Snak} [data]
 */
SnakListWidget.prototype.addWidget = function ( data ) {
	var self = this;
	this.createWidget( data ).then( function ( widget ) {
		return self.setState( { snaks: self.state.snaks.concat( [ widget ] ) } )
			.then( self.emit.bind( self, 'change' ) )
			.then( widget.focus.bind( widget ) );
	} );
};

/**
 * @param {boolean} editing
 * @return {jQuery.Promise}
 */
SnakListWidget.prototype.setEditing = function ( editing ) {
	var promises = this.state.snaks.map( function ( widget ) {
		return widget.setEditing( editing );
	} );

	return $.when.apply( $, promises ).then( this.setState.bind( this, { editing: editing } ) );
};

/**
 * @return {datamodel.SnakList}
 */
SnakListWidget.prototype.getData = function () {
	return new datamodel.SnakList( this.state.snaks
		.map( function ( snak ) {
			// try to fetch data - if it fails (likely because of incomplete input),
			// we'll just ignore that snak
			try {
				return snak.getData();
			} catch ( e ) {
				return undefined;
			}
		} )
		.filter( function ( data ) {
			return data instanceof datamodel.Snak;
		} )
	);
};

/**
 * @param {datamodel.SnakList} data
 * @return {jQuery.Deferred}
 */
SnakListWidget.prototype.setData = function ( data ) {
	var self = this,
		existingWidgetsData = self.state.snaks.map( function ( widget ) {
			try {
				return widget.getData();
			} catch ( e ) {
				return undefined;
			}
		} );

	// Bail early and discard existing data if data argument is not a snaklist
	if ( !( data instanceof datamodel.SnakList ) ) {
		throw new Error( 'Invalid snaklist' );
	}

	return $.Deferred().resolve()
		.then( function () {
			// get rid of existing snak widgets that are no longer present in the
			// new set of data we've been fed (or are in an invalid state)
			return self.removeWidgets( self.state.snaks.filter( function ( item, i ) {
				if ( existingWidgetsData[ i ] === undefined ) {
					// failed to fetch data (likely because of incomplete input),
					// so we should remove this snak...
					return true;
				}
				return !data.hasItem( existingWidgetsData[ i ] );
			} ) );
		} )
		.then( function () {
			var newSnakWidgets = [],
				promises = [];

			// add new snak widgets that don't already exist
			data.each( function ( i, snak ) {
				var exists = existingWidgetsData[ i ] && existingWidgetsData[ i ].equals( snak ),
					widgetPromise = exists ? $.Deferred().resolve( self.state.snaks[ i ] ) : self.createWidget();

				promises.push(
					widgetPromise.then( function ( innerWidget ) {
						newSnakWidgets[ i ] = innerWidget;
						return innerWidget.setData( snak );
					} )
				);
			} );

			return $.when.apply( $, promises )
				.then( self.setState.bind( self, {
					snaks: newSnakWidgets,
					// if new data was passed in, error is no longer valid
					errors: data.equals( self.getData() ) ? self.getErrors() : []
				} ) );
		} );
};

/**
 * Handle the part of the response from a wbcheckconstraints api call that is relevant to this
 * SnakListWidget's property id & extract the constraint check results from the part of API
 * response that is relevant to this StatementWidget's propertyId
 *
 * @see WikibaseQualityConstraints/modules/gadget.js::_extractResultsForStatement()
 * @param {Object|null} results
 * @return {jQuery.Promise}
 */
SnakListWidget.prototype.setConstraintsReport = function ( results ) {
	// extract snaklist constraint reports, pass them along to snak widget,
	// and gather promises
	var promises = this.state.snaks.map( function ( widget ) {
		var data, propertyId, hash, result;

		try {
			data = widget.getData();
			propertyId = data.getPropertyId();
			hash = data.getHash();

			result = results[ propertyId ].filter( function ( responseForSnak ) {
				return responseForSnak.hash === hash;
			} )[ 0 ] || null;
			return widget.setConstraintsReport( result );
		} catch ( e ) {
			return widget.setConstraintsReport( null );
		}
	} );

	// return promise that doesn't resolve until all constraints reports have been rendered
	return $.when.apply( $, promises );
};

module.exports = SnakListWidget;
