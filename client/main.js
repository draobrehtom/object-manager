const streamedDistance = 5;
const maxStreamedObjects = 3;
let debug = true;

let allObjects = {};
let createdObjects = 0;
let streamedObjects = 0;

let MapOffsetX = -7500;
let MapOffsetY = -5000;
let MapWidth = 15000;
let MapHeight = 15000;
let Regions = [];
let MapCellsWidth = 5000;
let MapCellsHeight = 5000;
let CellWidth = MapWidth / MapCellsWidth;
let CellHeight = MapHeight / MapCellsHeight;

let currentCell = {
    x: undefined,
    y: undefined,
};
let nearestCells = [];
let previousCells = [];