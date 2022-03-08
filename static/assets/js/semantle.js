/*
    Copyright (c) 2022, David Turner <novalis@novalis.org>

     This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, version 3.

    This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
'use strict';

let gameOver = false;
let firstGuess = true;
let guesses = [];
let guessed = new Set();
let guessCount = 0;
let model = null;
const now = Date.now();
const today = Math.floor(now / 86400000);
const initialDay = 19021;
const puzzleNumber = (today - initialDay) % secretWords.length;
const handleStats = puzzleNumber >= 24;
const yesterdayPuzzleNumber = (today - initialDay + secretWords.length - 1) % secretWords.length;
const storage = window.localStorage;
let caps = 0;
let warnedCaps = 0;
let chrono_forward = 1;
let prefersDarkColorScheme = false;

function $(id) {
    if (id.charAt(0) !== '#') return false;
    return document.getElementById(id.substring(1));
}

function mag(a) {
    return Math.sqrt(a.reduce(function(sum, val) {
        return sum + val * val;
    }, 0));
}

function dot(f1, f2) {
    return f1.reduce(function(sum, a, idx) {
        return sum + a*f2[idx];
    }, 0);
}

function getCosSim(f1, f2) {
    return dot(f1,f2)/(mag(f1)*mag(f2));
}


function plus(v1, v2) {
    const out = [];
    for (let i = 0; i < v1.length; i++) {
            out.push(v1[i] + v2[i]);
    }
    return out;
}

function minus(v1, v2) {
    const out = [];
    for (let i = 0; i < v1.length; i++) {
        out.push(v1[i] - v2[i]);
    }
    return out;
}


function scale (v, s) {
    const out = [];
    for (let i = 0; i < v.length; i++) {
        out.push(v[i] * s);
    }
    return out;
}


function project_along(v1, v2, t) {
    const v = minus(v2, v1);
    const num = dot(minus(t, v1), v);
    const denom = dot(v,v);
    return num/denom;
}

function share() {
    // We use the stored guesses here, because those are not updated again
    // once you win -- we don't want to include post-win guesses here.
    const text = solveStory(JSON.parse(storage.getItem("guesses")), puzzleNumber);
    const copied = ClipboardJS.copy(text);

    if (copied) {
        alert("Copied to clipboard");
    }
    else {
        alert("Failed to copy to clipboard");
    }
}

const words_selected = [];
const cache = {};
let secret = "";
let secretVec = null;
let similarityStory = null;

function select(word, secretVec) {
    /*
    let model;
    if (!(word in cache)) {
        // this can happen on a reload, since we do not store
        // the vectors in localstorage
        model = cache[word];
    } else {
        model = getModel(word);
        cache[word] = model;
    }
    words_selected.push([word, model.vec]);
    if (words_selected.length > 2) {
        words_selected.pop();
    }
    const proj = project_along(words_selected[0][1], words_selected[1][1],
                               target);
    console.log(proj);
*/
}

function guessRow(similarity, oldGuess, percentile, guessNumber, guess) {
    let percentileText = "(cold)";
    let progress = "";
    let cls = "";
    if (similarity >= similarityStory.rest * 100) {
        percentileText = '<span class="weirdWord">????<span class="tooltiptext">Unusual word found!  This word is not in the list of &quot;normal&quot; words that we use for the top-1000 list, but it is still similar! (Is it maybe capitalized?)</span></span>';
    }
    if (percentile) {
        if (percentile == 1000) {
            percentileText = "FOUND!";
        } else {
            cls = "close";
            percentileText = `<span class="percentile">${percentile}/1000</span>&nbsp;`;
            progress = ` <span class="progress-container">
<span class="progress-bar" style="width:${percentile/10}%">&nbsp;</span>
</span>`;
        }
    }
    let color;
    if (oldGuess === guess) {
        color = '#c0c';
    } else if (prefersDarkColorScheme) {
        color = '#fafafa';
    } else {
        color = '#000';
    }
    const similarityLevel = similarity * 2.55;
    let similarityColor;
    if (prefersDarkColorScheme) {
        similarityColor = `255,${255-similarityLevel},${255-similarityLevel}`;
    } else {
        similarityColor = `${similarityLevel},0,0`;
    }
    return `<tr><td>${guessNumber}</td><td style="color:${color}" onclick="select('${oldGuess}', secretVec);">${oldGuess}</td><td style="color: rgb(${similarityColor})">${similarity.toFixed(2)}</td><td class="${cls}">${percentileText}${progress}
</td></tr>`;

}

