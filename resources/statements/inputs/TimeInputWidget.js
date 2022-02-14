'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	FormatValueElement = require( 'wikibase.mediainfo.base' ).FormatValueElement,
	AbstractInputWidget = require( './AbstractInputWidget.js' ),
	TimeInputWidget;

/**
 * @param {Object} config Configuration options
 * @param {boolean} [config.isQualifier]
 */
TimeInputWidget = function MediaInfoStatementsTimeInputWidget( config ) {
	var self = this;

	config = config || {};

	this.state = {
		value: '',
		time: false,
		timezone: 0,
		before: 0,
		after: 0,
		// precision will be inferred from input, but can be manually overridden;
		// as soon as it changes manually, the custom precision will be used
		inferredPrecision: 11, // day
		customPrecision: false,
		// like precision, calender will be inferred at first, but can be overridden
		inferredCalendarmodel: dataValues.TimeValue.CALENDARS.GREGORIAN,
		customCalendarmodel: false,
		isQualifier: !!config.isQualifier,
		isActive: false
	};

	this.parseValuePromise = undefined;

	this.input = new OO.ui.TextInputWidget( {
		value: this.state.value,
		classes: [ 'wbmi-input-widget__input' ],
		isRequired: true,
		placeholder: mw.msg( 'wikibasemediainfo-time-input-placeholder' ),
		validate: function ( value ) {
			// mark input field as invalid except
			return value === '' || self.hasValidInput();
		}
	} );

	this.precision = new OO.ui.DropdownInputWidget( {
		classes: [ 'wbmi-input-widget__dropdown' ],
		options: this.getPrecisionOptions(),
		$overlay: true
	} );

	this.calendar = new OO.ui.DropdownInputWidget( {
		classes: [ 'wbmi-input-widget__dropdown' ],
		options: this.getCalendarOptions(),
		$overlay: true
	} );

	this.bindEventHandlers();

	TimeInputWidget.parent.call( this );
	AbstractInputWidget.call( this, config );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/inputs/TimeInputWidget.mustache+dom'
	);
	FormatValueElement.call( this, $.extend( {}, config ) );
};
OO.inheritClass( TimeInputWidget, OO.ui.Widget );
OO.mixinClass( TimeInputWidget, AbstractInputWidget );
OO.mixinClass( TimeInputWidget, ComponentWidget );
OO.mixinClass( TimeInputWidget, FormatValueElement );

TimeInputWidget.prototype.bindEventHandlers = function () {
	this.debouncedOnChange = OO.ui.debounce( this.onChange.bind( this ), 200 );

	this.input.connect( this, { enter: 'onEnter' } );
	this.input.$input.on( 'focus', this.onFocus.bind( this ) );
	this.input.connect( this, { change: this.debouncedOnChange } );

	this.precision.connect( this, { change: [ 'onChangePrecision' ] } );

	this.calendar.connect( this, { change: [ 'onChangeCalendar' ] } );
};

TimeInputWidget.prototype.unbindEventHandlers = function () {
	this.input.disconnect( this, { enter: 'onEnter' } );
	this.input.disconnect( this, { change: this.debouncedOnChange } );

	this.precision.disconnect( this, { change: [ 'onChangePrecision' ] } );

	this.calendar.disconnect( this, { change: [ 'onChangeCalendar' ] } );
};

/**
 * @inheritDoc
 */
TimeInputWidget.prototype.getTemplateData = function () {
	var button = new OO.ui.ButtonWidget( {
			classes: [ 'wbmi-input-widget__button' ],
			label: mw.msg( 'wikibasemediainfo-time-input-button-text' ),
			flags: [ 'progressive' ],
			disabled: !this.hasValidInput()
		} ),
		data;

	button.connect( this, { click: 'onEnter' } );

	data = {
		isQualifier: this.state.isQualifier,
		isActive: this.state.isActive,
		formatted: this.state.value === '' ?
			mw.message( 'wikibasemediainfo-time-timestamp-empty' ).escaped() :
			mw.message( 'wikibasemediainfo-time-timestamp-invalid' ).escaped(),
		input: this.input,
		precisionLabel: mw.msg( 'wikibasemediainfo-time-precision-label' ),
		calendarLabel: mw.msg( 'wikibasemediainfo-time-calendar-label' ),
		precision: this.precision,
		calendar: this.calendar,
		button: button
	};

	if ( !this.hasValidInput() ) {
		return data;
	}

	return this.formatValue( this.getData() ).then( function ( formatted ) {
		// The method $.text() will handle the escaping of the user input preventing XSS.
		var $formatted = $( '<span>' ).addClass( 'wbmi-input-widget--formatted' ).text( formatted );

		// wikibasemediainfo-time-timestamp-formatted is part of $wgRawHtmlMessages and safe to use as is here
		return $.extend( {}, data, {
			formatted: mw.message( 'wikibasemediainfo-time-timestamp-formatted', $formatted.get( 0 ).outerHTML ).text()
		} );
	} );
};

