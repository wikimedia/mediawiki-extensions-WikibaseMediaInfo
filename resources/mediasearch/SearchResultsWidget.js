'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	SearchResultsWidget;

/**
 * @constructor
 * @param {Object} config
 * @param {string} config.term
 * @param {string} config.type
 * @param {number} config.limit
 * @param {string} config.continue
 * @param {Array} [config.results]
 * @param {Array} [config.hasMore]
 */
SearchResultsWidget = function MediaInfoMediaSearchSearchResultsWidget( config ) {
	this.state = {
		term: config.term,
		type: config.type,
		limit: config.limit,
		continue: config.continue,
		results: ( config.results || [] ).sort( function ( a, b ) {
			return a.index - b.index;
		} ),
		hasMore: true,
		resolution: ''
	};

	this.fetchingPromise = undefined;

	SearchResultsWidget.parent.call( this, config );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.mediasearch',
		'templates/mediasearch/SearchResultsWidget.mustache+dom'
	);
};
OO.inheritClass( SearchResultsWidget, OO.ui.Widget );
OO.mixinClass( SearchResultsWidget, ComponentWidget );

/**
 * @inheritDoc
 */
SearchResultsWidget.prototype.getTemplateData = function () {
	return {
		term: this.state.term,
		limit: this.state.limit,
		continue: this.state.continue,
		hasMore: this.state.hasMore,
		results: this.state.results.map( function ( result ) {
			return $.extend( {}, result, {
				name: new mw.Title( result.title ).getMainText()
			} );
		} ),
		nextButton: $.createSpinner( { size: 'large' } ),
		isBitmap: this.state.type === 'bitmap',
		isAudio: this.state.type === 'audio',
		isVideo: this.state.type === 'video',
		isCategory: this.state.type === 'category',

		// @todo below is for testing - this should be removed once the testing period is over!
		chips: {
			redwood: [
				{
					title: 'California',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Giant_Redwood_Trees_in_California_that_Inspired_a_Film_and_Video_game.jpg/40px-Giant_Redwood_Trees_in_California_that_Inspired_a_Film_and_Video_game.jpg'
				},
				{
					title: 'Giant',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Redwood_large_sherman.jpg/40px-Redwood_large_sherman.jpg'
				},
				{
					title: 'Drive thru',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Delorean_at_Redwood_%2817033306994%29.jpg/40px-Delorean_at_Redwood_%2817033306994%29.jpg'
				},
				{
					title: 'Chandelier',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/CarRedwoodLeggett.jpg/40px-CarRedwoodLeggett.jpg'
				},
				{
					title: 'Giant sequoias',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Redwood_large_sherman.jpg/40px-Redwood_large_sherman.jpg'
				}
			],
			'redwood tree': [
				{
					title: 'California',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Giant_Redwood_Trees_in_California_that_Inspired_a_Film_and_Video_game.jpg/40px-Giant_Redwood_Trees_in_California_that_Inspired_a_Film_and_Video_game.jpg'
				},
				{
					title: 'Giant',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Redwood_large_sherman.jpg/40px-Redwood_large_sherman.jpg'
				},
				{
					title: 'Drive thru',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Delorean_at_Redwood_%2817033306994%29.jpg/40px-Delorean_at_Redwood_%2817033306994%29.jpg'
				},
				{
					title: 'Chandelier',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/CarRedwoodLeggett.jpg/40px-CarRedwoodLeggett.jpg'
				},
				{
					title: 'Giant sequoias',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Redwood_large_sherman.jpg/40px-Redwood_large_sherman.jpg'
				}
			],
			'new york': [
				{
					title: 'Times Square',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/New_York_City_%28New_York%2C_USA%29%2C_Times_Square-Duffy_Square_--_2012_--_6380.jpg/40px-New_York_City_%28New_York%2C_USA%29%2C_Times_Square-Duffy_Square_--_2012_--_6380.jpg'
				},
				{
					title: 'NYC',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Washington_Crossing_the_Delaware_by_Emanuel_Leutze%2C_MMA-NYC%2C_1851.jpg/40px-Washington_Crossing_the_Delaware_by_Emanuel_Leutze%2C_MMA-NYC%2C_1851.jpg'
				},
				{
					title: 'Manhattan',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/New_York_City_at_night_HDR.jpg/40px-New_York_City_at_night_HDR.jpg'
				},
				{
					title: 'High line',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/London_Terrace_NY1.jpg/40px-London_Terrace_NY1.jpg'
				},
				{
					title: 'Hotel',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/New_York_City_at_night_HDR.jpg/40px-New_York_City_at_night_HDR.jpg'
				}
			],
			'new york city': [
				{
					title: 'Times Square',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/New_York_City_%28New_York%2C_USA%29%2C_Times_Square-Duffy_Square_--_2012_--_6380.jpg/40px-New_York_City_%28New_York%2C_USA%29%2C_Times_Square-Duffy_Square_--_2012_--_6380.jpg'
				},
				{
					title: 'NYC',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Washington_Crossing_the_Delaware_by_Emanuel_Leutze%2C_MMA-NYC%2C_1851.jpg/40px-Washington_Crossing_the_Delaware_by_Emanuel_Leutze%2C_MMA-NYC%2C_1851.jpg'
				},
				{
					title: 'Manhattan',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/New_York_City_at_night_HDR.jpg/40px-New_York_City_at_night_HDR.jpg'
				},
				{
					title: 'High line',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/London_Terrace_NY1.jpg/40px-London_Terrace_NY1.jpg'
				},
				{
					title: 'Hotel',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/New_York_City_at_night_HDR.jpg/40px-New_York_City_at_night_HDR.jpg'
				}
			],
			'van gogh': [
				{
					title: 'Sunflowers',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Van_Gogh_Sunflowers_Bracelets.jpg/40px-Van_Gogh_Sunflowers_Bracelets.jpg'
				},
				{
					title: 'Iris',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Vincent_van_Gogh_-_Irises_%281889%29.jpg/40px-Vincent_van_Gogh_-_Irises_%281889%29.jpg'
				},
				{
					title: 'Vincent',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg/40px-Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg'
				},
				{
					title: 'Stolen',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Van_Gogh_-_The_Parsonage_Garden_at_Nuenen.jpg/40px-Van_Gogh_-_The_Parsonage_Garden_at_Nuenen.jpg'
				},
				{
					title: 'Paintings',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg/40px-Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg'
				}
			],
			'vincent van gogh': [
				{
					title: 'Starry night',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Vincent_van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/40px-Vincent_van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg'
				},
				{
					title: 'Sunflowers',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Sunflowers_National_Gallery.jpg/40px-Sunflowers_National_Gallery.jpg'
				},
				{
					title: 'Self portrait',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg/40px-Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg'
				},
				{
					title: 'Paintings',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg/40px-Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg'
				},
				{
					title: 'Museum',
					thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg/40px-Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg'
				}
			]
		}[ this.state.term.toLowerCase() ] || []
	};
};