function updateLocalTime() {
    const now = new Date();
    now.setUTCHours(24, 0, 0, 0);

    $('#localtime').innerHTML = `or ${now.getHours()}:00 your time`;
}

function solveStory(guesses, puzzleNumber) {
    const guess_count = guesses.length;
    if (guess_count == 0) {
        return `I gave up on Semantle ${puzzleNumber} without even guessing once.`;
    }

    if (guess_count == 1) {
        return `I got Semantle ${puzzleNumber} on my first guess!`;
    }

    let describe = function(similarity, percentile) {
        let out = `had a similarity of ${similarity.toFixed(2)}`;
        if (percentile) {
            out += ` (${percentile}/1000)`;
        }
        return out;
    }

    const guesses_chrono = guesses.slice();
    guesses_chrono.sort(function(a, b){return a[3]-b[3]});

    let [similarity, old_guess, percentile, guess_number] = guesses_chrono[0];
    let first_guess = `My first guess ${describe(similarity, percentile)}.`;
    let first_guess_in_top = !!percentile;

    let first_hit = '';
    if (!first_guess_in_top) {
        for (let entry of guesses_chrono) {
            [similarity, old_guess, percentile, guess_number] = entry;
            if (percentile) {
                first_hit = `  My first word in the top 1000 was at guess #${guess_number}.  `;
                break;
            }
        }
    }

    const penultimate_guess = guesses_chrono[guesses_chrono.length - 2];
    [similarity, old_guess, percentile, guess_number] = penultimate_guess;
    const penultimate_guess_msg = `My penultimate guess ${describe(similarity, percentile)}.`;

    return `I solved Semantle #${puzzleNumber} in ${guess_count} guesses. ${first_guess}${first_hit}${penultimate_guess_msg} https://semantle.novalis.org/`;
}

