  import {
  forEach,
  groupBy,
  keys
} from 'min-dash';

import {
  resizeBounds
} from '../../space-tool/SpaceUtil';


/**
 * Add or remove space by moving and resizing shapes.
 */
export default function SpaceToolHandler(modeling) {
  this._modeling = modeling;
}

SpaceToolHandler.$inject = [
  'modeling'
];

SpaceToolHandler.prototype.preExecute = function(context) {
  var self = this,
      movingShapes = context.movingShapes,
      resizingShapes = context.resizingShapes,
      delta = context.delta,
      direction = context.direction;

  var addingSpace = isAddingSpace(delta, direction);

  var steps = getSteps(movingShapes, resizingShapes);

  if (!addingSpace) {
    steps = steps.reverse();
  }

  steps.forEach(function(step) {
    var type = step.type,
        shapes = step.shapes;

    if (type === 'resize') {
      self.resizeShapes(shapes, delta, direction);
    } else if (type === 'move') {
      self.moveShapes(shapes, delta);
    }
  });
};

SpaceToolHandler.prototype.execute = function() {};
SpaceToolHandler.prototype.revert = function() {};

SpaceToolHandler.prototype.moveShapes = function(shapes, delta) {
  this._modeling.moveElements(shapes, delta, null, {
    autoResize: false,
    recurse: false
  });
};

SpaceToolHandler.prototype.resizeShapes = function(shapes, delta, direction) {
  var self = this;

  forEach(shapes, function(shape) {
    var newBounds = resizeBounds(shape, direction, delta);

    self._modeling.resizeShape(shape, newBounds);
  });
};



// helpers //////////

function isAddingSpace(delta, direction) {
  if (direction === 'n') {
    return delta.y < 0;
  } else if (direction === 'w') {
    return delta.x < 0;
  } else if (direction === 's') {
    return delta.y >= 0;
  } else if (direction === 'e') {
    return delta.x >= 0;
  }
}

/**
 * Get steps for moving and resizing shapes starting with top-level shapes.
 *
 * @param {Array<djs.model.Shape>} movingShapes
 * @param {Array<djs.model.Shape>} resizingShapes
 *
 * @returns {Array<Object>}
 */
export function getSteps(movingShapes, resizingShapes) {
  var steps = [];

  var groupedMovingShapes = groupBy(movingShapes, getIndex),
      groupedResizingShapes = groupBy(resizingShapes, getIndex);

  var maxIndex = max(keys(groupedMovingShapes).concat(keys(groupedResizingShapes)).concat(0));

  var index = 1;

  while (index <= maxIndex) {
    if (groupedMovingShapes[ index ]) {

      if (groupedMovingShapes[ index ]) {
        steps.push({
          type: 'move',
          shapes: groupedMovingShapes[ index ]
        });
      }
    }

    if (groupedResizingShapes[ index ]) {
      steps.push({
        type: 'resize',
        shapes: groupedResizingShapes[ index ]
      });
    }

    index++;
  }

  return steps;
}

/**
 * Get index of a given shape.
 *
 * @param {djs.model.Shape} shape
 *
 * @returns {number}
 */
function getIndex(shape) {
  var index = 0;

  while (shape.parent) {
    index++;

    shape = shape.parent;
  }

  return index;
}

function max(array) {
  return Math.max.apply(null, array);
}