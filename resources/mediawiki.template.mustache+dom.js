mw.template.registerCompiler( 'mustache+dom', {
	compile: function () {
		var compiler = mw.template.getCompiler( 'mustache' ),
			compiled = compiler.compile.apply( compiler, arguments );

		return {
			/**
			 * This will return an array of relevant Element nodes from
			 * the given input variable, which could be of type Element,
			 * jQuery or an OOUI element.
			 *
			 * @param {Element|jQuery|OO.ui.Element} variable
			 * @return {Array} Array of DOM nodes
			 */
			getNode: function ( variable ) {
				// check if `instanceof Node` (except that wouldn't work headless;
				// ref `Node` missing)
				if ( typeof variable === 'object' && typeof variable.nodeType === 'number' ) {
					return [ variable ];
				} else if ( variable instanceof $ ) {
					return variable.toArray();
				} else if ( variable instanceof OO.ui.Element ) {
					return variable.$element.toArray();
				}
				throw new Error( 'Not a node-like variable' );
			},
			/**
			 * @ignore
			 * @param {Object} data Data to render
			 * @return {jQuery} Rendered HTML
			 */
			render: function ( data ) {
				var self = this,
					$container = $( '<div>' ),
					dom = [],
					transformNodes, i, $result;

				transformNodes = function ( d ) {
					var keys = Object.keys( d ),
						result = new d.constructor(),
						key, i, node, $stub;

					for ( i = 0; i < keys.length; i++ ) {
						key = keys[ i ];

						if (
							// check if array or string literal, in which case
							// we'll want to go recursive
							d[ key ] instanceof Array ||
							Object.getPrototypeOf( d[ key ] || '' ) === Object.prototype
						) {
							result[ key ] = transformNodes( d[ key ] );
						} else {
							try {
								// try to fetch DOM node from this data, for which
								// we'll want to parse a placeholder into the template
								node = self.getNode( d[ key ] );
								$stub = $( '<div>' ).addClass( 'tpl-dom-' + dom.length );
								dom.push( node );
								result[ key ] = $stub[ 0 ].outerHTML;
							} catch ( e ) {
								// fall through, leaving data unaltered
								result[ key ] = d[ key ];
							}
						}
					}

					return result;
				};

				data = transformNodes( data );

				// render the template, using placeholder HTML for DOM nodes
				// (this is basically `compiled.render( data, partialTemplates )`, but made
				// more generic so it could be copied right over for other templates, with
				// a different set of other arguments)
				$result = compiled.render.apply( compiled, [].concat(
					data,
					[].slice.call( arguments, 1 )
				) );

				// ... and replace placeholder with actual nodes now
				$container.append( $result );
				for ( i = 0; i < dom.length; i++ ) {
					$container.find( '.tpl-dom-' + i ).replaceWith( dom[ i ] );
				}

				return $container.children();
			}
		};
	}
} );
