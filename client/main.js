const NEAREST_CELLS_OFFSET = 1;
const MAX_STREAMED_OBJECTS = 500;
const MAX_CELL_SIZE = 100;

let debug = true;

let allObjects = {};
let createdObjects = 0;
let streamedObjects = 0;

let MapOffsetX = -7500;
let MapOffsetY = -5000;
let MapWidth = 15000;
let MapHeight = 15000;
let MapCellsWidth = 10000;
let MapCellsHeight = 10000;
let CellWidth = MapWidth / MapCellsWidth;
let CellHeight = MapHeight / MapCellsHeight;