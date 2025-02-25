'use strict';

module.exports = function ( grunt ) {
	const conf = grunt.file.readJSON( 'extension.json' );

	grunt.loadNpmTasks( 'grunt-eslint' );
	grunt.loadNpmTasks( 'grunt-banana-checker' );
	grunt.loadNpmTasks( 'grunt-stylelint' );

	grunt.initConfig( {
		eslint: {
			options: {
				extensions: [ '.js', '.json', '.vue' ],
				cache: true,
				fix: grunt.option( 'fix' )
			},
			all: [
				'**/*.{js,json,vue}',
				'!{vendor,node_modules}/**',
				'!tests/node-qunit/**'
			]
		},
		banana: conf.MessagesDirs,
		stylelint: {
			options: {
				cache: true
			},
			all: [
				'**/*.less',
				'!node_modules/**',
				'!vendor/**',
				'!lib/**'
			]
		}
	} );

	grunt.registerTask( 'test', [ 'eslint', 'banana', 'stylelint' ] );
	grunt.registerTask( 'default', 'test' );
};
