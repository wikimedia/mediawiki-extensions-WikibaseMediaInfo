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
	this.renderPromise = this.render();
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
	var self = this,
		previousPendingState = this.pendingState;

	// add the newest state changes - expanding on previous (if any)
	// changes that have no yet been rendered (because previous render
	// was still happening, possibly)
	this.pendingState = $.extend( {}, this.pendingState, state );

	// multiple setState calls could happen while an earlier change
	// is still being rendered, in which case the new state changes
	// will be bundled (into pendingState) until we're ready to render;
	// we'll schedule a new render as soon as the previous one is done,
	// which will then apply all new incoming state changes at once
	if ( Object.keys( previousPendingState ).length === 0 && Object.keys( this.pendingState ).length > 0 ) {
		this.renderPromise = this.renderPromise
			.then( function ( $element ) {
				// this will prevent new data from starting a render right
				// away (there may be more changes coming in and it'd be
				// better if we can combine them) - it'll kick off a new
				// render at the end of the current call stack instead
				var deferred = $.Deferred();
				setTimeout( deferred.resolve.bind( deferred, $element ) );
				return deferred.promise();
			} )
			.then( function ( $element ) {
				var previousState = $.extend( {}, self.state ),
					changed = false;

				Object.keys( self.pendingState ).forEach( function ( key ) {
					var value = self.pendingState[ key ];

					if ( !( key in self.state ) || self.state[ key ] !== value ) {
						self.state[ key ] = value;
						changed = true;
					}
				} );
				self.pendingState = {};

				if ( changed && self.shouldRerender( previousState ) ) {
					return self.render();
				}

				return $element;
			} );
	}

	return this.renderPromise;
};

/**
 * Returns a promise that will resolve with the jQuery $element
 * as soon as it is done rendering.
 *
 * @return {jQuery.Promise<jQuery>}
 */
