import {
  assign,
  filter,
  forEach,
  isArray,
  pick
} from 'min-dash';

import MoveHelper from './helper/MoveHelper';

import {
  add as collectionAdd,
  remove as collectionRemove
} from '../../../util/Collections';

import {
  getMovedSourceAnchor,
  getMovedTargetAnchor
} from './helper/AnchorsHelper';


/**
 * A handler that implements reversible moving of shapes.
 */
export default function MoveShapeHandler(modeling) {
  this._modeling = modeling;

  this._helper = new MoveHelper(modeling);
}

MoveShapeHandler.$inject = [ 'modeling' ];


MoveShapeHandler.prototype.execute = function(context) {

  var shape = context.shape,
      delta = context.delta,
      newParent = context.newParent || shape.parent,
      newParentIndex = context.newParentIndex,
      oldParent = shape.parent;

  context.oldBounds = pick(shape, [ 'x', 'y', 'width', 'height']);

  // save old parent in context
  context.oldParent = oldParent;
  context.oldParentIndex = collectionRemove(oldParent.children, shape);

  // add to new parent at position
  collectionAdd(newParent.children, shape, newParentIndex);

  // update shape parent + position
  assign(shape, {
    parent: newParent,
    x: shape.x + delta.x,
    y: shape.y + delta.y
  });

  return shape;
};

MoveShapeHandler.prototype.postExecute = function(context) {

  var shape = context.shape,
      delta = context.delta,
      hints = context.hints || {},
      layout = hints.layout,
      recurse = hints.recurse;

  var modeling = this._modeling;

  var incoming = shape.incoming,
      outgoing = shape.outgoing;

  if (layout !== false) {

    if (isArray(layout)) {
      incoming = filter(incoming, function(connection) {
        return includes(layout, connection);
      });

      outgoing = filter(outgoing, function(connection) {
        return includes(layout, connection);
      });
    }

    forEach(incoming, function(connection) {
      console.log('lay out connection ' + connection.id);

      modeling.layoutConnection(connection, {
        connectionEnd: getMovedTargetAnchor(connection, shape, delta)
      });
    });

    forEach(outgoing, function(connection) {
      console.log('lay out connection ' + connection.id);

      modeling.layoutConnection(connection, {
        connectionStart: getMovedSourceAnchor(connection, shape, delta)
      });
    });
  }

  if (recurse !== false) {
    this.moveChildren(context);
  }
};

MoveShapeHandler.prototype.revert = function(context) {

  var shape = context.shape,
      oldParent = context.oldParent,
      oldParentIndex = context.oldParentIndex,
      delta = context.delta;

  // restore previous location in old parent
  collectionAdd(oldParent.children, shape, oldParentIndex);

  // revert to old position and parent
  assign(shape, {
    parent: oldParent,
    x: shape.x - delta.x,
    y: shape.y - delta.y
  });

  return shape;
};

MoveShapeHandler.prototype.moveChildren = function(context) {

  var delta = context.delta,
      shape = context.shape;

  this._helper.moveRecursive(shape.children, delta, null);
};

MoveShapeHandler.prototype.getNewParent = function(context) {
  return context.newParent || context.shape.parent;
};

// helpers //////////

function includes(array, item) {
  return array.indexOf(item) !== -1;
}