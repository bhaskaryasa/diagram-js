import {
  filter,
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

  var layoutingConnections = getLayoutingConnections(movingShapes),
      movingConnections = getMovingConnections(movingShapes);

  movingShapes = filter(movingShapes, function(shape) {
    return !isLabel(shape) || !includes(layoutingConnections, shape.labelTarget);
  });

  var steps = getSteps(movingShapes.concat(movingConnections), resizingShapes);

  if (!isAddingSpace(delta, direction)) {
    steps = steps.reverse();
  }

  steps.forEach(function(step) {
    var type = step.type,
        elements = step.elements,
        shapes = step.shapes;

    if (type === 'resize') {
      self.resizeShapes(shapes, delta, direction);
    } else if (type === 'move') {
      self.moveElements(elements, delta, layoutingConnections);
    }
  });
};

SpaceToolHandler.prototype.execute = function() {};
SpaceToolHandler.prototype.revert = function() {};

SpaceToolHandler.prototype.moveElements = function(elements, delta, layoutingConnections) {
  var self = this;

  forEach(elements, function(element) {

    if (isConnection(element)) {
      self._modeling.moveConnection(element, delta, null, {
        moveElementsBehavior: false
      });
    } else {
      self._modeling.moveShape(element, delta, null, {
        autoResize: false,
        layout: layoutingConnections,
        moveElementsBehavior: false,
        recurse: false
      });
    }
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

function getLayoutingConnections(movingShapes) {
  var layoutingConnections = [];

  forEach(movingShapes, function(shape) {
    var incoming = shape.incoming,
        outgoing = shape.outgoing;

    forEach(incoming.concat(outgoing), function(connection) {
      var source = connection.source,
          target = connection.target;

      if ((includes(movingShapes, source) && !includes(movingShapes, target)) ||
      (!includes(movingShapes, source) && includes(movingShapes, target))) {
        
        if (!includes(layoutingConnections, connection)) {
          layoutingConnections.push(connection);
        }
      }
    });
  });

  return layoutingConnections;
}

function getMovingConnections(movingShapes) {
  var movingConnections = [];

  forEach(movingShapes, function(shape) {
    var incoming = shape.incoming,
        outgoing = shape.outgoing;

    forEach(incoming.concat(outgoing), function(connection) {
      var source = connection.source,
          target = connection.target;

      if (includes(movingShapes, source) && includes(movingShapes, target)) {
        
        if (!includes(movingConnections, connection)) {
          movingConnections.push(connection);
        }
      }
    });
  });

  return movingConnections;
}

/**
 * Get steps for moving and resizing shapes starting with top-level shapes.
 *
 * @param {Array<djs.model.Shape>} movingElements
 * @param {Array<djs.model.Shape>} resizingShapes
 *
 * @returns {Array<Object>}
 */
export function getSteps(movingElements, resizingShapes) {
  var steps = [];

  var groupedMovingElements = groupBy(movingElements, shape => getStepIndex(shape, movingElements)),
      groupedResizingShapes = groupBy(resizingShapes, getStepIndex);

  var maxIndex = max(keys(groupedMovingElements).concat(keys(groupedResizingShapes)).concat(0));

  var index = 1;

  while (index <= maxIndex) {
    if (groupedMovingElements[ index ]) {

      if (groupedMovingElements[ index ]) {
        steps.push({
          type: 'move',
          elements: groupedMovingElements[ index ]
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
 * Get step index specifying when given shape is going to be moved or resized.
 *
 * @param {djs.model.Shape} shape
 * @param {Array<djs.model.Shape>} movingShapes
 *
 * @returns {number}
 */
function getStepIndex(shape, movingShapes) {
  if (movingShapes && includes(movingShapes, shape.parent)) {
    return getStepIndex(shape.parent, movingShapes);
  }

  var index = 0;

  while (shape.parent) {
    index++;

    shape = shape.parent;
  }

  return index;
};

function includes(array, item) {
  return array.indexOf(item) !== -1;
}

/**
 * Check whether space tool is adding or removing space.
 *
 * @param {Object} delta 
 * @param {number} delta.x 
 * @param {number} delta.y 
 * @param {string} direction
 *
 * @returns {boolean} 
 */
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

function isConnection(element) {
  return !!element.waypoints;
}

function isLabel(element) {
  return !!element.labelTarget;
}

function max(array) {
  return Math.max.apply(null, array);
}