( function ( util ) {
	'use strict';

	/* eslint-disable no-underscore-dangle */

	var datamodel = require( 'wikibase.datamodel' ),
		PARENT = datamodel.Entity,

		/**
		 * @class datamodel.MediaInfo
		 * @extends datamodel.Entity
		 * @license GPL-2.0-or-later
		 * @author Adrian Heine <adrian.heine@wikimedia.de>
		 *
		 * @constructor
		 *
		 * @param {string} mediaInfoId
		 * @param {datamodel.TermMap|null} [labels=new datamodel.TermMap()]
		 * @param {datamodel.TermMap|null} [descriptions=new datamodel.TermMap()]
		 * @param {datamodel.StatementGroupSet|null}
		 *   [statementGroupSet=new datamodel.StatementGroupSet()]
		 *
		 * @throws {Error} if a required parameter is not specified properly.
		 */
		SELF = util.inherit(
			'WbDataModelMediaInfo',
			PARENT,
			function ( mediaInfoId, labels, descriptions, statementGroupSet ) {
				labels = labels || new datamodel.TermMap();
				descriptions = descriptions || new datamodel.TermMap();
				statementGroupSet = statementGroupSet || new datamodel.StatementGroupSet();

				if (
					typeof mediaInfoId !== 'string' ||
					!( labels instanceof datamodel.TermMap ) ||
					!( descriptions instanceof datamodel.TermMap ) ||
					!( statementGroupSet instanceof datamodel.StatementGroupSet )
				) {
					throw new Error( 'Required parameter(s) missing or not defined properly' );
				}

				this._id = mediaInfoId;
				this._statementGroupSet = statementGroupSet;
				this._fingerprint = new datamodel.Fingerprint( labels, descriptions );
			},
			{

				/**
				 * @property {datamodel.StatementGroupSet}
				 * @private
				 */
				_statementGroupSet: null,

				/**
				 * @return {datamodel.StatementGroupSet}
				 */
				getStatements: function () {
					return this._statementGroupSet;
				},

				/**
				 * @return {boolean}
				 */
				isEmpty: function () {
					return this._statementGroupSet.isEmpty() && this._fingerprint.isEmpty();
				},

				/**
				 * @param {*} mediaInfo
				 * @return {boolean}
				 */
				equals: function ( mediaInfo ) {
					return mediaInfo === this ||
					( mediaInfo instanceof SELF &&
						this._id === mediaInfo.getId() &&
						this._statementGroupSet.equals( mediaInfo.getStatements() ) &&
						this._fingerprint.equals( mediaInfo.getFingerprint() )
					);
				}
			} );

	/**
	 * @inheritdoc
	 * @property {string} [TYPE='mediainfo']
	 * @static
	 */
	SELF.TYPE = 'mediainfo';

	module.exports = SELF;

}( util ) );
