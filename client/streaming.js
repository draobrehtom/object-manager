let locked = false;
let Regions = [];
let currentCell = {
    x: undefined,
    y: undefined,
};
let nearestCells = [];
let streamCandidates = {};

let getCellFromCoords = (x, y, z = 0) => {
    let cellX = Math.floor(((x - MapOffsetX) / CellWidth) + 0.5);
    let cellY = Math.floor(((y - MapOffsetY) / CellHeight) + 0.5);

    return {
        x: cellX,
        y: cellY
    }
}
let setCellRegion = (cell, key, value) => {
    if (Regions[cell.x] === undefined) {
        Regions[cell.x] = [];
    }

    if (Regions[cell.x][cell.y] === undefined) {
        Regions[cell.x][cell.y] = {};
    }

    if (value === undefined) {
        delete Regions[cell.x][cell.y][key];
        delete allObjects[key];
    } else {
        Regions[cell.x][cell.y][key] = value;
        allObjects[key] = value;
    }
}
let getCellRegion = (cell) => {
    if (Regions[cell.x] === undefined) {
        Regions[cell.x] = [];
    }

    if (Regions[cell.x][cell.y] === undefined) {
        Regions[cell.x][cell.y] = {};
    }

    return Regions[cell.x][cell.y];
}

GetDistanceBetweenCoords = (x1, y1, z1, x2, y2, z2) => {
        return distance = Math.sqrt(
            Math.pow(x1 - x2, 2) +
            Math.pow(y1 - y2, 2) +
            Math.pow(z1 - z2, 2)
        );

}

let spawnObject = (model, coords, heading = 0, rotation = undefined) => {
    return new Promise((resolve, reject) => {
        model = (typeof model === 'number' && model) || GetHashKey(model);

        let tick = setTick(() => {
            if (HasModelLoaded(model)) {
                clearTick(tick);

                let obj = CreateObject(model, coords.x, coords.y, coords.z, false, false, false);
                SetEntityHeading(obj, heading);
                if (rotation !== undefined && rotation !== null) {
                    SetEntityRotation(obj, rotation.x, rotation.y, rotation.z);
                }
                
                SetModelAsNoLongerNeeded(model);
                FreezeEntityPosition(obj, true);
                console.log("Creating object", obj);
                resolve(obj);
            } else {
                console.log("Requesting model");
                RequestModel(model);
            }
        });
    });
};

let createObject = (id, obj) => {
    let cell = getCellFromCoords(obj.position.x, obj.position.y, obj.position.z);
    obj.cell = cell;
    setCellRegion(obj.cell, id, obj);
    createdObjects++;
}

let deleteObject = (id) => {
    let object = allObjects[id];
    if (object) {
        if (object.handle !== undefined) {
            DeleteObject(object.handle);
            streamedObjects--;
        }
        createdObjects--;
        setCellRegion(object.cell, id, undefined);
        delete streamCandidates[id]
    }
}

let getNearestCells = (cell) => {
    let cells = [];
    for (let i = 0; i <= NEAREST_CELLS_OFFSET; i++) {
        for (let ii = 0; ii <= NEAREST_CELLS_OFFSET; ii++) {
            cells.push({
                x: cell.x + i,
                y: cell.y + ii
            });
        }
    }

    return cells;
}

/**
 * Watching cells
 */
setTick(() => {
    if (locked) {
        return;
    }

    // if (GetEntitySpeed(playerPedId) === 0 && nearestCells.length !== 0) {
    //     return;
    // }
    
    // Update nearest cells
    let playerPosition = GetEntityCoords(playerPedId);
    let cell = getCellFromCoords(playerPosition[0], playerPosition[1], playerPosition[2]);
    if (cell.x !== currentCell.x || cell.y !== currentCell.y) {
        nearestCells = getNearestCells(cell);
    }

    // Update current cell
    currentCell = cell;
});


/**
 * Streaming objects
 */
