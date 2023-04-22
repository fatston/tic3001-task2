const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const pokemonDataPath = path.join(__dirname, 'pokemonData.json');

/**
 * Just to see the whole list of pokemon in json format
 */
router.get('/', function(req,res,next) {
    const pokemonList = readPokemonData();
    res.json(pokemonList);
})

router.get('/search', function(req, res, next) {
    const pokemonList = readPokemonData();
    const queryId = req.query.id;
    const queryType = req.query.type;

    if (queryId) {
        const idAsNumber = parseInt(queryId); // convert to number
        const matchingPokemon = pokemonList.find(p => p.number === idAsNumber);
        if (matchingPokemon) {
            res.json(matchingPokemon);
            return;
        } else {
            res.status(404).json({'error': 'couldn\'t find pokemon with id ' + queryId});
            return;
        }
    }

    if (queryType) {
        const matchingPokemon = pokemonList.filter(p => p.type1 === queryType || p.type2 === queryType);
        if (matchingPokemon.length > 0) {
            res.json(matchingPokemon);
            return;
        } else {
            res.status(404).json({'error': 'couldn\'t find pokemon with type ' + queryType});
            return;
        }
    }

    res.status(400).json({'error': 'please enter id or type'});

});

/* POST to insert pokemon */
router.post('/', function(req, res, next) {
    const { number, name, type1, type2 } = req.body;
    console.log('request body: ', req.body);
    console.log('number:', number);
    console.log('name:', name);
    console.log('type1:', type1);
    console.log('type2:', type2);

    if (!number || !name || !type1 || !type2) {
        res.json({"error": "please make sure u have number, name, type1, type2. Thanks"});
        return;
    }

    const parsedNumber = parseInt(number);
    const newPokemon = {number: parsedNumber, name, type1, type2};
    try {
        // read existing pokemon data from the JSON file
        const pokemonData = readPokemonData();
        pokemonData.push(newPokemon);
        // write the updated pokemon data back to the JSON file
        writePokemonData(pokemonData);
        res.json({ "msg": "inserted pokemon", "newPokemon": newPokemon });
    } catch (err) {
        console.error(err);
        res.status(500).json({ "error": "failed to insert pokemon" });
    }
});

/* put to update pokemon */
router.put('/:number', function(req, res, next) {
    const { name, type1, type2 } = req.body;
    const number = parseInt(req.params.number);

    try {
        const pokemonData = readPokemonData();
        const index = pokemonData.findIndex(p => p.number === number);

        if (index < 0) {
            res.status(404).json({ "error": "pokemon not found" });
            return;
        }

        const updatedPokemon = { number, name, type1, type2 };
        pokemonData[index] = updatedPokemon;
        writePokemonData(pokemonData);

        res.json({ "msg": "updated pokemon", "updatedPokemon": updatedPokemon });
    } catch (err) {
        console.error(err);
        res.status(500).json({ "error": "failed to update pokemon" });
    }
});

router.delete('/:number', function(req, res, next) {
    const number = parseInt(req.params.number);

    try {
        const pokemonData = readPokemonData();
        const index = pokemonData.findIndex(p => p.number === number);

        if (index < 0) {
            res.status(404).json({ "error": "pokemon not found" });
            return;
        }

        const deletedPokemon = pokemonData[index];
        pokemonData.splice(index, 1);
        writePokemonData(pokemonData);

        res.json({ "msg": "deleted pokemon", "deletedPokemon": deletedPokemon });
    } catch (err) {
        console.error(err);
        res.status(500).json({ "error": "failed to delete pokemon" });
    }
});

function readPokemonData() {
    return JSON.parse(fs.readFileSync(pokemonDataPath, 'utf-8'));
}


function writePokemonData(pokemonList) {
    const pokemonData = JSON.stringify(pokemonList);
    fs.writeFileSync(pokemonDataPath, pokemonData);
}

module.exports = router;