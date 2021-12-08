'use strict';

/**
 * @constructor
 * @param {string} moduleName
 * @param {string} templateName
 */
var ComponentWidget = function MediaInfoComponentWidget( moduleName, templateName ) {
	// add default state for default OOUI functionality where we
	// can resonably expect that we'll want to rerender if it
	// changes; probably should prefer using OOUI's built-in
	// `isDisabled` and `getItems` methods over these copies in state
	this.state = $.extend( { _disabled: this.isDisabled(), _group: [] }, this.state || {} );
	this.pendingState = {};
	this.moduleName = moduleName;
	this.templateName = templateName;

	// force initial render
	this.render();
};

/**
 * Called after state has been modified, and before rerendering.
 * Return false to prevent rerender.
 *
 * Argument previousState can be used to compare again new
 * `this.state` to determine whether a rerender is warranted.
 *
 * @protected
 * @param {Object} previousState
 * @return {Object|jQuery.Promise<Object>}
 */
// eslint-disable-next-line no-unused-vars
ComponentWidget.prototype.shouldRerender = function ( previousState ) {
	return true;
};

/**
 * Called after state has been modified, and before rerendering.
 * Return an object to be passed on to the template.
 *
 * @protected
 * @return {Object|jQuery.Promise<Object>}
 */
ComponentWidget.prototype.getTemplateData = function () {
	return this.state;
};

/**
 * Accepts a `{ key: value }` map (state) whose data will be
 * added to, *not replace*, the current state.
 *
 * E.g. given current this.state is `{ a: 'one' }`, and an
 * argument `{ b: 'two' }` is passed to this method, that'll
 * result in a state of `{ a: 'one', b: 'two' }`.
 *
 * After the state is changed, a rerender will be initiated,
 * which can further be controlled via `shouldRerender` and
 * `getTemplateData`.
 *
 * This method returns a promise that will not resolve until
 * rerendering (if needed) is complete.
 *
 * @protected
 * @param {Object} state
 * @return {jQuery.Promise}
 */
ComponentWidget.prototype.setState = function ( state ) {
	var deferred = $.Deferred();

	// add the newest state changes - expanding on previous (if any)
	// changes that have no yet been rendered (because previous render
	// was still happening, possibly)
	this.pendingState = $.extend( {}, this.pendingState, state );

	// this will prevent new data from starting a render right
	// away (there may be more changes coming in and it'd be
	// better if we can combine them) - it'll kick off a new
	// render at the end of the current call stack instead
	setTimeout( deferred.resolve );
	return deferred.promise().then( this.render.bind( this ) );
};

/**
 * Returns a promise that will resolve with the jQuery $element
 * as soon as it is done rendering.
 *
 * @return {jQuery.Promise<jQuery>}
 */
ComponentWidget.prototype.render = function () {
	var self = this;

	if ( this.renderPromise === undefined ) {
		// initial render
		this.renderPromise = this.renderInternal();
		return this.renderPromise;
	}

	this.renderPromise = this.renderPromise
		.then( function ( $element ) {
			var previousState = $.extend( {}, self.state ),
				hasChanges = Object.keys( self.pendingState ).some( function ( key ) {
					return ( !( key in self.state ) || self.state[ key ] !== self.pendingState[ key ] );
				} );

			self.state = $.extend( {}, self.state, self.pendingState );
			self.pendingState = {};

			if ( !hasChanges ) {
				// if there are no changes, the existing render is still valid
				return $element;
			}

			if ( !self.shouldRerender( previousState ) ) {
				// if code indicates the changes are not worth rerendering, the existing render will do
				return $element;
			}

			return self.renderInternal();
		} );
	return this.renderPromise;
};

/**
 * Returns a promise that will resolve with the jQuery $element
 * as soon as it is done rendering.
 *
 * @private
 * @return {jQuery.Promise<jQuery>}
 */
