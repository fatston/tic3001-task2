const express = require('express');
const router = express.Router();
const { readPokemonData } = require('./api/pokemon');

router.get('/', function(req, res, next) {
  const pokemonList = readPokemonData();
  res.render('index', { title: 'Pokémon List', pokemonList: pokemonList });
});

module.exports = router;