ComponentWidget.prototype.render = function () {
	var self = this;

	return $.Deferred().resolve().promise()
		.then( this.getTemplateData.bind( this ) )
		.then( this.extractDOMNodes.bind( this ) )
		.then( function ( data, preserve ) {
			var template = mw.template.get( self.moduleName, self.templateName ),
				$rendered = template.render( data );

			self.rebuildDOM(
				self.$element,
				$( self.$element.get( 0 ).cloneNode( false ) ).append( $rendered ),
				preserve
			);

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
 * @param {jQuery} $old
 * @param {jQuery} $new
 * @param {Array} [preserve]
 * @return {jQuery}
 */
ComponentWidget.prototype.rebuildDOM = function ( $old, $new, preserve ) {
	var self = this,
		random = Math.random().toString( 36 ).substring( 2 ),
		$terminatorOld = $( '<span data-random="terminator-' + random + '">' ),
		$terminatorNew = $( '<span data-random="terminator-' + random + '">' ),
		$newNodes,
		$oldNodes;

	preserve = preserve || [];

	// add a bogus last node (it will be removed again) that will be used to
	// make it slightly easier to iterate and manipulate nodes: we always know
	// that there is a matching node at the end of both $new and $old, and we
	// don't need to go look ahead
	$old.append( $terminatorOld );
	$new.append( $terminatorNew );

	$newNodes = $new.contents();
	$oldNodes = $old.contents();

	this.matchNodes( $newNodes, $oldNodes ).map( function ( $oldNode, newIndex ) {
		var oldIndex = $oldNodes.index( $oldNode ),
			oldNode = $oldNodes.get( oldIndex ),
			newNode = $newNodes.get( newIndex ),
			currentIndex = $old.contents().index( oldNode );

		if ( oldIndex < 0 ) {
			// if new node did not previously exist, insert it at this index
			$old.contents().get( newIndex ).before( newNode );
			return;
		}

		if ( currentIndex > newIndex ) {
			// if node already exists, but further away in DOM, detach everything
			// in between (could be old nodes that will end up removed;
			// could be old nodes that we'll still need elsewhere later on)
			$old.contents().slice( newIndex, currentIndex ).detach();
		}

		if ( preserve.indexOf( oldNode ) >= 0 ) {
			// oldNode is a node that needs to be preserved: it was a DOM node
			// directly assigned as a variable to the template and it may have
			// context that we must not lose (event listeners, focus state...)
			// leave this node alone!
			// (this block is intentionally blank to make above reasoning clear)
		} else if ( preserve.indexOf( newNode ) >= 0 ) {
			// same as above: it was assigned to the template, but it did not
			// yet exist in the old render (a very similar node might exist,
			// but not this exact one, which might have other events handlers
			// bound or so)
			// we must not try to merge old & new nodes, this is the exact
			// right node - it was passed into the template as such
			$( oldNode ).replaceWith( $( newNode ).after( $( oldNode ).clone() ) );
		} else if ( !self.isEqualNodeAndProps( oldNode, newNode ) && preserve.indexOf( oldNode ) < 0 ) {
			// this is for all other nodes, that were built from the HTML in
			// the template
			// we don't want to simply swap out these nodes, because then we
			// could lose context (e.g. focus state or input values), so let's
			// just try to apply the new characteristics on to the existing nodes

			[].slice.call( oldNode.attributes ).forEach( function ( attribute ) {
				oldNode.removeAttribute( attribute.name );
			} );
			[].slice.call( newNode.attributes ).forEach( function ( attribute ) {
				oldNode.setAttribute( attribute.name, attribute.value );
			} );

			// rebuild children as needed, recursively
			self.rebuildDOM( $( oldNode ), $( newNode ), preserve );
		}
	} );

	// remove terminator and return relevant nodes
	$terminatorOld.remove();
	return $old;
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
ComponentWidget.prototype.extractDOMNodes = function ( data ) {
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
				// check if array or string literal, in which case
				// we'll want to go recursive
				d[ key ] instanceof Array ||
				Object.getPrototypeOf( d[ key ] || '' ) === Object.prototype
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
 * Given 2 collection of nodes ($one and $two), this will return
 * an array of the same size as $one, where the indices correspond
 * to the nodes in $one, and the values are the best matching/most
 * similar node in $two.
 *
 * @private
 * @param {jQuery} $one
 * @param {jQuery} $two
 * @return {Array}
 */
ComponentWidget.prototype.matchNodes = function ( $one, $two ) {
	var self = this,
		used = [],
		mapOne, mapTwo;

	// fnd best matching nodes in both data sets
	mapOne = $one.get().map( function ( node ) {
		return self.findBestMatchingNodes( $( node ), $two );
	} );
	mapTwo = $two.get().map( function ( node ) {
		return self.findBestMatchingNodes( $( node ), $one );
	} );

	return mapOne
		// we'll first eliminate all matches that don't cross-reference
		// one another (e.g. where $two finds that there is a better match
		// in $one)
		.map( function ( $nodesInTwo, i ) {
			var nodeInOne = $one.eq( i );
			return $nodesInTwo.filter( function ( i, nodeInTwo ) {
				var $nodesInOne = mapTwo[ $two.index( nodeInTwo ) ];
				return $nodesInOne.filter( nodeInOne ).length > 0;
			} );
		} )
		// next, we'll make sure to only keep 1 best match: the first
		// remaining one (except if already matched elsewhere)
		.map( function ( $nodesInTwo ) {
			// grab the first (available) node
			// there may still be multiple matches, so let's make
			// sure we don't match one already matched earlier...
			var $nodeInTwo = $nodesInTwo.filter( function ( i, nodeInTwo ) {
				return used.indexOf( nodeInTwo ) < 0;
			} ).eq( 0 );

			// append to array of used nodes, so next node can't use
			// it anymore
			used.push( $nodeInTwo.get( 0 ) );

			return $nodeInTwo;
		} );
};

/**
 * Locate the same node in a haystack, either by being the exact same
 * node (`.isEqualNode`), or the best possible matches with the same children.
 *
 * @private
 * @param {jQuery} $needle
 * @param {jQuery} $haystack
 * @return {jQuery}
 */
ComponentWidget.prototype.findBestMatchingNodes = function ( $needle, $haystack ) {
	var self = this,
		$match,
		$potentialMatches,
		matchingChildrenAmounts,
		maxMatchingChildren;

	// find exact same node
	$match = $haystack
		.filter( function ( i, newNode ) {
			return $needle.get( 0 ).isEqualNode( newNode );
		} );

	if ( $match.length > 0 ) {
		return $match;
	}

	// find similar nodes based on them having the same children
	if ( $match.length === 0 && $needle.prop( 'tagName' ) ) {
		// narrow down to potential matches, based on tag name and node characteristics
		$potentialMatches = $haystack
			.filter( $needle.prop( 'tagName' ) )
			.filter( function ( i, node ) {
				// test whether nodes are similar enough
				// (we'll do this again for all their children to find the
				// *most similar* later on - this just eliminates some,
				// e.g. when id of node doesn't even match)
				return self.getNumberOfEqualNodes( $needle.get(), [ node ] ) > 0;
			} );

		// find the largest amount of matching children
		matchingChildrenAmounts = $potentialMatches.get().map( function ( newNode ) {
			return self.getNumberOfEqualNodes( $needle.children().get(), $( newNode ).children().get() );
		} );
		maxMatchingChildren = Math.max.apply( Math, matchingChildrenAmounts.concat( 0 ) );

		if ( maxMatchingChildren > 0 ) {
			// return the best matching node(s) - the one(s) with the largest amount of matching children
			return $potentialMatches.filter( function ( i ) {
				return matchingChildrenAmounts[ i ] === maxMatchingChildren;
			} );
		}
	}

	return $();
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
 * @param {jQuery[]} one
 * @param {jQuery[]} two
 * @return {number}
 */
ComponentWidget.prototype.getNumberOfEqualNodes = function ( one, two ) {
	var self = this;

	return two
		.map( function ( twoNode ) {
			return one.filter( function ( oneNode ) {
				if ( oneNode.id ) {
					// nodes that have an id must match
					return oneNode.id === twoNode.id;
				}

				if ( oneNode.getAttribute( 'data-key' ) ) {
					// nodes that have a data-key attribute must match
					// (similar to id, but doesn't have to be unique
					// on the page, as long as it's unique in the template)
					return oneNode.getAttribute( 'data-key' ) === twoNode.getAttribute( 'data-key' );
				}

				if ( oneNode.isEqualNode( twoNode ) ) {
					// node with exact same characteristics = match!
					return true;
				}

				// node is not a perfect match - let's run their children
				// through the same set of criteria
				return self.getNumberOfEqualNodes( $( oneNode ).children().get(), $( twoNode ).children().get() ) > 0;
			} ).length;
		} )
		.reduce( function ( sum, count ) {
			return sum + count;
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

module.exports = ComponentWidget;
