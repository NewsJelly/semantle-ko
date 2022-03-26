/*
    Copyright (c) 2022, Johannes Gätjen, forked from Semantle by David Turner <novalis@novalis.org> semantle.novalis.org

     This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, version 3.

    This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
'use strict';

let gameOver = false;
let guesses = [];
let guessed = new Set();
let guessCount = 0;
let model = null;
let numPuzzles = 4817;
const now = Date.now();
const today = Math.floor(Date.now() / 86400000);
const initialDay = new Date('2022-03-18') / 86400000;
const puzzleNumber = (today - initialDay) % numPuzzles;
const yesterdayPuzzleNumber = (puzzleNumber + numPuzzles - 1) % numPuzzles;
const storage = window.localStorage;
let chrono_forward = 1;
let prefersDarkColorScheme = false;
// settings
let darkMode = storage.getItem("darkMode") === 'true';
let shareGuesses = storage.getItem("shareGuesses") === 'false' ? false: true;
let shareTime = storage.getItem("shareTime") === 'false' ? false: true;
let enableUmlauts = storage.getItem("enableUmlauts") === 'false' ? false: true;

function $(id) {
    if (id.charAt(0) !== '#') return false;
    return document.getElementById(id.substring(1));
}

function share() {
    // We use the stored guesses here, because those are not updated again
    // once you win -- we don't want to include post-win guesses here.
    const text = solveStory(JSON.parse(storage.getItem("guesses")), puzzleNumber);
    const copied = ClipboardJS.copy(text);

    if (copied) {
        alert("In Zwischenablage kopiert");
    }
    else {
        alert("Kopieren fehlgeschlagen");
    }
}

const words_selected = [];
const cache = {};
let similarityStory = null;

function guessRow(similarity, oldGuess, percentile, guessNumber, guess) {
    let percentileText = percentile;
    let progress = "";
    let closeClass = "";
    if (similarity >= similarityStory.rest * 100 && percentile === '(kalt)') {
        percentileText = '<span class="weirdWord">????<span class="tooltiptext">Dieses Wort ist nicht im Wörterbuch, ist aber im Datensatz vorhanden und hat eine höhere Ähnlichkeit, als das tausendst-ähnlichste Wort.</span></span>';
    }
    if (typeof percentile === 'number') {
            closeClass = "close";
            percentileText = `<span class="percentile">${percentile}</span>&nbsp;`;
            progress = ` <span class="progress-container">
<span class="progress-bar" style="width:${(1001 - percentile)/10}%">&nbsp;</span>
</span>`;
    }
    let color;
    if (oldGuess === guess) {
        color = '#c0c';
    } else if (darkMode) {
        color = '#fafafa';
    } else {
        color = '#000';
    }
    return `<tr><td>${guessNumber}</td><td style="color:${color}" onclick="select('${oldGuess}', secretVec);">${oldGuess}</td><td>${similarity.toFixed(2)}</td><td class="${closeClass}">${percentileText}${progress}
</td></tr>`;

}

function updateLocalTime() {
    const now = new Date();
    now.setUTCHours(24, 0, 0, 0);

    $('#localtime').innerHTML = `bzw. ${now.getHours()}:00 Uhr deiner Zeit`;
}

function solveStory(guesses, puzzleNumber) {
    const guess_count = guesses.length;
    if (guess_count == 0) {
        return `Ich habe Semantlich #${puzzleNumber} aufgegeben ohne auch nur einmal zu raten. http://semantlich.johannesgaetjen.de`;
    }

    if (guess_count == 1) {
        return `Ich habe Semantlich #${puzzleNumber} beim ersten Versuch erraten! Bin ich ein Schummler, oder einfach nur gut? http://semantlich.johannesgaetjen.de`;
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
    let time = storage.getItem('endTime') - storage.getItem('startTime');
    let timeFormatted = new Date(time).toISOString().substr(11, 8).replace(":", "h").replace(":", "m");
    let timeInfo = ` Zwischen meinem ersten und letzten Versuch sind ${timeFormatted}s vergangen.`
    if (time > 24 * 3600000) {
        timeInfo = ' Ich habe über 24 Stunden gebraucht.'
    }
    if (!shareTime) {
        timeInfo = ''
    }

    const penultimate_guess = guesses_chrono[guesses_chrono.length - 2];
    [similarity, old_guess, percentile, guess_number] = penultimate_guess;
    const penultimate_guess_msg = `Mein vorletzter Versuch ${describe(similarity, percentile)}.`;

    let guessCountInfo = '';
    if (shareGuesses) {
        guessCountInfo = ` in ${guess_count} Versuchen`;
    }

    return `Ich habe Semantlich (das Wortbedeutungsähnlichkeitsratespiel) #${puzzleNumber}${guessCountInfo}` +
    ` gelöst.${timeInfo} http://semantlich.johannesgaetjen.de`;
}

let Semantle = (function() {
    async function getSimilarityStory(puzzleNumber) {
        const url = "/similarity/" + puzzleNumber;
        const response = await fetch(url);
        try {
            return await response.json();
        } catch (e) {
            return null;
        }
    }

    async function submitGuess(word) {
        if (cache.hasOwnProperty(word)) {
            return cache[word];
        }
        const url = "/guess/" + puzzleNumber + "/" + word;
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

    async function getYesterday() {
        const url = "/yesterday/" + puzzleNumber
        try {
            return (await fetch(url)).text();
        } catch (e) {
            return null;
        }
    }

    async function init() {
        let yesterday = await getYesterday()
        $('#yesterday').innerHTML = `Das Lösungswort gestern war <b>"${yesterday}"</b>.`;
        $('#yesterday2').innerHTML = `Das Lösungswort gestern war <b>"${yesterday}"</b>.
        <a href="/nearest1k/${yesterdayPuzzleNumber}">Hier</a> kannst du die 1000 ähnlichsten Wörter nachschauen.`;
        updateLocalTime();

        try {
            similarityStory = await getSimilarityStory(puzzleNumber);
            $('#similarity-story').innerHTML = `
Heute ist Puzzle Nummer <b>${puzzleNumber}</b>. Das ähnlichste Wort hat eine Ähnlichkeit von
<b>${(similarityStory.top * 100).toFixed(2)}</b>, das zehnt-ähnlichste Wort hat eine Ähnlichkeit von
${(similarityStory.top10 * 100).toFixed(2)} und das tausend-ähnlichste Wort hat eine Ähnlichkeit von
${(similarityStory.rest * 100).toFixed(2)}.
`;
        } catch {
            // we can live without this in the event that something is broken
        }

        const storagePuzzleNumber = storage.getItem("puzzleNumber");
        if (storagePuzzleNumber != puzzleNumber) {
            storage.removeItem("guesses");
            storage.removeItem("winState");
            storage.removeItem("startTime");
            storage.removeItem("endTime");
            storage.setItem("puzzleNumber", puzzleNumber);
        }

        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            prefersDarkColorScheme = true;
        }

        if (!storage.getItem("readRules")) {
            openRules();
        }

        $("#rules-button").addEventListener('click', openRules);
        $("#settings-button").addEventListener('click', openSettings);

        document.querySelectorAll(".dialog-underlay, .dialog-close").forEach((el) => {
            el.addEventListener('click', () => {
                document.body.classList.remove('dialog-open', 'rules-open', 'settings-open');
            });
        });

        document.querySelectorAll(".dialog").forEach((el) => {
            el.addEventListener("click", (event) => {
                // prevents click from propagating to the underlay, which closes the rules
                event.stopPropagation();
            });
        });

        $('#dark-mode').addEventListener('click', function(event) {
            storage.setItem('darkMode', event.target.checked);
            toggleDarkMode(event.target.checked);
        });

        toggleDarkMode(darkMode);

        $('#share-guesses').addEventListener('click', function(event) {
            storage.setItem('shareGuesses', event.target.checked);
            shareGuesses = event.target.checked;
        });

        $('#share-time').addEventListener('click', function(event) {
            storage.setItem('shareTime', event.target.checked);
            shareTime = event.target.checked;
        });

        $('#enable-umlauts').addEventListener('click', function(event) {
            storage.setItem('enableUmlauts', event.target.checked);
            enableUmlauts = event.target.checked;
            toggleUmlautButtons(enableUmlauts);
        });

        if (darkMode) {
            $('#dark-mode').checked = true;
        }
        if (shareGuesses) {
            $('#share-guesses').checked = true;
        }
        if (shareTime) {
            $('#share-time').checked = true;
        }
        if (enableUmlauts) {
            $('#enable-umlauts').checked = true;
        }
        toggleUmlautButtons(enableUmlauts);

        $('#give-up-btn').addEventListener('click', async function(event) {
            if (!gameOver) {
                if (confirm("Bist du sicher, dass du aufgeben möchtest?")) {
                    const url = '/giveup/' + puzzleNumber;
                    const secret = await (await fetch(url)).text();
                    guessed.add(secret);
                    guessCount += 1;
                    const newEntry = [100, secret, 'Das Lösungswort', guessCount];
                    guesses.push(newEntry);
                    guesses.sort(function(a, b){return b[0]-a[0]});
                    updateGuesses(guess);
                    endGame(false, true);
                }
            }
        });

        $('#form').addEventListener('submit', async function(event) {
            event.preventDefault();
            $('#guess').focus();
            $('#error').textContent = "";
            let guess = $('#guess').value.trim().replace("!", "").replace("*", "").replaceAll("/", "");
            if (!guess) {
                return false;
            }

            $('#guess').value = "";

            const guessData = await submitGuess(guess);
            if (guessData.error == "unknown") {
                $('#error').textContent = `Ich kenne das Wort ${guess} nicht.`;
                return false;
            }
            if (!guessData) {
                $('#error').textContent = `Keine Antwort vom Server erhalten. Bitte versuche es später nochmal.`
            }

            guess = guessData.guess
            cache[guess] = guessData;

            let percentile = guessData.rank;
            let similarity = guessData.sim * 100.0;
            if (!guessed.has(guess)) {
                if (guessCount == 0) {
                    storage.setItem('startTime', Date.now())
                }
                guessCount += 1;
                guessed.add(guess);

                const newEntry = [similarity, guess, percentile, guessCount];
                guesses.push(newEntry);

                if (!gameOver) {
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

            if (guessData.sim == 1 && !gameOver) {
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
        document.body.classList.add('dialog-open', 'rules-open');
        storage.setItem("readRules", true);
    }

    function openSettings() {
        document.body.classList.add('dialog-open', 'settings-open');
    }

    function updateGuesses(guess) {
        let inner = `<tr><th id="chronoOrder">#</th><th id="alphaOrder">Geratenes Wort</th><th id="similarityOrder">Ähnlichkeit</th><th>Ähnlichkeitsrang</th></tr>`;
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

    function toggleDarkMode(on) {
        document.body.classList[on ? 'add' : 'remove']('dark');
        const darkModeCheckbox = $("#dark-mode");
        darkMode = on;
        // this runs before the DOM is ready, so we need to check
        if (darkModeCheckbox) {
            darkModeCheckbox.checked = on;
        }
    }

    function checkMedia() {
        let darkMode = storage.getItem("darkMode") === 'true';
        toggleDarkMode(darkMode);
    }

    function toggleUmlautButtons(on) {
        if (on) {
            $('#umlaut-buttons').style="";
        } else {
            $('#umlaut-buttons').style="display:none";
        }
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
        let stats = getStats();
        if (storage.getItem('endTime') == null) {
            storage.setItem('endTime', Date.now())
        }
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

        $('#give-up-btn').style = "display:none;";
        $('#response').classList.add("gaveup");
        gameOver = true;
        let response;
        if (won) {
            response = `<p><b>Du hast es in ${guesses.length} Versuchen gefunden!</b> Du kannst noch weitere Worte eingeben um die Ähnlichkeit nachzuschauen. <a href="javascript:share();">Teile</a> dein Ergebnis und spiele morgen wieder. <a href="/nearest1k/${puzzleNumber}">Hier</a> kannst du die 1000 ähnlichsten Wörter nachschauen.</p>`;
        } else {
            response = `<p><b>Du hast aufgegeben!</b> Du kannst noch weitere Worte eingeben um die Ähnlichkeit nachzuschauen. <a href="/nearest1k/${puzzleNumber}">Hier</a> kannst du die 1000 ähnlichsten Wörter nachschauen.</p>`;
        }

        const totalGames = stats['wins'] + stats['giveups'] + stats['abandons'];
        response += `<br/>
Statistik: <br/>
<table>
<tr><th>Erstes Spiel:</th><td>${stats['firstPlay']}</td></tr>
<tr><th>Anzahl Spiele gespielt:</th><td>${totalGames}</td></tr>
<tr><th>Gewonnen:</th><td>${stats['wins']}</td></tr>
<tr><th>Spiele in Folge gewonnen:</th><td>${stats['winStreak']}</td></tr>
<tr><th>Aufgegeben:</th><td>${stats['giveups']}</td></tr>
<tr><th>Nicht beendet:</th><td>${stats['abandons']}</td></tr>
<tr><th>Gesamtzahl Versuche über alle Spiele:</th><td>${stats['totalGuesses']}</td></tr>
</table>
`;
        $('#response').innerHTML = response;

        if (countStats) {
            saveGame(guesses.length, won ? 1 : 0);
        }
    }

    return {
        init: init,
        checkMedia: checkMedia,
    };
})();

// do this when the file loads instead of waiting for DOM to be ready to avoid
// a flash of unstyled content
Semantle.checkMedia();
    
window.addEventListener('load', async () => { Semantle.init() });
