'use strict';

const sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/LinkNoticeWidget.js',
	helpers = require( '../../support/helpers.js' ),
	hooks = require( '../../support/hooks.js' ),
	prefKey = 'wbmi-wikidata-link-notice-dismissed';

QUnit.module( 'LinkNoticeWidget', Object.assign( {}, hooks.mediainfo, {
	beforeEach: function () {
		hooks.mediainfo.beforeEach();

		// pretend config conditions for showing notice are met
		global.mw.message = sinon.stub().returns( {
			exists: sinon.stub().withArgs( 'wikibasemediainfo-statements-link-notice-text' ).returns( true ),
			text: sinon.stub().withArgs( 'wikibasemediainfo-statements-link-notice-text' ).returns( 'Stub text' )
		} );
	}
} ), function () {
	QUnit.test( 'constructor', function ( assert ) {
		const LinkNoticeWidget = require( pathToWidget );

		global.mw.user = helpers.createMediaWikiUser( false );

		/* eslint-disable-next-line no-new */
		new LinkNoticeWidget();
		assert.ok( true );
	} );

	QUnit.module( 'User is not logged in.', {
		beforeEach: function () {
			global.mw.user = helpers.createMediaWikiUser( false );

			global.mw.storage.get.returns( 0 );
		}
	}, function () {
		QUnit.test( 'Widget should be visible if not previously dismissed', function ( assert ) {
			const LinkNoticeWidget = require( pathToWidget ),
				widget = new LinkNoticeWidget();
			assert.strictEqual( widget.isDismissed(), false );
		} );

		QUnit.test( 'Widget should not be visible if previously dismissed', function ( assert ) {
			const LinkNoticeWidget = require( pathToWidget );

			// Fake out previous dismissal in localstorage
			global.mw.storage.get.returns( 1 );

			const widget = new LinkNoticeWidget();

			assert.strictEqual( widget.isDismissed(), true );
		} );

		QUnit.test( 'dismiss method should store data in local storage for anon users', function ( assert ) {
			const done = assert.async(),
				LinkNoticeWidget = require( pathToWidget ),
				widget = new LinkNoticeWidget();

			widget.dismiss().then( function () {
				assert.strictEqual( global.mw.storage.set.calledWith( prefKey, 1 ), true );
				done();
			} );
		} );

		QUnit.test( 'dismiss method should dismiss the widget', function ( assert ) {
			const done = assert.async(),
				LinkNoticeWidget = require( pathToWidget ),
				widget = new LinkNoticeWidget();

			// wait for initial render to complete
			widget.render().then( function ( $element ) {
				assert.strictEqual( $element.find( '.wbmi-link-notice' ).length, 1 );
				widget.dismiss().then( function ( $innerElement ) {
					assert.strictEqual( $innerElement.find( '.wbmi-link-notice' ).length, 0 );
					done();
				} );
			} );
		} );
	} );

	QUnit.module( 'User is logged-in', {
		beforeEach: function () {
			global.mw.user = helpers.createMediaWikiUser( true );
			global.mw.Api = function () {};
			global.mw.Api.prototype = {
				saveOption: sinon.stub()
			};
		}
	}, function () {
		QUnit.test( 'Widget should be visible if not previously dismissed', function ( assert ) {
			const LinkNoticeWidget = require( pathToWidget ),
				widget = new LinkNoticeWidget();
			assert.strictEqual( widget.isDismissed(), false );
		} );

		QUnit.test( 'Widget should not be visible if previously dismissed', function ( assert ) {
			const LinkNoticeWidget = require( pathToWidget );

			// Fake out previous dismissal in user prefs
			global.mw.user.options.get.returns( 1 );

			const widget = new LinkNoticeWidget();
			assert.strictEqual( widget.isDismissed(), true );
		} );

		QUnit.test( 'dismiss method should store data in user preferences for logged in users', function ( assert ) {
			const done = assert.async(),
				LinkNoticeWidget = require( pathToWidget ),
				widget = new LinkNoticeWidget();

			widget.dismiss().then( function () {
				assert.strictEqual( global.mw.user.options.set.calledWith( prefKey, 1 ), true );
				assert.strictEqual( global.mw.Api.prototype.saveOption.calledWith( prefKey, 1 ), true );
				done();
			} );
		} );
	} );
} );