TimeInputWidget.prototype.onEnter = function () {
	if ( this.hasValidInput() ) {
		this.emit( 'add', this );
	}
};

TimeInputWidget.prototype.onFocus = function () {
	this.setState( { isActive: true } );
};

/**
 * @param {string} value
 */
TimeInputWidget.prototype.onChange = function ( value ) {
	var self = this;

	if ( this.parseValuePromise ) {
		// abort existing API calls if input has changed
		this.parseValuePromise.abort();
	}

	if ( value === '' ) {
		this.setState( { value: '', time: false } ).then( this.emit.bind( this, 'change', this ) );
		return;
	}

	this.parseValuePromise = this.parseValue( undefined, 'time' );
	this.parseValuePromise
		.then( function ( dataValue ) {
			var json = dataValue.toJSON();

			if ( !self.state.customPrecision ) {
				// update precision dropdown (if not already manually overridden)
				self.precision.setValue( json.precision );

				// we've just updated precision, which will fire a 'change' event,
				// just like it would when updating it manually
				// let's make sure to reset the state to automatic (inferred)
				// precision at the end of the call stack
				setTimeout( self.setState.bind( self, { customPrecision: false } ) );
			}

			if ( !self.state.customCalendarmodel ) {
				// update calendar dropdown (if not already manually overridden)
				self.calendar.setValue( json.calendarmodel );

				// we've just updated the calendar model, which will fire a 'change'
				// event, just like it would when updating it manually
				// let's make sure to reset the state to automatic (inferred)
				// calendar model at the end of the call stack
				setTimeout( self.setState.bind( self, { customCalendarmodel: false } ) );
			}

			return self.setState( {
				value: value,
				time: json.time,
				timezone: json.timezone,
				before: json.before,
				after: json.after,
				inferredCalendarmodel: json.calendarmodel,
				inferredPrecision: json.precision
			} ).then( self.input.setValidityFlag.bind( self.input, true ) );
		} )
		.catch( function () {
			return self.setState( { value: value, time: false } )
				.then( self.input.setValidityFlag.bind( self.input, false ) );
		} )
		.always( this.emit.bind( this, 'change', this ) );
};

/**
 * @param {string} value
 */
TimeInputWidget.prototype.onChangePrecision = function ( value ) {
	this.setState( { customPrecision: Number( value ) } )
		.then( this.emit.bind( this, 'change', this ) );
};

/**
 * @param {string} value
 */
TimeInputWidget.prototype.onChangeCalendar = function ( value ) {
	this.setState( { customCalendarmodel: value } )
		.then( this.emit.bind( this, 'change', this ) );
};

/**
 * @inheritDoc
 */
TimeInputWidget.prototype.getRawValue = function () {
	return this.input.getValue();
};

/**
 * @inheritDoc
 */
TimeInputWidget.prototype.getRawValueOptions = function () {
	return { lang: mw.config.get( 'wgUserLanguage' ) };
};

/**
 * @inheritDoc
 */
TimeInputWidget.prototype.getData = function () {
	if ( this.state.time === false ) {
		throw new Error( 'No valid time' );
	}

	return dataValues.newDataValue( 'time', {
		time: this.state.time,
		timezone: this.state.timezone,
		before: this.state.before,
		after: this.state.after,
		precision: this.state.customPrecision || this.state.inferredPrecision,
		calendarmodel: this.state.customCalendarmodel || this.state.inferredCalendarmodel
	} );
};

/**
 * @return {boolean}
 */
TimeInputWidget.prototype.hasValidInput = function () {
	try {
		this.getData();
		return true;
	} catch ( e ) {
		return false;
	}
};

/**
 * @inheritDoc
 */
