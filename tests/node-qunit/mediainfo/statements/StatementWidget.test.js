var pathToWidget = '../../../../resources/statements/StatementWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'StatementWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		var StatementWidget = require( pathToWidget ),
			widget = new StatementWidget( {
				$element: $( '<div>' ),
				propertyId: 'P1',
				entityId: 'M1'
			} ),
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

		widget.setData( data );

		assert.ok( widget.getData() );
		assert.strictEqual( data.equals( widget.getData() ), true );
	} );
} );