ComponentWidget.prototype.renderInternal = function () {
	var self = this;

	// always chain renders on top of the previous one, so a new
	// render does not conflict with an in-progress one
	return $.Deferred().resolve().promise()
		.then( this.getTemplateData.bind( this ) )
		.then( this.extractParamDOMNodes.bind( this ) )
		.then( function ( data, nodes ) {
			var template = mw.template.get( self.moduleName, self.templateName ),
				$rendered = template.render( data ),
				scrollTop = $( window ).scrollTop();

			nodes = nodes.concat( self.extractDOMNodesWithContext( self.$element.get( 0 ) ) );

			self.$element = $( self.rebuildDOM(
				self.$element.get( 0 ),
				$( self.$element.get( 0 ).cloneNode( false ) ).append( $rendered ).get( 0 ),
				nodes
			) );

			// after having rebuilt the DOM and things might have shifted up & down,
			// let's make sure we're back at the scroll position we were before
			$( window ).scrollTop( scrollTop );

			return self.$element;
		} )
		.catch( function ( e ) {
			// something somewhere in the render process failed, but that's ok
			// we won't handle this except for just catching it & turning the
			// promise back into a thenable state, so that follow-up renders
			// can still proceed

			// eslint-disable-next-line no-console
			console.warn( e );

			return $();
		} );
};

/**
 * This method will take 2 jQuery collections: $old and $new.
 * $old will be populated with nodes from $new, except for nodes that match,
 * those will be left as they were - only new changes (additions or removals)
 * will be taken from $new.
 *
 * This is done to preserve existing nodes as much as possible, because if they
 * get replaced/attached/detached/..., they'd otherwise lose context (e.g. focus
 * state)
 *
 * @private
 * @param {Node} oldContainer
 * @param {Node} newContainer
 * @param {Node[]} [preservedNodes]
 * @return {Node}
 */
