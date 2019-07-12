var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/LinkNoticeWidget.js',
	helpers = require( '../../support/helpers.js' ),
	hooks = require( '../../support/hooks.js' ),
	prefKey = 'wbmi-wikidata-link-notice-dismissed';

QUnit.module( 'LinkNoticeWidget', hooks.mediainfo, function () {
	QUnit.test( 'constructor', function ( assert ) {
		var LinkNoticeWidget = require( pathToWidget );

		/* eslint-disable-next-line no-new */
		new LinkNoticeWidget();
		assert.ok( true );
	} );

	QUnit.module( 'User is not logged in.', {
		beforeEach: function () {
			global.mw.user = helpers.createMediaWikiUser( false );
		}
	}, function () {
		QUnit.test( 'Widget should be visible if not previously dismissed', function ( assert ) {
			var LinkNoticeWidget = require( pathToWidget ),
				widget = new LinkNoticeWidget();
			assert.strictEqual( widget.isDismissed(), false );
		} );

		QUnit.test( 'Widget should not be visible if previously dismissed', function ( assert ) {
			var LinkNoticeWidget = require( pathToWidget ),
				widget = new LinkNoticeWidget();

			// Fake out previous dismissal in localstorage
			global.mw.storage.get.returns( 1 );

			assert.strictEqual( widget.isDismissed(), true );
		} );

		QUnit.test( 'dismiss method should store data in local storage for anon users', function ( assert ) {
			var LinkNoticeWidget = require( pathToWidget ),
				widget = new LinkNoticeWidget();

			widget.dismiss();
			assert.strictEqual( global.mw.storage.set.calledWith( prefKey, 1 ), true );
		} );

		QUnit.test( 'dismiss method should dismiss the widget', function ( assert ) {
			var LinkNoticeWidget = require( pathToWidget ),
				widget = new LinkNoticeWidget(),
				spy = sinon.spy( widget.$element, 'detach' );

			assert.strictEqual( spy.called, false );
			widget.dismiss();
			assert.strictEqual( spy.called, true );
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
			var LinkNoticeWidget = require( pathToWidget ),
				widget = new LinkNoticeWidget();
			assert.strictEqual( widget.isDismissed(), false );
		} );

		QUnit.test( 'Widget should not be visible if previously dismissed', function ( assert ) {
			var LinkNoticeWidget = require( pathToWidget ),
				widget = new LinkNoticeWidget();

			// Fake out previous dismissal in user prefs
			global.mw.user.options.get.returns( 1 );

			assert.strictEqual( widget.isDismissed(), true );
		} );

		QUnit.test( 'dismiss method should store data in user preferences for logged in users', function ( assert ) {
			var LinkNoticeWidget = require( pathToWidget ),
				widget = new LinkNoticeWidget();

			widget.dismiss();
			assert.strictEqual( global.mw.user.options.set.calledWith( prefKey, 1 ), true );
			assert.strictEqual( global.mw.Api.prototype.saveOption.calledWith( prefKey, 1 ), true );
		} );
	} );
} );
