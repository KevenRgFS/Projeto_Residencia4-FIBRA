const test = require("node:test");
const assert = require("node:assert/strict");
const { riskFor, scoreActivity } = require("../src/engagement");

test("score gives more weight to completed participation", () => {
    assert.equal(scoreActivity({ completed: 2, actionTypes: 1, interactions: 2 }), 3.6);
});

test("score is capped at ten", () => {
    assert.equal(scoreActivity({ completed: 20, actionTypes: 8, interactions: 30 }), 10);
});

test("high potential without recent participation is high risk", () => {
    assert.equal(riskFor({ score: 8, lastParticipation: null, potential: "alto" }), "alto");
});

test("recently active high score is low risk", () => {
    assert.equal(riskFor({ score: 8, lastParticipation: new Date(), potential: "alto" }), "baixo");
});