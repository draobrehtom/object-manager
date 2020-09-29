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

// setInterval(() => {
//     [x, y, z] = GetEntityCoords(playerPedId);
//     console.log(getCellFromCoords(x, y, z), allObjects[Object.keys(allObjects)[0]].cell);
// }, 500);


let distanceCache = {
}
GetDistanceBetweenCoords = (x1, y1, z1, x2, y2, z2) => {
    let index = `${x1},${y1},${z1}:${x2},${y2},${z2}`;
    let index2 = `${x2},${y2},${z2}:${x1},${y1},${z1}`;
    let distance = distanceCache[index] ? distanceCache[index] : distanceCache[index2];
    if (! distance) {
        distance = Math.sqrt(
            Math.pow(x1 - x2, 2) +
            Math.pow(y1 - y2, 2) +
            Math.pow(z1 - z2, 2)
        );
        distanceCache[index] = distance;
        distanceCache[index2] = distance;
    } else {
        console.log("Cache");
    }
    return distance;
}

let spawnObject = (model, coords, heading = 0, rotation = undefined) => {
    return new Promise((resolve, reject) => {
        model = (typeof model === 'number' && model) || GetHashKey(model);

        let tick = setTick(() => {
            if (HasModelLoaded(model)) {
                let obj = CreateObject(model, coords.x, coords.y, coords.z, false, false, false);
                SetEntityHeading(obj, heading);
                if (rotation !== undefined && rotation !== null) {
                    SetEntityRotation(obj, rotation.x, rotation.y, rotation.z);
                }
                
                SetModelAsNoLongerNeeded(model);
                // SetEntityAsNoLongerNeeded(model);
                FreezeEntityPosition(obj, true);
                clearTick(tick);
                console.log("Creating object", obj);
                resolve(obj);
            } else {
                console.log("Requesting model");
                RequestModel(model);
            }
        });
    });
};

let deleteObject = (id) => {
    let object = allObjects[id];
    if (object) {
        if (object.handle !== undefined) {
            DeleteObject(object.handle);
            streamedObjects--;
        }
        createdObjects--;
        setCellRegion(object.cell, id, undefined);
    }
}

let watchCells = () => {
    let playerPosition = GetEntityCoords(playerPedId);
    let cell = getCellFromCoords(playerPosition[0], playerPosition[1], playerPosition[2]);
    if (cell.x !== currentCell.x || cell.y !== currentCell.y) {
        // Update nearest cells
        nearestCells = [
            {
                x: cell.x,
                y: cell.y
            }
        ];
        for (let i = 0; i < streamedDistance; i++) {
            for (let ii = 0; ii < streamedDistance; ii++) {
                nearestCells.push({
                    x: cell.x + i,
                    y: cell.y + ii
                });
                nearestCells.push({
                    x: cell.x - i,
                    y: cell.y - ii
                });
                nearestCells.push({
                    x: cell.x + i,
                    y: cell.y - ii
                });
                nearestCells.push({
                    x: cell.x - i,
                    y: cell.y + ii
                });
            }
        }

        // Update current cell
        currentCell = cell;
    }
}


/**
 * Streaming objects
 */
let streaming = false;
setTick(async () => {
    if (GetEntitySpeed(playerPedId) > 0) {
        watchCells();
    }

    if (! streaming) {
        streaming = true;

        // Delete objects from previous cells except nearest one
        for (let id in streamCandidates) {
            let object = streamCandidates[id];
            let objectInNearestCell = false;
            
            nearestCells.forEach(nearestCell => {
                if (object.cell.x === nearestCell.x && object.cell.y === nearestCell.y) {
                    objectInNearestCell = true;
                }
            });

            if (! objectInNearestCell) {
                if (object.handle !== undefined) {
                    DeleteObject(object.handle);
                    object.handle = undefined;
                    setCellRegion(object.cell, id, object);
                    streamedObjects--;
                }
                delete streamCandidates[id];
            }
        }

        // Collect objects nearest cells
        nearestCells.forEach(async (nearestCell) => {
            let cellRegion = getCellRegion(nearestCell);
            for (let id in cellRegion) {
                streamCandidates[id] = cellRegion[id];
            }
        });

        // Stream objects
        for (let id in streamCandidates) {
            let object = streamCandidates[id];
            if (object.handle === undefined) {
                object.handle = await spawnObject(object.model, object.position, object.heading, object.rotation);
                setCellRegion(object.cell, id, object);
                streamCandidates[id] = object;
                streamedObjects++;
            }
        }


        streaming = false;
    }
});

/**
 * Events handling
 */
onNet("object-manager:createObjects", (id, objects) => {
    for (let id in objects) {
        let obj = objects[id];
        let cell = getCellFromCoords(obj.position.x, obj.position.y, obj.position.z);
        obj.cell = cell;
        setCellRegion(obj.cell, id, obj);
        createdObjects++;
    }
});

onNet("object-manager:createObject", (id, obj) => {
    let cell = getCellFromCoords(obj.position.x, obj.position.y, obj.position.z);
    obj.cell = cell;
    setCellRegion(cell, id, obj);
    createdObjects++;
});

onNet("object-manager:deleteObject", (id) => {
    deleteObject(id);
});

on("onResourceStop", (resource) => {
    console.log(resource, GetCurrentResourceName());
    if (resource === GetCurrentResourceName()) {
        // TODO: delete objects
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
        AddTextComponentString("Created: "+ createdObjects + " \nStreamed: " + streamedObjects);
        DrawText(0.16, 0.70)
    });
}

emitNet("object-manager:playerConnected");