/**
 * @return {jQuery.Promise}
 */
SearchResultsWidget.prototype.fetchMore = function () {
	var self = this,
		raw = [],
		params;

	if ( this.state.term.length === 0 ) {
		return this.setState( {
			results: [],
			continue: '',
			hasMore: false
		} );
	}

	if ( this.fetchingPromise !== undefined ) {
		return this.fetchingPromise;
	}

	if ( this.state.type === 'category' ) {
		params = {
			format: 'json',
			uselang: mw.config.get( 'wgUserLanguage' ),
			action: 'query',
			generator: 'search',
			gsrsearch: this.state.term,
			gsrnamespace: 14, // NS_CATEGORY
			gsrlimit: this.state.limit,
			gsroffset: this.state.continue || 0,
			prop: 'info',
			inprop: 'url'
		};
	} else {
		if ( this.state.type ) {
			raw.push( 'filetype:' + this.state.type );
		}
		if ( this.state.resolution ) {
			raw.push( 'fileres:' + this.state.resolution );
		}

		params = {
			format: 'json',
			uselang: mw.config.get( 'wgUserLanguage' ),
			action: 'query',
			generator: 'mediasearch',
			gmssearch: this.state.term,
			gmsrawsearch: raw.join( ' ' ),
			gmslimit: this.state.limit,
			gmscontinue: this.state.continue,
			prop: 'info|imageinfo|pageterms',
			inprop: 'url',
			iiprop: 'url|size|mime',
			iiurlheight: this.state.type === 'bitmap' ? 180 : undefined,
			iiurlwidth: this.state.type === 'video' ? 200 : undefined,
			wbptterms: 'label'
		};
	}

	this.fetchingPromise = new mw.Api().get( params ).then( function ( response ) {
		var pages = response.query && response.query.pages || [],
			results = Object.keys( pages ).map( function ( key ) {
				return pages[ key ];
			} );

		results.sort( function ( a, b ) {
			return a.index - b.index;
		} );

		return self.setState( {
			results: self.state.results.concat( results ),
			continue: response.continue ? ( response.continue.gmscontinue || response.continue.gsroffset ) : '',
			hasMore: results.length > self.state.limit || !!response.continue
		} );
	} );

	return this.fetchingPromise.then( function ( $element ) {
		self.fetchingPromise = undefined;
		return $element;
	} );
};

/**
 * @return {boolean}
 */
SearchResultsWidget.prototype.hasMore = function () {
	return this.state.hasMore;
};

/**
 * @return {string}
 */
SearchResultsWidget.prototype.getType = function () {
	return this.state.type;
};

/**
 * @param {string} type
 * @return {$.Promise}
 */
SearchResultsWidget.prototype.setType = function ( type ) {
	return this.setState( {
		results: [],
		continue: '',
		hasMore: true,
		type: type
	} );
};

/**
 * @param {string} resolution
 * @return {$.Promise}
 */
SearchResultsWidget.prototype.setResolution = function ( resolution ) {
	return this.setState( {
		results: [],
		continue: '',
		hasMore: true,
		resolution: resolution
	} );
};

module.exports = SearchResultsWidget;