ComponentWidget.prototype.rebuildDOM = function ( oldContainer, newContainer, preservedNodes ) {
	var newChildrenArray = [].slice.call( newContainer.childNodes ),
		oldChildrenArray = [].slice.call( oldContainer.childNodes ),
		matchedNodes = this.matchNodes( newChildrenArray, oldChildrenArray, preservedNodes ),
		newNode,
		oldNode,
		newIndex,
		currentIndex,
		i;

	for ( newIndex = 0; newIndex < newChildrenArray.length; newIndex++ ) {
		newNode = newChildrenArray[ newIndex ];
		oldNode = matchedNodes[ newIndex ];
		currentIndex = oldNode ? [].slice.call( oldContainer.childNodes ).indexOf( oldNode ) : -1;

		// step 1: figure out the position of the new nodes in the old DOM,
		// insert it at the correct position (if new) or detach existing
		// nodes that now no longer exist before the new node
		if ( currentIndex < 0 ) {
			// if new node did not previously exist, insert it at this index
			if ( oldContainer.childNodes.length === 0 ) {
				oldContainer.appendChild( newNode );
			} else {
				oldContainer.insertBefore( newNode, oldContainer.childNodes[ newIndex ] );
			}
			// it's a new node; there's no merging left to be done with an old
			// node, so let's bail early!
			continue;
		} else if ( currentIndex > newIndex ) {
			// if node already exists, but further away in DOM, detach everything
			// in between (could be old nodes that will end up removed;
			// could be old nodes that we'll still need elsewhere later on)
			[].slice.call( oldContainer.childNodes, newIndex, currentIndex ).forEach( function ( node ) {
				node.parentNode.removeChild( node );
			} );
		}

		// step 2: if we have a new node that corresponds with an existing one,
		// figure out what to do with it: this could mean keeping either the old
		// or new node (if it's one to be preserved - i.e. we're manipulating the
		// node directly elsewhere in JS), or trying to apply properties of the
		// new node to the old node
		if ( preservedNodes.indexOf( oldNode ) >= 0 ) {
			// oldNode is a node that needs to be preserved: it was a DOM node
			// directly assigned as a variable to the template and it may have
			// context that we must not lose (event listeners, focus state...)
			// leave this node alone!
			preservedNodes.splice( preservedNodes.indexOf( oldNode ), 1 );
		} else if ( preservedNodes.indexOf( newNode ) >= 0 ) {
			// same as above: it was assigned to the template, but it did not
			// yet exist in the old render (a very similar node might exist,
			// but not this exact one, which might have other event handlers
			// bound or so)
			// we must not try to merge old & new nodes, this is the exact
			// right node - it was passed into the template as such
			oldNode.parentNode.replaceChild( newNode, oldNode );
			preservedNodes.splice( preservedNodes.indexOf( oldNode ), 1 );
		} else if ( this.isEqualNodeAndProps( oldNode, newNode ) ) {
			// this node is identical, there's nothing we need to do here,
			// we can simply keep our old node
		} else if ( oldNode.tagName && oldNode.tagName === newNode.tagName ) {
			// this is for all other nodes, that were built from the HTML in
			// the template
			// we don't want to simply swap out these nodes, because then we
			// could lose context (e.g. focus state or input values), so let's
			// just try to apply the new characteristics on to the existing nodes
			for ( i = 0; i < oldNode.attributes.length; i++ ) {
				oldNode.removeAttribute( oldNode.attributes[ i ].name );
			}
			for ( i = 0; i < newNode.attributes.length; i++ ) {
				oldNode.setAttribute( newNode.attributes[ i ].name, newNode.attributes[ i ].value );
			}

			// rebuild children as needed, recursively
			oldNode = this.rebuildDOM( oldNode, newNode, preservedNodes );
		} else {
			oldNode.parentNode.replaceChild( newNode, oldNode );
		}
	}

	// remove leftover nodes, returning only the relevant ones
	[].slice.call( oldContainer.childNodes, newChildrenArray.length ).forEach( function ( node ) {
		node.parentNode.removeChild( node );
	} );
	return oldContainer;
};

/**
 * This will extract DOM nodes (or their OOUI/jQuery representation) and
 * substitute them for a clone, to prevent those nodes from being detached from
 * their current position in DOM (which would make them lose focus)
 *
 * @private
 * @param {Object} data
 * @return {jQuery.Promise}
 */
ComponentWidget.prototype.extractParamDOMNodes = function ( data ) {
	var self = this,
		transformed,
		getNode,
		transformNodes;

	getNode = function ( variable ) {
		// check if `instanceof Node` (except that wouldn't work headless;
		// ref `Node` missing)
		if ( typeof variable === 'object' && typeof variable.nodeType === 'number' ) {
			return [ variable ];
		} else if ( variable instanceof $ ) {
			return variable.toArray();
		} else if ( variable.$element !== undefined ) {
			return variable.$element.toArray();
		}
		throw new Error( 'Not a node-like variable' );
	};

	transformNodes = function ( d ) {
		var keys = Object.keys( d ),
			result = new d.constructor(),
			originals = [],
			key, i, j, recursive, nodes, node;

		for ( i = 0; i < keys.length; i++ ) {
			key = keys[ i ];

			if (
				// check if array or object literal, in which case
				// we'll want to go recursive
				d[ key ] instanceof Array ||
				( d[ key ] instanceof Object && Object.getPrototypeOf( d[ key ] ) === Object.prototype )
			) {
				recursive = transformNodes( d[ key ] );
				result[ key ] = recursive.data;
				originals = originals.concat( recursive.nodes );
			} else {
				try {
					// clone the node we might want to parse into the template;
					// it'd be parsed into the template just fine unaltered
					// (by mediawiki.template.mustache+dom.js), but it'd mean
					// that the node would get detached from its current place
					// in DOM - instead, we'll parse a clone in there, and then
					// our post-render processing (`rebuildDOM`) will recognize
					// these nodes are the same and use the original one instead
					nodes = getNode( d[ key ] );
					result[ key ] = [];
					for ( j = 0; j < nodes.length; j++ ) {
						node = nodes[ j ];
						originals.push( node );
						// only clone nodes that are currently rendered - others
						// should actually render the real nodes (not clones)
						if ( self.$element.find( node ).length > 0 ) {
							result[ key ].push( node.cloneNode( true ) );
						} else {
							result[ key ].push( node );
						}
					}
				} catch ( e ) {
					// fall through, leaving data unaltered
					result[ key ] = d[ key ];
				}
			}
		}

		return { data: result, nodes: originals };
	};

	transformed = transformNodes( data );
	return $.Deferred().resolve( transformed.data, transformed.nodes ).promise();
};

