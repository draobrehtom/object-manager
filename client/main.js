const streamedDistance = 10;
const maxStreamedObjects = 3;
let debug = true;

let spawnedObjects = {};
let streamedObjects = 0;
let spawnedObjectsSortedByDistanceAsc = [];

let spawnObject = (model, coords, heading = 0, rotation = undefined) => {
    return new Promise((resolve, reject) => {
        model = (typeof model === 'number' && model) || GetHashKey(model);
        
        /*
        // Sometimes on player connection this is too slow
        let z = GetGroundZFor_3dCoord(coords.x, coords.y, coords.z, 0);
        if (z[0] == 1) {
            coords.z = z[1];
        }
         */


        let tick = setTick(() => {
            if (HasModelLoaded(model)) {
                let obj = CreateObject(model, coords.x, coords.y, coords.z, false, false, false);
                SetEntityHeading(obj, heading);
                if (rotation !== undefined && rotation !== null) {
                    SetEntityRotation(obj, rotation.x, rotation.y, rotation.z);
                    SetEntityRotation
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

/** FOR TESTS
RegisterCommand('plant', async (source, args) => {
    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            let [x, y, z] = GetEntityCoords(PlayerPedId())
            let pos = {x, y, z};
            let id = Math.round(Math.random() * 100) + 't' + Date.now() + 'r' + Math.round(Math.random() * 100);
            spawnedObjects[id] = {
                model: 'ex_prop_adv_case_sm_03',
                handle: undefined,
                position: pos,
                distance: undefined,
		        createdAt: Date.now()
            };
            console.log('#' + i);
        }, i * 100);
    }
    
}, false);
 */

/**
 * Show debug message
 */
setTick(async () => {
    if (! debug) {
        return;
    }
    
    SetTextFont(0)
    SetTextProportional(1)
    SetTextScale(0.0, 0.55)
    SetTextColour(255,255,255, 255)
    SetTextDropshadow(0, 0, 0, 0, 255)
    SetTextEdge(1, 0, 0, 0, 255)
    SetTextDropShadow()
    SetTextOutline()
    SetTextEntry("STRING")
    AddTextComponentString("Spawned: "+ Object.keys(spawnedObjects).length + " \nStreamed: " + streamedObjects);
    DrawText(0.16, 0.70)
});

GetDistanceBetweenCoords = (x1, y1, z1, x2, y2, z2) => {
    return Math.sqrt(
        Math.pow(x1 - x2, 2) +
        Math.pow(y1 - y2, 2) +
        Math.pow(z1 - z2, 2)
    );
}


/**
 * Calculate objects to player distance
 */
setTick(() => {
    for (let id in spawnedObjects) {
        let object = spawnedObjects[id];
        let objectPosition = object.position;
        let playerPosition = GetEntityCoords(playerPedId);
        let distance = GetDistanceBetweenCoords(
            objectPosition.x, objectPosition.y, objectPosition.z, 
            playerPosition[0], playerPosition[1], playerPosition[2], true
        );
        spawnedObjects[id].distance = distance;
    }
});

/**
 * Streaming objects
 */
let streaming = false;
setTick(async () => {
    if (! streaming) {
        streaming = true;
        spawnedObjectsSortedByDistanceAsc = Object.entries(spawnedObjects).sort((a, b) => a[1].distance - b[1].distance);
        
        for (let index = 0; index < spawnedObjectsSortedByDistanceAsc.length; index++) {
            let id = spawnedObjectsSortedByDistanceAsc[index][0];
            let object = spawnedObjects[id];
            let distance = object.distance;

            if (distance === undefined) {
                continue;
            }
            
            if (object.deletionRequested) {
                if (object.handle !== undefined) {
                    DeleteObject(object.handle);
                    streamedObjects--;
                }

                delete spawnedObjects[id];
                continue;
            }


            if (index < maxStreamedObjects) {
                // Check for creation
                if (object.handle === undefined && distance <= streamedDistance) {
                    spawnedObjects[id].handle = true;
                    spawnedObjects[id].handle = await spawnObject(object.model, object.position, object.heading, object.rotation);
                    streamedObjects++;
                }
            } else {
                // Check for deletion
                if (object.handle !== undefined && object.handle !== true) {
                    DeleteObject(object.handle);
                    spawnedObjects[id].handle = undefined;
                    streamedObjects--;
                }
            }


            // if (index <= maxStreamedObjects && distance <= streamedDistance && object.handle === undefined && streamedObjects < maxStreamedObjects) {
            //     spawnedObjects[id].handle = true;
            //     spawnedObjects[id].handle = await spawnObject(object.model, object.position);
            //     streamedObjects++;
            // } else if ((index > maxStreamedObjects || distance > streamedDistance) && object.handle !== undefined && object.handle !== true) {
            //     DeleteObject(object.handle);
            //     spawnedObjects[id].handle = undefined;
            //     streamedObjects--;
            // }
        }

        streaming = false;
    }
});

onNet("object-manager:createObjects", (objects) => {
    spawnedObjects = objects;
});

onNet("object-manager:createObject", (id, obj) => {
    if (! spawnedObjects[id]) {
        spawnedObjects[id] = obj;
    }
});

onNet("object-manager:deleteObject", (id) => {
    if (spawnedObjects[id]) {
        spawnedObjects[id].deletionRequested = true;
    }
});

emitNet("object-manager:playerConnected");


on("onResourceStop", (resource) => {
    console.log(resource, GetCurrentResourceName());
    if (resource === GetCurrentResourceName()) {
        for (let id in spawnedObjects) {
            let obj = spawnedObjects[id];
            console.log("Delete ", obj);
            DeleteEntity(obj.handle);
        }
    }
});