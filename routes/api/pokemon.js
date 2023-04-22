const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const redis = require('redis');
const basicAuth = require('express-basic-auth');


class RedisAbortError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RedisAbortError';
    }
}

let redisClient;

(async () => {
    // Check if we are running in GitHub Actions using the environment variable
    const isGithubActions = process.env.CI === 'true';

    redisClient = redis.createClient();

    redisClient.on("error", (error) => {
        if (isGithubActions && error.message.includes('ECONNREFUSED')) {
            throw new RedisAbortError('Aborting Redis connection in GitHub Actions.');
        }
        console.error(`Error : ${error}`);
    });

    try {
        await Promise.race([
            redisClient.connect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timed out')), 5000))
        ]);
        console.log("Redis connected. I think.");
    } catch (error) {
        if (error instanceof RedisAbortError) {
            console.log('Skipping Redis connection in GitHub Actions.');
        } else {
            console.error(`Error: ${error.message}`);
        }
    }
})();

// Define the authentication middleware function
const authMiddleware = basicAuth({
    users: { 'admin': 'password' },
    challenge: true
});

const pokemonDataPath = path.join(__dirname, 'pokemonData.json');

/**
 * Just to see the whole list of pokemon in json format
 */
router.get('/', function(req,res,next) {
    getPokemon(async function(data) {
        res.status(data.statusCode).json(data.data)
    })
})

/**
 * Just to search the list of pokemon. can search by type and id.
 */
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
router.post('/', authMiddleware,
    function(req, res, next) {
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
        refreshRedis();
    } catch (err) {
        console.error(err);
        res.status(500).json({ "error": "failed to insert pokemon" });
    }
});

/* put to update pokemon */
router.put('/:number', authMiddleware,
    function(req, res, next) {
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
        refreshRedis();
    } catch (err) {
        console.error(err);
        res.status(500).json({ "error": "failed to update pokemon" });
    }
});

router.delete('/:number', authMiddleware,
    function(req, res, next) {
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

function refreshRedis() {
    let results = readPokemonData();
    if (results.length === 0) {
        console.log("Something went wrong while refreshing redis cache...");
    }
    redisClient.set("pokemon", JSON.stringify(results));
}

const getPokemon = async (res) => {
    let results;
    let isCached = false;
    try {
        console.log("redis")
        const cachePromise = redisClient.get("pokemon");
        const timeoutPromise = new Promise((resolve, reject) => setTimeout(() => reject(new Error('Cache timeout')), 1000)); // 1000 milliseconds = 5 seconds
        const cacheResults = await Promise.race([cachePromise, timeoutPromise]);
        if (cacheResults) {
            console.log("data was taken from cache")
            isCached = true;
            results = JSON.parse(cacheResults);
        } else {
            console.log("data was not from cache")
            results = readPokemonData();
            if (results.length === 0) {
                res({"statusCode": 404, "data": {"status": "fail", "message": "list is empty", "data": []}})
                return
            }
            await redisClient.set("pokemon", JSON.stringify(results));
        }
        res({"statusCode": 200, "data": {"status": "success", "message": "", "data": results}})
    } catch (error) {
        console.error(error);
        res({"statusCode": 500, "data": {"status": "fail", "message": "Error retrieving data from Redis", "data": []}})
    }
}

module.exports = router;
module.exports.readPokemonData = readPokemonData;