/**
 * @private
 * @param {Node} node
 * @return {Array}
 */
ComponentWidget.prototype.extractDOMNodesWithContext = function ( node ) {
	return [].concat(
		// the active node must be preserved, so that we don't lose e.g. focus
		$( node ).find( document.activeElement ).addBack( document.activeElement ).get(),
		// if this node or one of its children is a form element whose value has
		// been altered compared to what it rendered with initially, it matters
		$( node )
			.find( 'input:not([type="checkbox"]):not([type="radio"]), textarea' )
			.addBack( 'input:not([type="checkbox"]):not([type="radio"]), textarea' )
			.filter( function ( i, n ) {
				return n.value !== n.defaultValue;
			} ).get(),
		$( node )
			.find( 'input[type="checkbox"], input[type="radio"]' )
			.addBack( 'input[type="checkbox"], input[type="radio"]' )
			.filter( function ( i, n ) {
				return n.checked !== n.defaultChecked;
			} ).get(),
		$( node )
			.find( 'option' )
			.addBack( 'option' )
			.filter( function ( i, n ) {
				return n.selected !== n.defaultSelected;
			} ).get()
	);
};

/**
 * Given 2 collection of nodes (`one` and `two`), this will return
 * an array of the same size as `one`, where the indices correspond
 * to the nodes in `one`, and the values are the best matching/most
 * similar node in `two`.
 *
 * @private
 * @param {Node[]} one
 * @param {Node[]} two
 * @param {Node[]} [preserve]
 * @return {Node[]}
 */