let Semantle = (function() {
    async function getSimilarityStory(secret) {
        const url = "/similarity/" + secret;
        const response = await fetch(url);
        try {
            return await response.json();
        } catch (e) {
            return null;
        }
    }

    async function getModel(word) {
        if (cache.hasOwnProperty(word)) {
            return cache[word];
        }
        const url = "/model2/" + secret + "/" + word.replaceAll(" ", "_");
        const response = await fetch(url);
        try {
            return await response.json();
        } catch (e) {
            return null;
        }
    }

    async function getNearby(word) {
        const url = "/nearby/" + word ;
        const response = await fetch(url);
        try {
            return await response.json();
        } catch (e) {
            return null;
        }
    }

    async function init() {
        secret = secretWords[puzzleNumber].toLowerCase();
        const yesterday = secretWords[yesterdayPuzzleNumber].toLowerCase();

        $('#yesterday').innerHTML = `Yesterday's word was <b>"${yesterday}"</b>.`;
        $('#yesterday2').innerHTML = yesterday;

        try {
            const yesterdayNearby = await getNearby(yesterday);
            const secretBase64 = btoa(unescape(encodeURIComponent(yesterday)));
            $('#nearbyYesterday').innerHTML = `${yesterdayNearby.join(", ")}, in descending order of closensess. <a href="nearby_1k/${secretBase64}">More?</a>`;
        } catch (e) {
            $('#nearbyYesterday').innerHTML = `Coming soon!`;
        }
        updateLocalTime();

        try {
            similarityStory = await getSimilarityStory(secret);
            $('#similarity-story').innerHTML = `
Today is puzzle number <b>${puzzleNumber}</b>. The nearest word has a similarity of
<b>${(similarityStory.top * 100).toFixed(2)}</b>, the tenth-nearest has a similarity of
${(similarityStory.top10 * 100).toFixed(2)} and the one thousandth nearest word has a
similarity of ${(similarityStory.rest * 100).toFixed(2)}.
`;
        } catch {
            // we can live without this in the event that something is broken
        }

        const storagePuzzleNumber = storage.getItem("puzzleNumber");
        if (storagePuzzleNumber != puzzleNumber) {
            storage.removeItem("guesses");
            storage.removeItem("winState");
            storage.setItem("puzzleNumber", puzzleNumber);
        }

        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            prefersDarkColorScheme = true;
        }

        if (!storage.getItem("readRules")) {
            openRules();
        }

        $("#rules-button").addEventListener('click', openRules);

        [$("#rules-underlay"), $("#rules-close")].forEach((el) => {
            el.addEventListener('click', () => {
                document.body.classList.remove('rules-open');
            });
        });

        $("#rules").addEventListener("click", (event) => {
            // prevents click from propagating to the underlay, which closes the rules
            event.stopPropagation();
        });

        $('#give-up-btn').addEventListener('click', function(event) {
            if (!gameOver) {
                if (confirm("Are you sure you want to give up?")) {
                    endGame(false, true);
                }
            }
        });

        $('#form').addEventListener('submit', async function(event) {
            event.preventDefault();
            if (secretVec === null) {
                secretVec = (await getModel(secret)).vec;
            }
            $('#guess').focus();
            $('#error').textContent = "";
            let guess = $('#guess').value.trim().replace("!", "").replace("*", "");
            if (!guess) {
                return false;
            }
            if ($("#lower").checked) {
                guess = guess.toLowerCase();
            }

            if (typeof unbritish !== 'undefined' && unbritish.hasOwnProperty(guess)) {
                guess = unbritish[guess];
            }

            if (guess[0].toLowerCase() != guess[0]) {
                caps += 1;
            }
            if (caps >= 2 && (caps / guesses.length) > 0.4 && !warnedCaps) {
                warnedCaps = true;
                $("#lower").checked = confirm("You're entering a lot of words with initial capital letters.  This is probably not what you want to do, and it's probably caused by your phone keyboard ignoring the autocapitalize setting.  \"Nice\" is a city. \"nice\" is an adjective.  Do you want me to downcase your guesses for you?");
            }

            $('#guess').value = "";

            const guessData = await getModel(guess);
            if (!guessData) {
                $('#error').textContent = `I don't know the word ${guess}.`;
                return false;
            }

            let percentile = guessData.percentile;

            const guessVec = guessData.vec;

            cache[guess] = guessData;

            let similarity = getCosSim(guessVec, secretVec) * 100.0;
            if (!guessed.has(guess)) {
                guessCount += 1;
                guessed.add(guess);

                const newEntry = [similarity, guess, percentile, guessCount];
                guesses.push(newEntry);

                if (handleStats) {
                    const stats = getStats();
                    stats['totalGuesses'] += 1;
                    storage.setItem('stats', JSON.stringify(stats));
                }
            }
            guesses.sort(function(a, b){return b[0]-a[0]});

            if (!gameOver) {
                saveGame(-1, -1);
            }

            chrono_forward = 1;

            updateGuesses(guess);

            firstGuess = false;
            if (guess.toLowerCase() === secret && !gameOver) {
                endGame(true, true);
            }
            return false;
        });

        const winState = storage.getItem("winState");
        if (winState != null) {
            guesses = JSON.parse(storage.getItem("guesses"));
            for (let guess of guesses) {
                guessed.add(guess[1]);
            }
            guessCount = guessed.size;
            updateGuesses("");
            if (winState != -1) {
                endGame(winState > 0, false);
            }
        }
    }

    function openRules() {
        document.body.classList.add('rules-open');
        storage.setItem("readRules", true);
    }

    function updateGuesses(guess) {
        let inner = `<tr><th id="chronoOrder">#</th><th id="alphaOrder">Guess</th><th id="similarityOrder">Similarity</th><th>Getting close?</th></tr>`;
        /* This is dumb: first we find the most-recent word, and put
           it at the top.  Then we do the rest. */
        for (let entry of guesses) {
            let [similarity, oldGuess, percentile, guessNumber] = entry;
            if (oldGuess == guess) {
                inner += guessRow(similarity, oldGuess, percentile, guessNumber, guess);
            }
        }
        inner += "<tr><td colspan=4><hr></td></tr>";
        for (let entry of guesses) {
            let [similarity, oldGuess, percentile, guessNumber] = entry;
            if (oldGuess != guess) {
                inner += guessRow(similarity, oldGuess, percentile, guessNumber);
            }
        }
        $('#guesses').innerHTML = inner;
        $('#chronoOrder').addEventListener('click', event => {
            guesses.sort(function(a, b){return chrono_forward * (a[3]-b[3])});
            chrono_forward *= -1;
            updateGuesses(guess);
        });
        $('#alphaOrder').addEventListener('click', event => {
            guesses.sort(function(a, b){return a[1].localeCompare(b[1])});
            chrono_forward = 1;
            updateGuesses(guess);
        });
        $('#similarityOrder').addEventListener('click', event => {
            guesses.sort(function(a, b){return b[0]-a[0]});
            chrono_forward = 1;
            updateGuesses(guess);
        });
    }


    function saveGame(guessCount, winState) {
        // If we are in a tab still open from yesterday, we're done here.
        // Don't save anything because we may overwrite today's game!
        let savedPuzzleNumber = storage.getItem("puzzleNumber");
        if (savedPuzzleNumber != puzzleNumber) { return }

        storage.setItem("winState", winState);
        storage.setItem("guesses", JSON.stringify(guesses));
    }

    function getStats() {
        const oldStats = storage.getItem("stats");
        if (oldStats == null) {
            const stats = {
                'firstPlay' : puzzleNumber,
                'lastEnd' : puzzleNumber - 1,
                'lastPlay' : puzzleNumber,
                'winStreak' : 0,
                'playStreak' : 0,
                'totalGuesses' : 0,
                'wins' : 0,
                'giveups' : 0,
                'abandons' : 0,
                'totalPlays' : 0,
            };
            storage.setItem("stats", JSON.stringify(stats));
            return stats;
        } else {
            const stats = JSON.parse(oldStats);
            if (stats['lastPlay'] != puzzleNumber) {
                const onStreak = (stats['lastPlay'] == puzzleNumber - 1);
                if (onStreak) {
                    stats['playStreak'] += 1;
                }
                stats['totalPlays'] += 1;
                if (stats['lastEnd'] != puzzleNumber - 1) {
                    stats['abandons'] += 1;
                }
                stats['lastPlay'] = puzzleNumber;
            }
            return stats;
        }
    }

    function endGame(won, countStats) {
        let stats;
        if (handleStats) {
            stats = getStats();
            if (countStats) {
                const onStreak = (stats['lastEnd'] == puzzleNumber - 1);

                stats['lastEnd'] = puzzleNumber;
                if (won) {
                    if (onStreak) {
                        stats['winStreak'] += 1;
                    } else {
                    stats['winStreak'] = 1;
                    }
                    stats['wins'] += 1;
                } else {
                    stats['winStreak'] = 0;
                    stats['giveups'] += 1;
                }
                storage.setItem("stats", JSON.stringify(stats));
            }
        }

        $('#give-up-btn').style = "display:none;";
        $('#response').classList.add("gaveup");
        gameOver = true;
        const secretBase64 = btoa(unescape(encodeURIComponent(secret)));
        let response;
        if (won) {
            response = `<p><b>You found it in ${guesses.length}!  The secret word is ${secret}</b>.  Feel free to keep entering words if you are curious about the similarity to other words. <a href="javascript:share();">Share</a> and play again tomorrow.  You can see the nearest words <a href="nearby_1k/${secretBase64}">here</a>.</p>`
        } else {
            response = `<p><b>You gave up!  The secret word is: ${secret}</b>.  Feel free to keep entering words if you are curious about the similarity to other words.  You can see the nearest words <a href="nearby_1k/${secretBase64}">here</a>.</p>`;
        }

        if (handleStats) {
            const totalGames = stats['wins'] + stats['giveups'] + stats['abandons'];
            response += `<br/>
Stats (since we started recording, on day 23): <br/>
<table>
<tr><th>First game:</th><td>${stats['firstPlay']}</td></tr>
<tr><th>Total days played:</th><td>${totalGames}</td></tr>
<tr><th>Wins:</th><td>${stats['wins']}</td></tr>
<tr><th>Win streak:</th><td>${stats['winStreak']}</td></tr>
<tr><th>Give-ups:</th><td>${stats['giveups']}</td></tr>
<tr><th>Did not finish</th><td>${stats['abandons']}</td></tr>
<tr><th>Total guesses across all games:</th><td>${stats['totalGuesses']}</td></tr>
</table>
`;
        }
        $('#response').innerHTML = response;

        if (countStats) {
            saveGame(guesses.length, won ? 1 : 0);
        }
    }

    return {
        init: init
    };
})();
    
window.addEventListener('load', async () => { Semantle.init() });
