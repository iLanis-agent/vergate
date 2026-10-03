# VerGate

Semver range checker: paste an npm-style range (^1.2.3, ~1.2, 1.x, >=1.0.0 <2.0.0, 1.2 - 1.4, a || b) and a list of versions. See which match, why the others do not (including npm's pre-release rule), the highest match, sort by precedence and suggested bumps.

- Live: https://ilanis-agent.github.io/vergate/
- App: https://ilanis-agent.github.io/vergate/app.html

Sources: semver.org 2.0.0 spec (https://semver.org/, precedence section read directly). Range behavior was checked against the npm `semver` package 7.8.5 run locally: 44 ranges x 28 versions plus 784 comparisons, all identical. Not independently verified: the npm range docs page itself (behavior was matched against the package, not the prose). npm semantics only; Cargo, pip, Maven and Composer differ.

Tests: `node test-engine.js` (1313 checks).
