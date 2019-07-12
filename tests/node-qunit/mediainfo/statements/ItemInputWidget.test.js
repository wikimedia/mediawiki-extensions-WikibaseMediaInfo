var pathToWidget = '../../../../resources/statements/ItemInputWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'ItemInputWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		var ItemInputWidget = require( pathToWidget ),
			widget = new ItemInputWidget(),
			data = new wikibase.datamodel.EntityId( 'Q1' );

		widget.setData( data );

		assert.ok( widget.getData() );
		assert.strictEqual( data.equals( widget.getData() ), true );
	} );
} );
