var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/ItemWidget.js',
	hooks = require( '../../support/hooks.js' );

// eslint-disable-next-line no-restricted-properties
QUnit.module( 'ItemWidget', Object.assign( {}, hooks.mediainfo, {
	beforeEach: function () {
		hooks.mediainfo.beforeEach();

		// eslint-disable-next-line no-restricted-properties
		global.mw.config = Object.assign( {}, global.mw.config, {
			get: sinon.stub().withArgs( 'wbmiEnableOtherStatements', false ).returns( true )
		} );
	}
} ), function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		var done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			getPropertyDataStub = sinon.stub( widget, 'getPropertyData' ),
			data = new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						'P1',
						new wikibase.datamodel.EntityId( 'Q1' )
					)
				)
			);

		getPropertyDataStub.returns( $.Deferred().resolve( 'label', 'url', 'repo' ).promise() );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'createQualifier() returns a new QualifierWidget', function ( assert ) {
		var ItemWidget = require( pathToWidget ),
			QualifierWidget = require( '../../../../resources/statements/QualifierWidget.js' ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			featureFlagStub = global.mw.config.get,
			qualifier;

		featureFlagStub.withArgs( 'wbmiEnableOtherStatements', false ).returns( false );
		qualifier = widget.createQualifier();
		assert.strictEqual( qualifier instanceof QualifierWidget, true );
	} );

	QUnit.test( 'createQualifier() returns alternate new QualifierWidget with other statements enabled', function ( assert ) {
		var ItemWidget = require( pathToWidget ),
			QualifierWidget = require( '../../../../resources/statements/NewQualifierWidget.js' ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			qualifier;

		qualifier = widget.createQualifier();
		assert.strictEqual( qualifier instanceof QualifierWidget, true );
	} );

	QUnit.test( 'createQualifier sets QualifierWidget data when snak is provided', function ( assert ) {
		var done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			qualifier,
			data;

		data = new wikibase.datamodel.PropertyValueSnak(
			'P1',
			new wikibase.datamodel.EntityId( 'Q1' )
		);

		qualifier = widget.createQualifier( data );

		// qualifier's `setData` is async, so let's call `setState` (with no change)
		// to make sure that we'll wait until the change has propagated and data
		// has been set
		qualifier.setState( {} ).then( function () {
			assert.strictEqual( data.equals( qualifier.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'addQualifier creates a new QualifierWidget every time it is called', function ( assert ) {
		var done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			getPropertyDataStub = sinon.stub( widget, 'getPropertyData' ),
			spy = sinon.spy( widget, 'createQualifier' ),
			data = new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						'P1',
						new wikibase.datamodel.EntityId( 'Q1' )
					)
				)
			);

		getPropertyDataStub.returns( $.Deferred().resolve( 'label', 'url', 'repo' ).promise() );

		widget.setData( data );
		widget.render().then( function () {
			assert.strictEqual( spy.callCount, 0 );

			widget.addQualifier();
			assert.strictEqual( spy.callCount, 1 );

			widget.addQualifier();
			assert.strictEqual( spy.callCount, 2 );

			done();
		} );
	} );

	QUnit.skip( 'generates a QualifierWidget for each qualifier in its data' );
	QUnit.skip( 'emits change events appropriately' );
	QUnit.skip( 'handles change events from child widgets appropriately' );
} );
