const streamedDistance = 50;
const maxStreamedObjects = 50;
let debug = false;

let spawnedObjects = {};
let streamedObjects = 0;

let spawnObject = (model, coords) => {
    return new Promise((resolve, reject) => {
        model = (typeof model === 'number' && model) || GetHashKey(model);
        let z = GetGroundZFor_3dCoord(coords.x, coords.y, coords.z, 0);
        if (z[0] == 1) {
            coords.z = z[1];
        }
        let tick = setTick(() => {
            if (HasModelLoaded(model)) {
                console.log("Creating object");
                let obj = CreateObject(model, coords.x, coords.y, coords.z, false, false, false);
                SetModelAsNoLongerNeeded(model);
                // SetEntityAsNoLongerNeeded(model);
                FreezeEntityPosition(obj, true);
                clearTick(tick);
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

/**
 * Calculate objects to player distance
 */
setTick(() => {
    for (let id in spawnedObjects) {
        let object = spawnedObjects[id];
        let objectPosition = object.position;
        let playerPosition = GetEntityCoords(PlayerPedId());
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

        for (let id in spawnedObjects) {
            let object = spawnedObjects[id];
            let distance = object.distance;
            
            if (object.deletionRequested) {
                if (object.handle !== undefined) {
                    DeleteObject(object.handle);
                    streamedObjects--;
                }

                delete spawnedObjects[id];
                continue;
            }

            if (distance <= streamedDistance && object.handle === undefined && streamedObjects < maxStreamedObjects) {
                spawnedObjects[id].handle = true;
                spawnedObjects[id].handle = await spawnObject(object.model, object.position);
                streamedObjects++;
            } else if (distance > streamedDistance && object.handle !== undefined && object.handle !== true) {
                DeleteObject(object.handle);
                spawnedObjects[id].handle = undefined;
                streamedObjects--;
            }
        }

        streaming = false;
    }
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