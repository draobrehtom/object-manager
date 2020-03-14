let objects = {};
let players = {};

let generateObjectId = () => {
    return Math.round(Math.random() * 100) + 't' + Date.now() + 'r' + Math.round(Math.random() * 100);
};

onNet("object-manager:playerConnected", () => {
    players[source] = {};

    updateObjects(source, objects);
});
on("playerDropped", (reason) => {
    delete players[source];
});


let createObject = (model, x, y, z) => {
    let id = generateObjectId();
    objects[id] = {
        model,
        position: {
            x,
            y,
            z
        }
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