TimeInputWidget.prototype.setData = function ( data ) {
	var self = this;

	return this.formatValue( data ).then( function ( formatted ) {
		var json = data.toJSON(),
			existing;

		try {
			existing = self.getData();
		} catch ( e ) {
			// no existing data, that's alright...
		}

		// we're going to change textinputs below (to reflect the new data
		// we receive), but it's almost guaranteed to pick of the new input
		// as change and trigger a change event, even when it didn't actually
		// change: that is because the value in the textinput is different
		// from what is in storage: the textinput is a formatted representation
		// thereof, that then gets interpreted back & forth
		// and to make things worse, multiple storage values can represent the
		// same formatted version: e.g.
		// "+2019-04-00T00:00:00Z" & precision 10 = April 2019
		// "+2019-04-30T23:59:59Z" & precision 10 = April 2019
		// so: unbind the event handlers that'll interpret the textual input,
		// because we don't need/want them, we know exactly what data we have!
		self.unbindEventHandlers();

		self.input.setValue( formatted );
		self.precision.setValue( json.precision );
		self.calendar.setValue( json.calendarmodel );

		self.bindEventHandlers();

		return self.setState( {
			value: formatted,
			time: json.time,
			timezone: json.timezone,
			before: json.before,
			after: json.after,
			inferredPrecision: json.precision,
			customPrecision: false,
			inferredCalendarmodel: json.calendarmodel,
			customCalendarmodel: false,
			isActive: false
		} ).then( function ( $element ) {
			if ( !data.equals( existing ) ) {
				self.emit( 'change', self );
			}
			return $element;
		} );
	} );
};

/**
 * @inheritdoc
 */
TimeInputWidget.prototype.clear = function () {
	var self = this,
		existing;

	try {
		existing = this.getData();
	} catch ( e ) {
		// no existing data, that's alright...
	}

	this.unbindEventHandlers();

	this.input.setValue( '' );
	this.precision.setValue( 11 ); // day
	this.calendar.setValue( dataValues.TimeValue.CALENDARS.GREGORIAN );

	this.bindEventHandlers();

	return this.setState( {
		value: '',
		time: false,
		timezone: 0,
		before: 0,
		after: 0,
		inferredPrecision: 11, // day
		customPrecision: false,
		inferredCalendarmodel: dataValues.TimeValue.CALENDARS.GREGORIAN,
		customCalendarmodel: false,
		isActive: false
	} ).then( function ( $element ) {
		if ( existing !== undefined ) {
			self.emit( 'change', self );
		}
		return $element;
	} );
};

/**
 * @inheritdoc
 */
TimeInputWidget.prototype.focus = function () {
	this.input.focus();
};

/**
 * @inheritdoc
 */
TimeInputWidget.prototype.setDisabled = function ( disabled ) {
	this.input.setDisabled( disabled );
	this.precision.setDisabled( disabled );
	this.calendar.setDisabled( disabled );
	ComponentWidget.prototype.setDisabled.call( this, disabled );
};

/**
 * @inheritDoc
 */
TimeInputWidget.prototype.flagAsInvalid = function () {
	this.input.setValidityFlag( false );
};

/**
 * Return options for our precision DropdownInputWidget.
 *
 * @return {Object[]}
 */
TimeInputWidget.prototype.getPrecisionOptions = function () {
	var map = dataValues.TimeValue.PRECISIONS;

	return Object.keys( map )
		.map( function ( i ) {
			var id = map[ i ].id,
				// The following messages are used here:
				// * wikibasemediainfo-time-precision-year1h
				// * wikibasemediainfo-time-precision-year100m
				// * wikibasemediainfo-time-precision-year10m
				// * wikibasemediainfo-time-precision-year1m
				// * wikibasemediainfo-time-precision-year100k
				// * wikibasemediainfo-time-precision-year10k
				// * wikibasemediainfo-time-precision-year1k
				// * wikibasemediainfo-time-precision-year100
				// * wikibasemediainfo-time-precision-year10
				// * wikibasemediainfo-time-precision-year
				// * wikibasemediainfo-time-precision-month
				// * wikibasemediainfo-time-precision-day
				// * wikibasemediainfo-time-precision-hour
				// * wikibasemediainfo-time-precision-minute
				// * wikibasemediainfo-time-precision-second
				message = mw.message( 'wikibasemediainfo-time-precision-' + id.toLowerCase() );

			return {
				data: i,
				label: message.exists() ? message.text() : undefined
			};
		} )
		.filter( function ( data ) {
			return data.label !== undefined;
		} );
};

/**
 * Return options for our calendar DropdownInputWidget.
 *
 * @return {Object[]}
 */
TimeInputWidget.prototype.getCalendarOptions = function () {
	var map = dataValues.TimeValue.CALENDARS;

	return Object.keys( map )
		.map( function ( id ) {
			var value = map[ id ],
				// The following messages are used here:
				// * wikibasemediainfo-time-calendar-gregorian
				// * wikibasemediainfo-time-calendar-julian
				message = mw.message( 'wikibasemediainfo-time-calendar-' + id.toLowerCase() );

			return {
				data: value,
				label: message.exists() ? message.text() : undefined
			};
		} )
		.filter( function ( data ) {
			return data.label !== undefined;
		} );
};

module.exports = TimeInputWidget;
