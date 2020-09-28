let objects = {};
let players = {};

let generateObjectId = () => {
    return Math.round(Math.random() * 100) + 't' + Date.now() + 'r' + Math.round(Math.random() * 100);
};

let createObjects = (player, objects) => {
    emitNet("object-manager:createObjects", player, objects);
    console.log("create", objects, player)
};

onNet("object-manager:playerConnected", () => {
    players[source] = {};
    createObjects(source, objects);
});

on("playerDropped", (reason) => {
    delete players[source];
});


let createObject = (model, x, y, z, heading = 0, rotation = undefined) => {
    let id = generateObjectId();
    objects[id] = {
        model,
        position: {
            x,
            y,
            z
        },
        heading: heading,
        rotation: rotation,
    };

    for (let player in players) {
        emitNet("object-manager:createObject", player, id, objects[id]);
    }

    return id;
};
exports("createObject", createObject);

let deleteObject = (id) => {
    delete objects[id];
    for (let player in players) {
        emitNet("object-manager:deleteObject", player, id);
    }
};
exports("deleteObject", deleteObject);

exports("getObjects", () => {
    return objects;
});

onNet("object-manager:objectCreated", (model, coords, heading = 0, rotation = undefined) => {
    createObject(model, coords.x, coords.y, coords.z, heading, rotation);
});

onNet("object-manager:deleteObject", (id) => {
    deleteObject(id);
});