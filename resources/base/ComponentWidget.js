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
		.catch( function () {
			// something somewhere in the render process failed, but that's ok
			// we won't handle this except for just catching it & turning the
			// promise back into a thenable state
		} );
};

/**
 * This method will take 2 jQuery collections: $old and $new.
 * $old will be populated with nodes from $new, except for nodes that match,
 * those will be left as they were - only new (additions or removals) changes
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
		lastIndex = -1,
		$nodes,
		oldNode,
		$oldNode,
		oldIndex,
		newNode,
		$newNode,
		newIndex;

	preserve = preserve || [];

	// add a bogus last node (it will be removed again) that will be used to
	// make it slightly easier to iterate and manipulate nodes: we always know
	// that there is a matching node at the end of both $new and $old, and we
	// don't need to go look ahead
	$old.append( $terminatorOld );
	$new.append( $terminatorNew );

	for ( oldIndex = 0; oldIndex < $old.contents().length; oldIndex++ ) {
		$oldNode = $old.contents().eq( oldIndex );
		oldNode = $oldNode.get( 0 );

		// let's ignore empty (whitespace-only) text nodes - we don't want to
		// try to match them because the odds of getting them mixed up and
		// disrupting the order are way too significant
		if ( oldNode.tagName === undefined && oldNode.textContent.trim() === '' ) {
			// remove from DOM
			$oldNode.remove();
			// we just dropped a node - decrease the iterating index
			oldIndex--;
			continue;
		}

		$newNode = this.findMatchingNode( $oldNode, $new.contents().slice( lastIndex + 1 ) );
		newNode = $newNode.get( 0 );
		newIndex = $new.contents().index( $newNode );

		if ( $newNode.length > 0 ) {
			if ( preserve.indexOf( newNode ) >= 0 ) {
				// if we've indicated we want to preserve the new node as-is,
				// (e.g. because an exact node was passed in, which could have
				// event handlers bound etc), just swap them around instead
				// of trying to merge them
				$oldNode.replaceWith( $newNode.after( $oldNode.clone() ) );
				// fix variables pointing to the relevant nodes now that they've
				// been swapped
				$oldNode = $old.contents().eq( oldIndex );
				oldNode = $oldNode.get( 0 );
				$newNode = $new.contents().eq( newIndex );
				newNode = $newNode.get( 0 );
			} else if ( !this.isEqualNodeAndProps( oldNode, newNode ) ) {
				// node is not an exact match - some of its characteristics
				// (attributes, children, ...) don't match - let's fix those!
				// remove existing attributes & copy attributes from new node
				// eslint-disable-next-line no-loop-func
				[].slice.call( oldNode.attributes ).forEach( function ( attribute ) {
					oldNode.removeAttribute( attribute.name );
				} );
				// eslint-disable-next-line no-loop-func
				[].slice.call( newNode.attributes ).forEach( function ( attribute ) {
					oldNode.setAttribute( attribute.name, attribute.value );
				} );

				// rebuild children as needed
				$oldNode = self.rebuildDOM( $oldNode, $newNode, preserve );
			}
		}

		if ( newIndex < 0 ) {
			// remove from DOM
			// (only detach, to retain event handlers, should we need
			// to bring it back on a later rerender)
			$oldNode.detach();
			// we just dropped a node - decrease the iterating index
			oldIndex--;
		} else if ( newIndex < oldIndex ) {
			// match in newly generated content has a lower index than
			// in our old DOM, which means some content that used to exist
			// has now been removed remove from DOM
			// (only detach, to retain event handlers, should we need
			// to bring it back on a later rerender)
			$old.contents().slice( newIndex, oldIndex ).detach();
			// we just dropped nodes to match new structure - update the iterating index
			oldIndex = newIndex;
		} else if ( newIndex > oldIndex ) {
			// match in newly generated content has a higher index,
			// so there's new content that should be added!
			// move nodes into our original DOM & keep a clone around
			// in the alternative version, to retain matching indexes
			$nodes = $new.contents().slice( oldIndex, newIndex );
			$oldNode.before( $nodes );
			$newNode.before( $nodes.clone() );
			// we just changed both new & old structure - update the iterating indexes
			oldIndex = $old.contents().index( $oldNode );
		}

		lastIndex = newIndex >= 0 ? newIndex : lastIndex;
	}

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
			key, i, recursive, nodes;

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
				originals.concat( recursive.nodes );
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
					result[ key ] = nodes.map( function ( node ) {
						// only clone nodes that are currently rendered - others
						// should actually render the real nodes
						if ( self.$element.find( node ).length > 0 ) {
							return node.cloneNode( true );
						}
						originals.push( node );
						return node;
					} );
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
 * Locate the same node in a haystack, either by being the first exact same
 * node (`.isEqualNode`), or the best possible match with the same children.
 *
 * @private
 * @param {jQuery} $needle
 * @param {jQuery} $haystack
 * @return {jQuery}
 */
ComponentWidget.prototype.findMatchingNode = function ( $needle, $haystack ) {
	var self = this,
		$match,
		$potentialMatches,
		matchingChildrenAmounts,
		maxMatchingChildren;

	// find exact same node
	$match = $haystack
		.filter( function ( i, newNode ) {
			return $needle.get( 0 ).isEqualNode( newNode );
		} ).first();

	if ( $match.length > 0 ) {
		return $match;
	}

	// find similar nodes based on them having the same children
	if ( $match.length === 0 && $needle.prop( 'tagName' ) ) {
		// narrow down to potential matches, based on tag name
		$potentialMatches = $haystack.filter( $needle.prop( 'tagName' ) );

		// find the largest amount of matching children
		matchingChildrenAmounts = $potentialMatches.map( function ( i, newNode ) {
			return self.getNumberOfEqualNodes( $needle.children(), $( newNode ).children() );
		} ).get();
		maxMatchingChildren = Math.max.apply( Math, matchingChildrenAmounts.concat( 0 ) );

		if ( maxMatchingChildren > 0 ) {
			// use the best matching node - the one with the largest amount of matching children
			return $potentialMatches.eq( matchingChildrenAmounts.indexOf( maxMatchingChildren ) );
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
 * `.isEqualNode`, or their children (or theirs, recursive) matching.
 *
 * @private
 * @param {jQuery} $one
 * @param {jQuery} $two
 * @return {number}
 */
ComponentWidget.prototype.getNumberOfEqualNodes = function ( $one, $two ) {
	var self = this;

	return $two
		.map( function ( j, twoNode ) {
			return $one.filter( function ( k, oneNode ) {
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
				return self.getNumberOfEqualNodes( $( oneNode ).children(), $( twoNode ).children() ) > 0;
			} ).length;
		} )
		.get()
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
