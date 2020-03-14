# FiveM - Object Manager (Streamer)

Due to the limitation to create new objects in game  (less 2000), I've created this object manager. 


## Features:
- Removing deep-range objects
- Creating nearer objects


## Server-side exports
- createObject(model, x, y, z) // returns id as `string`
- deleteObject(id)
- getObjects() // returns objects as `object`

## Usage
1. Place this object manager into `resources` folder.
2. Set a `dependencies { 'object-manager' } ` inside **your** script.
3. Use `exports['object-manager']` and listed methods above inside **your** script

## Usage example
https://github.com/draobrehtom/object-manager-test

## Config
You can modify only those values:
`
// tomatosClient.js
const streamedDistance = 50;
const maxStreamedObjects = 50;
`