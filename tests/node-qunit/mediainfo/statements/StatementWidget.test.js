var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/StatementWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'StatementWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		var done = assert.async(),
			StatementWidget = require( pathToWidget ),
			widget = new StatementWidget( {
				$element: $( '<div>' ),
				propertyId: 'P1',
				entityId: 'M1'
			} ),
			formatValueStub = sinon.stub( widget, 'formatValue' ),
			getRepoFromUrlStub = sinon.stub( widget, 'getRepoFromUrl' ),
			data = new wikibase.datamodel.StatementList( [
				new wikibase.datamodel.Statement(
					new wikibase.datamodel.Claim(
						new wikibase.datamodel.PropertyValueSnak(
							'P1',
							new wikibase.datamodel.EntityId( 'Q1' )
						)
					)
				)
			] );

		formatValueStub.returns( $.Deferred().resolve( 'formatted' ).promise() );
		getRepoFromUrlStub.returns( $.Deferred().resolve( 'local' ).promise() );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );
} );
