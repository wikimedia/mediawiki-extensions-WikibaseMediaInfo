var pathToWidget = '../../../../resources/statements/QualifierWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'QualifierWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		var done = assert.async(),
			QualifierWidget = require( pathToWidget ),
			widget = new QualifierWidget(),
			data = new wikibase.datamodel.PropertyValueSnak(
				'P1',
				new wikibase.datamodel.EntityId( 'Q1' )
			);

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );
} );