ComponentWidget.prototype.matchNodes = function ( one, two, preserve ) {
	var self = this,
		isRelevantNode = function ( node ) {
			return node.tagName && (
				// if this node or one of its children is one to be preserved, it matters
				( preserve || [] ).some( function ( p ) {
					return $( node ).find( p ).addBack( p ).length > 0;
				} ) ||
				self.extractDOMNodesWithContext( node ).length > 0
			);
		},
		getNumberOfEqualChildren = function ( needle, haystack ) {
			return haystack.map( function ( target ) {
				if ( self.getNumberOfEqualNodes( [ needle ], [ target ] ) === 0 ) {
					return 0;
				}
				return self.getNumberOfEqualNodes(
					[].slice.call( needle.children ),
					[].slice.call( target.children )
				);
			} );
		},
		filterRelevantNodes = function ( needle, haystack ) {
			return haystack.filter( function ( target ) {
				return (
					target.tagName &&
					// exclude nodes where neither this or the other node are relevant
					( isRelevantNode( needle ) || isRelevantNode( target ) )
				);
			} );
		},
		filterByMostSimilar = function ( needle, haystack ) {
			var numbers = getNumberOfEqualChildren( needle, haystack ),
				best = Math.max.apply( Math, numbers.concat( 0 ) );

			return haystack.filter( function ( target, i ) {
				return numbers[ i ] === best;
			} );
		},
		filterByLeastDissimilar = function ( needle, haystack ) {
			var numbers = getNumberOfEqualChildren( needle, haystack ).map( function ( number, i ) {
					return Math.max( needle.children.length, haystack[ i ].children.length ) - number;
				} ),
				best = Math.min.apply( Math, numbers.concat( needle.children.length ) );

			return haystack.filter( function ( target, i ) {
				return numbers[ i ] === best;
			} );
		};

	return one.reduce( function ( result, node, index, arr ) {
		var other = [].concat( two ),
			remaining = arr.slice( index ).filter( function ( target ) {
				return target.tagName !== undefined;
			} ),
			i;

		// don't bother matching non-nodes
		if ( node.tagName === undefined ) {
			return result.concat( undefined );
		}

		other = filterRelevantNodes( node, other ).filter( function ( target ) {
			// exclude nodes that we've already paired to a previous node
			return result.indexOf( target ) < 0;
		} );

		// find the first unmatched relevant equal node (if any)
		for ( i = 0; i < other.length; i++ ) {
			if ( node.isEqualNode( other[ i ] ) ) {
				return result.concat( other[ i ] );
			}
		}

		// narrow it down to nodes with the most matching children
		other = filterByMostSimilar( node, other );

		// narrow down nodes by cross-referencing similarities from the
		// other side: a future node might actually be a better match...
		other = other.filter( function ( target ) {
			return filterByMostSimilar( target, remaining ).indexOf( node ) >= 0;
		} );

		// narrow it down further to the one(s) with the minimum amount
		// of different children
		other = filterByLeastDissimilar( node, other );

		// narrow down nodes by cross-referencing dissimilarities from the
		// other side: a future node might actually be a better match...
		other = other.filter( function ( target ) {
			return filterByLeastDissimilar( target, remaining ).indexOf( node ) >= 0;
		} );

		// return the first of whatever is left
		return result.concat( other.shift() );
	}, [] );
};

/**
 * Similar to Node.isEqualNode, except that it will also compare live properties.
 *
 * @private
 * @param {Node} one
 * @param {Node} two
 * @return {boolean}
 */
ComponentWidget.prototype.isEqualNodeAndProps = function ( one, two ) {
	var self = this,
		property, descriptor;

	if ( !one.isEqualNode( two ) ) {
		return false;
	}

	// isEqualNode doesn't compare props, so an input field with some manual
	// text input (where `value` prop is different from the `value` attribute,
	// because the one doesn't sync back when it changes) could be considered
	// equal even if they have different values - hence the added value compare
	for ( property in one.constructor.prototype ) {
		// some properties or getters are auto computed and can't be set
		// comparing these (e.g. `webkitEntries`) makes no sense
		descriptor = Object.getOwnPropertyDescriptor( one.constructor.prototype, property );
		if ( descriptor === undefined || !descriptor.writable || descriptor.set === undefined ) {
			continue;
		}

		// if properties don't match, these nodes are not equal...
		if ( one[ property ] !== two[ property ] ) {
			return false;
		}
	}

	// nodes are the same, but there may be similar prop differences in children...
	return !one.children || ![].slice.call( one.children ).some( function ( child, i ) {
		return !self.isEqualNodeAndProps( child, two.children[ i ] );
	} );
};

/**
 * Find the amount of equal nodes, based on the nodes themselves being
 * `.isEqualNode`, or their children (or theirs, recursively) matching.
 *
 * @private
 * @param {Node[]} one
 * @param {Node[]} two
 * @return {number}
 */
