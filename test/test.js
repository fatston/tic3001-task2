const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const expect = chai.expect;

chai.use(chaiHttp);

describe('Baseline Test', function() {
    it('should return true', function() {
        expect(true).to.equal(true);
    });
});

describe('API Tests for GET', function() {
    describe('GET /api/pokemon', function() {
        it('should return an array of Pokemon objects with status code 200', function(done) {
            chai.request(app)
                .get('/api/pokemon')
                .end(function(err, res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('status');
                    expect(res.body).to.have.property('message');
                    expect(res.body).to.have.property('data');
                    expect(res.body.data).to.be.an('array');
                    expect(res.body.data[0]).to.have.property('number');
                    expect(res.body.data[0]).to.have.property('name');
                    expect(res.body.data[0]).to.have.property('type1');
                    expect(res.body.data[0]).to.have.property('type2');
                    done();
                });
        });
    });

    describe('GET /api/pokemon/search', function() {
        it('should return a JSON object with status code 200 when searching by id', function(done) {
            chai.request(app)
                .get('/api/pokemon/search?id=1')
                .end(function(err, res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body).to.be.an('object');
                    expect(res.body.number).to.equal(1);
                    expect(res.body.name).to.be.a('string');
                    expect(res.body.type1).to.be.a('string');
                    expect(res.body.type2).to.be.a('string');
                    done();
                });
        });

        it('should return a JSON array with status code 200 when searching by type', function(done) {
            chai.request(app)
                .get('/api/pokemon/search?type=Electric')
                .end(function(err, res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body).to.be.an('array');
                    expect(res.body[0]).to.have.property('number');
                    expect(res.body[0]).to.have.property('name');
                    expect(res.body[0]).to.have.property('type1');
                    expect(res.body[0]).to.have.property('type2');
                    done();
                });
        });

        it('should return an error message with status code 400 when no search parameter is provided', function(done) {
            chai.request(app)
                .get('/api/pokemon/search')
                .end(function(err, res) {
                    expect(res).to.have.status(400);
                    expect(res).to.be.json;
                    expect(res.body).to.be.an('object');
                    expect(res.body.error).to.equal('please enter id or type');
                    done();
                });
        });

        it('should return an error message with status code 404 when searching by id for a non-existent pokemon', function(done) {
            chai.request(app)
                .get('/api/pokemon/search?id=9999')
                .end(function(err, res) {
                    expect(res).to.have.status(404);
                    expect(res).to.be.json;
                    expect(res.body).to.be.an('object');
                    expect(res.body.error).to.equal('couldn\'t find pokemon with id 9999');
                    done();
                });
        });

        it('should return an error message with status code 404 when searching by type for a non-existent pokemon', function(done) {
            chai.request(app)
                .get('/api/pokemon/search?type=Rockk')
                .end(function(err, res) {
                    expect(res).to.have.status(404);
                    expect(res).to.be.json;
                    expect(res.body).to.be.an('object');
                    expect(res.body.error).to.equal('couldn\'t find pokemon with type Rockk');
                    done();
                });
        });
    });
});

describe('API Tests for CRUD', function() {
    describe('Insert, Update, and Delete Pokemon', function() {
        let pokemonId;

        it('should insert a new Pokemon with status code 200', function(done) {
            chai.request(app)
                .post('/api/pokemon')
                .auth('admin', 'password')
                .send({
                    number: 6969,
                    name: 'cliftonTestPokemonWrong',
                    type1: 'Flying',
                    type2: 'Rock'
                })
                .end(function(err, res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body.msg).to.equal('inserted pokemon');
                    expect(res.body.newPokemon).to.have.property('number');
                    expect(res.body.newPokemon.number).to.equal(6969);
                    pokemonId = res.body.newPokemon.number;
                    done();
                });
        });

        it('should find the newly created Pokemon by ID with status code 200', function(done) {
            chai.request(app)
                .get(`/api/pokemon/search?id=${pokemonId}`)
                .end(function(err, res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body.number).to.equal(6969);
                    expect(res.body.name).to.equal('cliftonTestPokemonWrong');
                    expect(res.body.type1).to.equal('Flying');
                    expect(res.body.type2).to.equal('Rock');
                    done();
                });
        });

        it('should update the Pokemon with status code 200', function(done) {
            chai.request(app)
                .put(`/api/pokemon/${pokemonId}`)
                .auth('admin', 'password')
                .send({
                    name: 'cliftonTestPokemon',
                    type1: 'Rock',
                    type2: 'Flying'
                })
                .end(function(err, res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body.msg).to.equal('updated pokemon');
                    expect(res.body.updatedPokemon).to.have.property('number');
                    expect(res.body.updatedPokemon.number).to.equal(6969);
                    done();
                });
        });

        it('should find the updated Pokemon by ID with status code 200', function(done) {
            chai.request(app)
                .get(`/api/pokemon/search?id=${pokemonId}`)
                .end(function(err, res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body.number).to.equal(6969);
                    expect(res.body.name).to.equal('cliftonTestPokemon');
                    expect(res.body.type1).to.equal('Rock');
                    expect(res.body.type2).to.equal('Flying');
                    done();
                });
        });

        it('should delete the Pokemon with status code 200', function(done) {
            chai.request(app)
                .delete(`/api/pokemon/${pokemonId}`)
                .auth('admin', 'password')
                .end(function(err, res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body.msg).to.equal('deleted pokemon');
                    expect(res.body.deletedPokemon).to.have.property('number');
                    expect(res.body.deletedPokemon.number).to.equal(6969);
                    done();
                });
        });

        it('should not find the deleted Pokemon by ID with status code 404', function(done) {
            chai.request(app)
                .get(`/api/pokemon/search?id=${pokemonId}`)
                .end(function(err, res) {
                expect(res).to.have.status(404);
                expect(res).to.be.json;
                expect(res.body).to.have.property('error');
                expect(res.body.error).to.equal(`couldn't find pokemon with id ${pokemonId}`);
                done();
            });
        });
    });
});

module.exports = app;