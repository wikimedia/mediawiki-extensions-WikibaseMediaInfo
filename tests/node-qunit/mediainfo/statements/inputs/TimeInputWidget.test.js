'use strict';

const sinon = require( 'sinon' ),
	pathToWidget = '../../../../../resources/statements/inputs/TimeInputWidget.js',
	hooks = require( '../../../support/hooks.js' );

QUnit.module( 'TimeInputWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		const done = assert.async(),
			TimeInputWidget = require( pathToWidget ),
			widget = new TimeInputWidget(),
			data = dataValues.TimeValue.newFromJSON( {
				time: '+2019-01-24T00:00:00Z',
				timezone: 0,
				before: 0,
				after: 0,
				precision: 10,
				calendarmodel: 'http://www.wikidata.org/entity/Q1985786'
			} ),
			parseValueStub = sinon.stub( widget, 'parseValue' ),
			formatValueStub = sinon.stub( widget, 'formatValue' );

		parseValueStub.onFirstCall().returns( $.Deferred().resolve( data ).promise( { abort: function () {} } ) );
		formatValueStub.withArgs( data ).returns( $.Deferred().resolve( '24 January 2019' ).promise( { abort: function () {} } ) );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', function ( assert ) {
		const done = assert.async(),
			TimeInputWidget = require( pathToWidget ),
			widget = new TimeInputWidget(),
			data = dataValues.TimeValue.newFromJSON( {
				time: '+2019-01-24T00:00:00Z',
				timezone: 0,
				before: 0,
				after: 0,
				precision: 10,
				calendarmodel: 'http://www.wikidata.org/entity/Q1985786'
			} ),
			newData = dataValues.TimeValue.newFromJSON( {
				time: '+2019-01-25T00:00:00Z',
				timezone: 0,
				before: 0,
				after: 0,
				precision: 10,
				calendarmodel: 'http://www.wikidata.org/entity/Q1985786'
			} ),
			parseValueStub = sinon.stub( widget, 'parseValue' ),
			formatValueStub = sinon.stub( widget, 'formatValue' ),
			onChange = sinon.stub();

		parseValueStub.onFirstCall().returns( $.Deferred().resolve( data ).promise( { abort: function () {} } ) );
		parseValueStub.onSecondCall().returns( $.Deferred().resolve( newData ).promise( { abort: function () {} } ) );
		formatValueStub.withArgs( data ).returns( $.Deferred().resolve( '24 January 2019' ).promise( { abort: function () {} } ) );
		formatValueStub.withArgs( newData ).returns( $.Deferred().resolve( '25 January 2019' ).promise( { abort: function () {} } ) );

		widget.setData( data )
			.then( function () {
				const deferred = $.Deferred();
				// timeout because the onchange event is debounced for this duration...
				setTimeout( deferred.resolve, 210 );
				return deferred.promise();
			} )
			.then( widget.on.bind( widget, 'change', onChange, [] ) )
			.then( widget.setData.bind( widget, newData ) )
			.then( function () {
				const deferred = $.Deferred();
				// timeout because the onchange event is debounced for this duration...
				setTimeout( deferred.resolve, 210 );
				return deferred.promise();
			} )
			.then( function () {
				assert.strictEqual( onChange.called, true );
				done();
			} );
	} );

	QUnit.test( 'Setting same data does not trigger a change event', function ( assert ) {
		const done = assert.async(),
			TimeInputWidget = require( pathToWidget ),
			widget = new TimeInputWidget(),
			data = dataValues.TimeValue.newFromJSON( {
				time: '+2019-01-24T00:00:00Z',
				timezone: 0,
				before: 0,
				after: 0,
				precision: 10,
				calendarmodel: 'http://www.wikidata.org/entity/Q1985786'
			} ),
			sameData = dataValues.TimeValue.newFromJSON( {
				time: '+2019-01-24T00:00:00Z',
				timezone: 0,
				before: 0,
				after: 0,
				precision: 10,
				calendarmodel: 'http://www.wikidata.org/entity/Q1985786'
			} ),
			parseValueStub = sinon.stub( widget, 'parseValue' ),
			formatValueStub = sinon.stub( widget, 'formatValue' ),
			onChange = sinon.stub();

		parseValueStub.onFirstCall().returns( $.Deferred().resolve( data ).promise( { abort: function () {} } ) );
		parseValueStub.onSecondCall().returns( $.Deferred().resolve( sameData ).promise( { abort: function () {} } ) );
		formatValueStub.withArgs( data ).returns( $.Deferred().resolve( '24 January 2019' ).promise( { abort: function () {} } ) );
		formatValueStub.withArgs( sameData ).returns( $.Deferred().resolve( '24 January 2019' ).promise( { abort: function () {} } ) );

		widget.setData( data )
			.then( function () {
				const deferred = $.Deferred();
				// timeout because the onchange event is debounced for this duration...
				setTimeout( deferred.resolve, 210 );
				return deferred.promise();
			} )
			.then( widget.on.bind( widget, 'change', onChange, [] ) )
			.then( widget.setData.bind( widget, sameData ) )
			.then( function () {
				const deferred = $.Deferred();
				// timeout because the onchange event is debounced for this duration...
				setTimeout( deferred.resolve, 210 );
				return deferred.promise();
			} )
			.then( function () {
				assert.strictEqual( onChange.called, false );
				done();
			} );
	} );

	QUnit.test( 'Widget has no button in qualifier mode', function ( assert ) {
		const done = assert.async(),
			TimeInputWidget = require( pathToWidget ),
			widget = new TimeInputWidget( { isQualifier: true } ),
			data = dataValues.TimeValue.newFromJSON( {
				time: '+2019-01-24T00:00:00Z',
				timezone: 0,
				before: 0,
				after: 0,
				precision: 10,
				calendarmodel: 'http://www.wikidata.org/entity/Q1985786'
			} );

		widget.setData( data ).then( function ( $element ) {
			assert.strictEqual( $element.find( '.wbmi-input-widget__button' ).length, 0 );
			done();
		} );
	} );

	QUnit.test( 'Widget has button in statement mode', function ( assert ) {
		const done = assert.async(),
			TimeInputWidget = require( pathToWidget ),
			widget = new TimeInputWidget( { isQualifier: false } ),
			data = dataValues.TimeValue.newFromJSON( {
				time: '+2019-01-24T00:00:00Z',
				timezone: 0,
				before: 0,
				after: 0,
				precision: 10,
				calendarmodel: 'http://www.wikidata.org/entity/Q1985786'
			} );

		widget.setData( data ).then( function ( $element ) {
			assert.strictEqual( $element.find( '.wbmi-input-widget__button' ).length, 1 );
			done();
		} );
	} );
} );
