let playerPedId = PlayerPedId();
on("playerSpawned", () => {
    playerPedId = PlayerPedId();
    exports["instructional-buttons"].SetInstructionalButton("EDIT_MODE", 140, true);
    AddTextEntry("EDIT_MODE", "Enter into edit mode");
});

let init = () => {
    let editModeEnabled = false;
    let distance = 5;
    let heading = 0;
    let height = 0;
    let leftRight = 0;
    let movementSmooth = 5; // Higher values more smooth object moving
    
    const MAX_SMOOTH = 10;
    const MIN_SMOOTH = 1;
    const MAX_DISTANCE = 15;
    
    let coords = {x: 0, y: 0, z: 0};
    let object;
    let model = "prop_box_wood01a";
    
    let spawnObject = (model, coords) => {
        if (object) {
            DeleteEntity(object);
        }
    
        return new Promise((resolve, reject) => {
            model = (typeof model === 'number' && model) || GetHashKey(model);
            let tick = setTick(() => {
                if (HasModelLoaded(model)) {
                    obj = CreateObject(model, coords[0], coords[1], coords[2], false, false, false);
                    SetModelAsNoLongerNeeded(model);
                    FreezeEntityPosition(obj, true);
                    SetEntityCollision(obj, false, false);
                    resolve(obj);
                    clearTick(tick);
                } else {
                    console.log(`Requesting ${model}`);
                    RequestModel(model);
                }
            });
        });
    };
    
    let GetCoordsFromCam = (distance) => {
        let rot = GetGameplayCamRot(2);
        let coord = GetGameplayCamCoord();
    
        let tX = rot[0] * 0.0174532924;
        let tZ = rot[2] * 0.0174532924;
        let num = Math.abs(Math.cos(tX));
    
        newCoordX = coord[0] + (-Math.sin(tZ)) * (num + distance);
        newCoordY = coord[1] + (Math.cos(tZ)) * (num + distance);
        newCoordZ = coord[2] + (Math.sin(tX) * 8.0);
        return [newCoordX, newCoordY, newCoordZ];
    }
    
    
    let getPointerCoordinates = () => {
        let camCoords = GetGameplayCamCoord();
        let camRot = GetGameplayCamRot();
        let farCoords = GetCoordsFromCam(distance, leftRight);
        let r = farCoords;
    
        let RayHandle = StartShapeTestRay(camCoords[0], camCoords[1], camCoords[2], farCoords[0], farCoords[1], farCoords[2], -1, playerPedId, 0)
        let result = GetRaycastResult(RayHandle)
    
        // Check target existing
        if (result[2][0] === 0 && result[2][1] === 0 && result[2][2] === 0) {
            r = farCoords;
        } else {
            r = result[2];
        }
    
        return r;
    }

    let getTargetingObject = (distance) => {
        let camCoords = GetGameplayCamCoord();
        let camRot = GetGameplayCamRot();
        let farCoords = GetCoordsFromCam(distance, 0);
        let r = farCoords;
    
        let RayHandle = StartShapeTestRay(camCoords[0], camCoords[1], camCoords[2], farCoords[0], farCoords[1], farCoords[2], -1, playerPedId, 0)
        let result = GetRaycastResult(RayHandle)
    
        if (result[4] > 0) {
            let eType = GetEntityType(result[4]);
            if (eType === 3) {
                return result[4];
            }
        }

        return undefined;
    }
    
    
    
    
    setTick(() => {
        DisableControlAction(0, 140, true); //Atack
        if (IsDisabledControlJustPressed(0, 140)) { // Atack | B
            toggle();
        }

        if (editModeEnabled) {
            DisableControlAction(0, 24, true); // Disable attack  Left mouse | RT
            DisableControlAction(0, 25, true); // Disable aim Right mouse | LT

            DisableControlAction(0, 205, true); // Q | LB
            DisableControlAction(0, 206, true); // E | LB

            // Moving object
            if (distance >= 5 && distance < MAX_DISTANCE) {
                if (IsControlPressed(0, 187)) { // arrow down | pad down
                    distance -= 1 / movementSmooth;
                }
                
                if (IsControlPressed(0, 188)) { // arrow up | pad up
                    distance += 1 / movementSmooth;
                }
    
                if (IsControlPressed(0, 189)) { // arrow left | pad left
                    leftRight -= 1 / movementSmooth;
                }
    
                if (IsControlPressed(0, 190)) { // arrow right | pad right
                    leftRight += 1 / movementSmooth;
                }

                if (IsDisabledControlPressed(0, 24)) { // LT
                    heading -= 10 / movementSmooth;
                }

                if (IsDisabledControlPressed(0, 25)) { // RT
                    heading += 10 / movementSmooth;
                }

                
                if (IsDisabledControlPressed(0, 205)) { // LB
                    height -= 0.1 / movementSmooth;
                }

                if (IsDisabledControlPressed(0, 206)) { // RB
                    height += 0.1 / movementSmooth;
                }
            } else {
                distance = 5;
            }

            if (leftRight >= MAX_DISTANCE / 3 || leftRight <= -1 * MAX_DISTANCE / 3) {
                leftRight /= 1.01;
            }
            if (height >= MAX_DISTANCE / 2) {
                height /= 1.01;
            } else if (height <= -1 * MAX_DISTANCE / 2) {
                height = 0;
            }
    
            // Movement smooth
            if (IsControlJustPressed(0, 192)) { // TAB | Y
                movementSmooth = Math.max(movementSmooth - 1, MIN_SMOOTH);
                console.log(movementSmooth);
            }
            if (IsControlJustPressed(0, 191)) { //  ENTER | A
                movementSmooth = Math.min(movementSmooth + 1, MAX_SMOOTH);
                console.log(movementSmooth);
            }



    
    
            // Front back
            let r = getPointerCoordinates();
            coords = {x: r[0], y: r[1], z: r[2]};
    
            // Left right
            let rot = GetGameplayCamRot(2);
            let tX = rot[0] * 0.0174532924;
            let tZ = rot[2] * 0.0174532924;
            let num = Math.abs(Math.cos(tX));
            coords.x = coords.x + (Math.cos(tZ)) * (num + leftRight);
            coords.y = coords.y + (Math.sin(tZ)) * (num + leftRight);
            /** 
            let z = GetGroundZFor_3dCoord(coords.x, coords.y, coords.z, 0);
            if (z[0] == 1) {
                coords.z = z[1];
            }
            coords.z += height;
            */
            
            if (height !== 0) {
                let z = GetGroundZFor_3dCoord(coords.x, coords.y, coords.z, 0);
                if (z[0] == 1) {
                    coords.z = z[1];
                }
                coords.z += height;
            }

            SetEntityCoords(object, coords.x, coords.y, coords.z, false, false, false, false);
            SetEntityHeading(object, heading);

            if (height === 0) {
                PlaceObjectOnGroundProperly(object);
                [coords.x, coords.y, coords.z] = GetEntityCoords(object);
            }
            


            // DrawMarker(2, coords.x, coords.y, coords.z, 0.0, 0.0, 0.0, 0.0, 180.0, 0.0, 2.0, 2.0, 2.0, 255, 128, 0, 50, false, true, 2, null, null, false);
    
            // Placing object
            if (IsControlJustPressed(0, 203)) { // SPACE | X
                let rotation = GetEntityRotation(object);
                emitNet("object-manager:objectCreated", model, coords, heading, {
                    x: rotation[0],
                    y: rotation[1],
                    z: rotation[2],
                });
                disable();
            }
        } else {
            // Delete targeting object
            if (Object.keys(spawnedObjects).length === 0 || streamedObjects === 0) {
                return;
            }
            
            let target = getTargetingObject(7);
            if (target) {
                for (let id in spawnedObjects) {
                    if (target === spawnedObjects[id].handle) {
                        AddTextEntry("ACCEPT", "Delete object");
                        exports["instructional-buttons"].SetInstructionalButton("ACCEPT", 203, true);

                        if (IsControlJustPressed(0, 203)) { // Space | X
                            emitNet("object-manager:deleteObject", id);
                        }
                        break;
                    }
                }
            } else {
                exports["instructional-buttons"].SetInstructionalButton("ACCEPT", 203, false);
            }
        }
    });

    let disable = () => {
        AddTextEntry("EDIT_MODE", "Enter into edit mode");
        exports["instructional-buttons"].SetInstructionalButton("PLACE_OBJECT", 203, false);
        exports["instructional-buttons"].SetInstructionalButton("DOWN", 187, false);
        exports["instructional-buttons"].SetInstructionalButton("UP", 188, false);
        exports["instructional-buttons"].SetInstructionalButton("LEFT", 189, false);
        exports["instructional-buttons"].SetInstructionalButton("RIGHT", 190, false);
        exports["instructional-buttons"].SetInstructionalButton("SMOOTH+", 191, false);
        exports["instructional-buttons"].SetInstructionalButton("SMOOTH-", 192, false);

        exports["instructional-buttons"].SetInstructionalButton("ROTATE_LEFT", 24, false);
        exports["instructional-buttons"].SetInstructionalButton("ROTATE_RIGHT", 25, false);

        exports["instructional-buttons"].SetInstructionalButton("HEIGHT+", 205, false);
        exports["instructional-buttons"].SetInstructionalButton("HEIGHT-", 206, false);

        if (object) {
            DeleteEntity(object);
        }
        object = undefined;
        editModeEnabled = false;
        height = 0;
        distance = 5;
        heading = 0;
        leftRight = 0;
    }
    
    let enable = (m) => {
        AddTextEntry("EDIT_MODE", "Exit from edit mode");
        AddTextEntry("SMOOTH+", "Speed -");
        AddTextEntry("SMOOTH-", "Speed +");
        AddTextEntry("PLACE_OBJECT", "Place object");
        // AddTextEntry("DOWN", "Backward");
        // AddTextEntry("UP", "Frontward");
        // AddTextEntry("LEFT", "Left");
        // AddTextEntry("RIGHT", "Right");
        AddTextEntry("RIGHT", " Moving object");
       
        AddTextEntry("ROTATE_LEFT", "Rotate Left");
        AddTextEntry("ROTATE_RIGHT", "Rotate Right");

        AddTextEntry("HEIGHT+", "Height Down");
        AddTextEntry("HEIGHT-", "Height Up");
        
        exports["instructional-buttons"].SetInstructionalButton("PLACE_OBJECT", 203, true);

        exports["instructional-buttons"].SetInstructionalButton("HEIGHT+", 205, true);
        exports["instructional-buttons"].SetInstructionalButton("HEIGHT-", 206, true);

        exports["instructional-buttons"].SetInstructionalButton("DOWN", 187, true);
        exports["instructional-buttons"].SetInstructionalButton("UP", 188, true);
        exports["instructional-buttons"].SetInstructionalButton("LEFT", 189, true);
        exports["instructional-buttons"].SetInstructionalButton("RIGHT", 190, true);

        exports["instructional-buttons"].SetInstructionalButton("SMOOTH+", 191, true);        
        exports["instructional-buttons"].SetInstructionalButton("SMOOTH-", 192, true);

        exports["instructional-buttons"].SetInstructionalButton("ROTATE_RIGHT", 25, true);
        exports["instructional-buttons"].SetInstructionalButton("ROTATE_LEFT", 24, true);
        


        spawnObject(m, GetEntityCoords(playerPedId)).then(o => {
            if (object) {
                DeleteEntity(object);
            }
            object = o;
            editModeEnabled = true;
            model = m;
        });
    }
    
    let toggle = () => {
        if (editModeEnabled) {
            disable();
        } else {
            enable(model);
        }
    }

    onNet("object-manager:pointing", (m) => {
        model = m;
    });
    
    RegisterCommand("pointing", (source, args) => {
        model = args[0] ? "prop_box_wood01a" : args[0];
    }, false);

    RegisterCommand("test_streamer", async () => {
        setInterval(() => {
            [coords.x, coords.y, coords.z] = GetEntityCoords(PlayerPedId());
            emitNet("object-manager:objectCreated", model, coords, heading);
        }, 100);
    });
};
init();