ComponentWidget.prototype.getNumberOfEqualNodes = function ( one, two ) {
	var self = this;

	return one
		.map( function ( twoNode ) {
			return two.some( function ( oneNode ) {
				var nodeOneChildren,
					nodeTwoChildren;

				if ( oneNode.tagName !== twoNode.tagName ) {
					return false;
				}

				if ( oneNode.id || twoNode.id ) {
					// nodes that have an id must match
					return oneNode.id === twoNode.id;
				}

				if ( oneNode.getAttribute( 'data-key' ) || twoNode.getAttribute( 'data-key' ) ) {
					// nodes that have a data-key attribute must match
					// (similar to id, but doesn't have to be unique
					// on the page, as long as it's unique in the template)
					return oneNode.getAttribute( 'data-key' ) === twoNode.getAttribute( 'data-key' );
				}

				if ( oneNode.isEqualNode( twoNode ) ) {
					// node with exact same characteristics = match!
					return true;
				}

				// node is not a perfect match - let's run their children through the same set of criteria
				nodeOneChildren = [].slice.call( oneNode.children );
				nodeTwoChildren = [].slice.call( twoNode.children );
				return self.getNumberOfEqualNodes( nodeOneChildren, nodeTwoChildren ) > 0;
			} );
		} )
		.reduce( function ( sum, isEqual ) {
			return sum + ( isEqual ? 1 : 0 );
		}, 0 );
};

/**
 * OOUI widgets support this by default (and GroupWidget takes it
 * a little further, which is why I'm calling that one instead)
 * Let's also keep track of the disabled status in our internal
 * state, and make sure that when this is changed, it also triggers
 * a rerender.
 *
 * @inheritDoc
 */
ComponentWidget.prototype.setDisabled = function ( disabled ) {
	// object may not yet have been constructed fully
	if ( this.renderPromise ) {
		this.setState( { _disabled: disabled } );
	}
	return OO.ui.mixin.GroupWidget.prototype.setDisabled.call( this, disabled );
};

/**
 * Override for when this is used alongside a GroupElement, where one
 * would likely expect DOM updates when items are modified.
 *
 * @inheritDoc
 */
ComponentWidget.prototype.addItems = function () {
	var result = OO.ui.mixin.GroupElement.prototype.addItems.apply( this, arguments );
	this.setState( { _group: $.extend( [], this.getItems() ) } );
	return result;
};

/**
 * Override for when this is used alongside a GroupElement, where one
 * would likely expect DOM updates when items are modified.
 *
 * @inheritDoc
 */
ComponentWidget.prototype.removeItems = function () {
	var result = OO.ui.mixin.GroupElement.prototype.removeItems.apply( this, arguments );
	this.setState( { _group: $.extend( [], this.getItems() ) } );
	return result;
};

/**
 * Override for when this is used alongside a GroupElement, where one
 * would likely expect DOM updates when items are modified.
 *
 * @inheritDoc
 */
ComponentWidget.prototype.moveItem = function () {
	var result = OO.ui.mixin.GroupElement.prototype.moveItem.apply( this, arguments );
	this.setState( { _group: $.extend( [], this.getItems() ) } );
	return result;
};

/**
 * Override for when this is used alongside a GroupElement, where one
 * would likely expect DOM updates when items are modified.
 *
 * @inheritDoc
 */
ComponentWidget.prototype.insertItem = function () {
	var result = OO.ui.mixin.GroupElement.prototype.insertItem.apply( this, arguments );
	this.setState( { _group: $.extend( [], this.getItems() ) } );
	return result;
};

/**
 * Override for when this is used alongside a GroupElement, where one
 * would likely expect DOM updates when items are modified.
 *
 * @inheritDoc
 */
ComponentWidget.prototype.clearItems = function () {
	var result = OO.ui.mixin.GroupElement.prototype.clearItems.apply( this, arguments );
	this.setState( { _group: $.extend( [], this.getItems() ) } );
	return result;
};

/**
 * Set error text(s) to be used by template.
 *
 * @param {Array} errors An array of error texts
 * @return {jQuery.Deferred}
 */
ComponentWidget.prototype.setErrors = function ( errors ) {
	return this.setState( { errors: errors } );
};

/**
 * Get an array of current error messages.
 *
 * @return {Array}
 */
ComponentWidget.prototype.getErrors = function () {
	return this.state.errors || [];
};

module.exports = ComponentWidget;