setTick(async () => {
    if (locked) {
        return;
    }

    // Collect objects from nearest cells
    for (let cellIndex = 0; cellIndex < nearestCells.length; cellIndex++) {
        let nearestCell = nearestCells[cellIndex];
        let cellObjects = getCellRegion(nearestCell);
        
        for (let id in cellObjects) {
            let object = cellObjects[id];
            if (object.handle === undefined) {
                object.handle = await spawnObject(object.model, object.position, object.heading, object.rotation);
                setCellRegion(object.cell, id, object);
                streamedObjects++;
                streamCandidates[id] = object;
            }
        }
    }
});

/**
 * Deletion of streamed objects that are not in near cells
 */
setTick(() => {
    if (locked) {
        return;
    }

    for (let id in streamCandidates) {
        let object = streamCandidates[id];

        if (object.handle === undefined) {
            continue;
        }

        let objectInNearestCell = false;
        nearestCells.forEach(nearestCell => {
            if (object.cell.x === nearestCell.x && object.cell.y === nearestCell.y) {
                objectInNearestCell = true;
            }
        });

        if (! objectInNearestCell) {
            DeleteObject(object.handle);
            object.handle = undefined;
            setCellRegion(object.cell, id, object);
            streamedObjects--;
            delete streamCandidates[id];
        }
    }
});


let resizeCells = (ratio) => {
    Regions = [];
    // Resize cells
    MapCellsWidth *= ratio;
    MapCellsHeight *= ratio;
    CellWidth = MapWidth / MapCellsWidth;
    CellHeight = MapHeight / MapCellsHeight;

    // Update nearest cells
    let playerPosition = GetEntityCoords(playerPedId);
    currentCell = getCellFromCoords(playerPosition[0], playerPosition[1], playerPosition[2]);
    nearestCells = getNearestCells(currentCell);

    // Update cell for each object
    for (let id in allObjects) {
        let object = allObjects[id];
        object.cell = getCellFromCoords(object.position.x, object.position.y, object.position.z);
        if (streamCandidates[id]) {
            streamCandidates[id] = object;
        }
        setCellRegion(object.cell, id, object);
    }
}

/**
 * Resizing cells
 */
let nearObjectsCount = 0;
setTick(() => {
    nearObjectsCount = 0
    nearestCells.forEach(nearestCell => {
        let objects = getCellRegion(nearestCell);
        let n = Object.keys(objects).length;
        nearObjectsCount += n;
    });
    
    if (streamedObjects > MAX_STREAMED_OBJECTS) {
        locked = true;
        if (nearObjectsCount !== 0) {
            resizeCells(1.01);
        }
    }

    if (nearObjectsCount < Math.min(MAX_STREAMED_OBJECTS, createdObjects) && CellWidth < MAX_CELL_SIZE) {
        locked = true;
        resizeCells(0.99);
    } else {
        locked = false;
    }




});

/**
 * Events handling
 */
onNet("object-manager:createObjects", (objects) => {
    for (let id in objects) {
        let obj = objects[id];
        createObject(id, obj);
    }
});

onNet("object-manager:createObject", (id, obj) => {
    createObject(id, obj);
});

onNet("object-manager:deleteObject", (id) => {
    deleteObject(id);
});

on("onResourceStop", (resource) => {
    if (resource === GetCurrentResourceName()) {
        for (let id in allObjects) {
            deleteObject(id);
        }
    }
});


if (debug) {
    setTick(async () => {
        SetTextFont(0)
        SetTextProportional(1)
        SetTextScale(0.0, 0.55)
        SetTextColour(255,255,255, 255)
        SetTextDropshadow(0, 0, 0, 0, 255)
        SetTextEdge(1, 0, 0, 0, 255)
        SetTextDropShadow()
        SetTextOutline()
        SetTextEntry("STRING")
        AddTextComponentString(
            "Created: "+ createdObjects + 
            " \nStreamed: " + streamedObjects +
            // " \nCurrent Cell: " + currentCell.x + ", " + currentCell.y + 
            " \nCell size: " + CellWidth.toFixed() + ", " + CellHeight.toFixed() +
            " \nLocked: " + locked +
            " \nNear objects: " + nearObjectsCount +
            " \nAll objects: " + Object.keys(allObjects).length
        ); 
        DrawText(0.16, 0.70)
    });
}

emitNet("object-manager:playerConnected");