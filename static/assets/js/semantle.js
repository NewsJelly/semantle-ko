/*
    Copyright (c) 2022, Newsjelly, forked from Semantlich by Johannes Gätjen semantlich.johannesgaetjen.de and Semantle by David Turner <novalis@novalis.org> semantle.novalis.org

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
let numPuzzles = 4650;
const now = Date.now();
const initialDate = new Date('2022-04-01T00:00:00+09:00');
const puzzleNumber = Math.floor((new Date() - initialDate) / 86400000) % numPuzzles;
const yesterdayPuzzleNumber = (puzzleNumber + numPuzzles - 1) % numPuzzles;
const storage = window.localStorage;
let chrono_forward = 1;
let prefersDarkColorScheme = false;
// settings
let darkMode = storage.getItem("darkMode") === 'true';
let shareGuesses = storage.getItem("shareGuesses") === 'false' ? false: true;
let shareTime = storage.getItem("shareTime") === 'false' ? false: true;
let shareTopGuess = storage.getItem("shareTopGuess") === 'false' ? false: true;

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
        gtag('event', 'share');
        alert("클립보드로 복사했습니다.");
    }
    else {
        alert("클립보드에 복사할 수 없습니다.");
    }
}

const words_selected = [];
const cache = {};
let similarityStory = null;

function guessRow(similarity, oldGuess, percentile, guessNumber, guess) {
    let percentileText = percentile;
    let progress = "";
    let closeClass = "";
    if (similarity >= similarityStory.rest * 100 && percentile === '1000위 이상') {
        percentileText = '<span class="weirdWord">????<span class="tooltiptext">이 단어는 사전에는 없지만, 데이터셋에 포함되어 있으며 1,000위 이내입니다.</span></span>';
    }
    if (typeof percentile === 'number') {
            closeClass = "close";
            percentileText = `<span class="percentile">${percentile}</span>&nbsp;`;
            progress = ` <span class="progress-container">
<span class="progress-bar" style="width:${(1001 - percentile)/10}%">&nbsp;</span>
</span>`;
    }
    let style = '';
    if (oldGuess === guess) {
        style = 'style="color: #f7617a;font-weight: 600;"';
    }
    return `<tr><td>${guessNumber}</td><td ${style}>${oldGuess}</td><td>${similarity.toFixed(2)}</td><td class="${closeClass}">${percentileText}${progress}
</td></tr>`;

}

function getUpdateTimeHours() {
    const midnightUtc = new Date();
    midnightUtc.setUTCHours(24 - 9, 0, 0, 0);
    return midnightUtc.getHours();
}

function solveStory(guesses, puzzleNumber) {
    let guess_count = guesses.length - 1;
    let is_win = storage.getItem("winState") == 1;
    if (is_win) {
        guess_count += 1
        if (guess_count == 1) {
            return `이럴 수가! 첫번째 추측에서 ${puzzleNumber}번째 꼬맨틀 정답 단어를 맞혔습니다!\nhttps://semantle-ko.newsjel.ly/`;
        }
    }
    if (guess_count == 0) {
        return `${puzzleNumber}번째 꼬맨틀을 시도하지 않고 바로 포기했어요.\nhttps://semantle-ko.newsjel.ly/`;
    }

    let describe = function(similarity, percentile) {
        let out = `${similarity.toFixed(2)}`;
        if (percentile != '1000위 이상') {
            out += ` (순위 ${percentile})`;
        }
        return out;
    }

    let time = storage.getItem('endTime') - storage.getItem('startTime');
    let timeFormatted = new Date(time).toISOString().substr(11, 8).replace(":", "시간").replace(":", "분");
    let timeInfo = `소요 시간: ${timeFormatted}초\n`
    if (time > 24 * 3600000) {
        timeInfo = '소요 시간: 24시간 이상\n'
    }
    if (!shareTime) {
        timeInfo = ''
    }

    let topGuessMsg = ''
    const topGuesses = guesses.slice();
    if (shareTopGuess) {
        topGuesses.sort(function(a, b){return b[0]-a[0]});
        const topGuess = topGuesses[1];
        let [similarity, old_guess, percentile, guess_number] = topGuess;
        topGuessMsg = `최대 유사도: ${describe(similarity, percentile)}\n`;
    }
    let guessCountInfo = '';
    if (shareGuesses) {
        guessCountInfo = `추측 횟수: ${guess_count}\n`;
    }

    if (is_win) {
        return `${puzzleNumber}번째 꼬맨틀을 풀었습니다!\n${guessCountInfo}` +
            `${timeInfo}${topGuessMsg}https://semantle-ko.newsjel.ly/`;
    }

    return `저런… ${puzzleNumber}번째 꼬맨틀을 포기했어요..ㅠ\n${guessCountInfo}` +
            `${timeInfo}${topGuessMsg}https://semantle-ko.newsjel.ly/`;
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
        gtag('event', 'guess', {
            'event_category' : 'game_event',
            'event_label' : word,
        });
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
        $('#yesterday2').innerHTML = `어제의 정답 단어는 <b>"${yesterday}"</b>입니다.`;
        $('#yesterday-nearest1k').innerHTML = `정답 단어와 비슷한, <a href="/nearest1k/${yesterdayPuzzleNumber}">유사도 기준 상위 1,000개의 단어</a>를 확인할 수 있습니다.`;

        try {
            similarityStory = await getSimilarityStory(puzzleNumber);
            $('#similarity-story').innerHTML = `
            ${puzzleNumber}번째 꼬맨틀의 정답 단어를 맞혀보세요.<br/>
            정답 단어와 가장 유사한 단어의 유사도는 <b>${(similarityStory.top * 100).toFixed(2)}</b> 입니다.
            10번째로 유사한 단어의 유사도는 ${(similarityStory.top10 * 100).toFixed(2)}이고,
            1,000번째로 유사한 단어의 유사도는 ${(similarityStory.rest * 100).toFixed(2)} 입니다.`;
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

        $("#settings-button").addEventListener('click', openSettings);

        document.querySelectorAll(".dialog-underlay, .dialog-close").forEach((el) => {
            el.addEventListener('click', () => {
                document.body.classList.remove('dialog-open', 'settings-open');
            });
        });

        document.querySelectorAll(".dialog").forEach((el) => {
            el.addEventListener("click", (event) => {
                // prevents click from propagating to the underlay, which closes the dialog
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

        $('#share-top-guess').addEventListener('click', function(event) {
            storage.setItem('shareTopGuess', event.target.checked);
            shareTopGuess = event.target.checked;
        });

        $('#dark-mode').checked = darkMode;
        $('#share-guesses').checked = shareGuesses;
        $('#share-time').checked = shareTime;
        $('#share-top-guess').checked = shareTopGuess;

        $('#give-up-btn').addEventListener('click', async function(event) {
            if (!gameOver) {
                if (confirm("정말로 포기하시겠습니까?")) {
                    const url = '/giveup/' + puzzleNumber;
                    const secret = await (await fetch(url)).text();
                    guessed.add(secret);
                    guessCount += 1;
                    const newEntry = [100, secret, '정답', guessCount];
                    guesses.push(newEntry);
                    guesses.sort(function(a, b){return b[0]-a[0]});
                    updateGuesses(guess);
                    endGame(false, true);
                    gtag('event', 'giveup', {
                        'event_category' : 'game_event',
                        'event_label' : 'giveup',
                    });
                    gtag('event', 'giveup', {
                        'event_category' : 'game_event',
                        'event_label' : 'guess_count',
                        'value' : guessCount,
                    });
                }
            }
        });

        $('#form').addEventListener('submit', async function(event) {
            event.preventDefault();
            $('#error').textContent = "";
            let guess = $('#guess').value.trim().replace("!", "").replace("*", "").replaceAll("/", "");
            if (!guess) {
                return false;
            }

            $('#guess').value = "";

            $('#dummy').focus(); // to fix ios buffer issue
            $('#guess').focus();

            const guessData = await submitGuess(guess);

            if (guessData == null) {
                $('#error').textContent = `서버가 응답하지 않습니다. 나중에 다시 시도해보세요.`
                return false;
            }
            if (guessData.error == "unknown") {
                $('#error').textContent = `${guess}은(는) 알 수 없는 단어입니다.`;
                return false;
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
                gtag('event', 'nth_guess', {
                    'event_category' : 'game_event',
                    'event_label' : guess,
                    'value' : guessCount,
                });
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
                gtag('event', 'win', {
                    'event_category' : 'game_event',
                    'event_label' : 'win',
                });
                gtag('event', 'win', {
                    'event_category' : 'game_event',
                    'event_label' : 'guess_count',
                    'value' : guessCount,
                });
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

    function openSettings() {
        document.body.classList.add('dialog-open', 'settings-open');
    }

    function updateGuesses(guess) {
        let inner = `<tr><th id="chronoOrder">#</th><th id="alphaOrder">추측한 단어</th><th id="similarityOrder">유사도</th><th>유사도 순위</th></tr>`;
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

    function setSnowMode() {
        let days = Math.floor(Date.now() / 1000 / 60 / 60 / 24)
        let on = days % 3 === 0
        document.body.classList[on ? 'add' : 'remove']('snow');
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
            response = `<p><b>정답 단어를 맞혔습니다. ${guesses.length}번째 추측만에 정답을 맞혔네요!</b><br/>`;
        } else {
            response = `<p><b>${guesses.length - 1}번째 추측에서 포기했습니다!</b><br/>`;
        }
        const commonResponse = `정답 단어와 비슷한, <a href="/nearest1k/${puzzleNumber}">상위 1,000개의 단어</a>를 확인해보세요.</p>`
        response += commonResponse;
        response += `<input type="button" value="기록 복사하기" id="result" onclick="share()" class="button"><br />`
        const totalGames = stats['wins'] + stats['giveups'] + stats['abandons'];
        response += `<br/>
        ${puzzleNumber + 1}번째 꼬맨틀은 오늘 밤 자정(한국 시간 기준)에 열립니다.<br/>
<br/>
<b>나의 플레이 기록</b>: <br/>
<table>
<tr><th>가장 처음 풀었던 꼬맨틀 번호:</th><td>${stats['firstPlay']}</td></tr>
<tr><th>도전한 게임 횟수:</th><td>${totalGames}</td></tr>
<tr><th>정답 횟수:</th><td>${stats['wins']}</td></tr>
<tr><th>연속 정답 횟수:</th><td>${stats['winStreak']}</td></tr>
<tr><th>포기 횟수:</th><td>${stats['giveups']}</td></tr>
<tr><th>지금까지 추측 단어 총 갯수:</th><td>${stats['totalGuesses']}</td></tr>
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
        setSnowMode: setSnowMode,
    };
})();

// do this when the file loads instead of waiting for DOM to be ready to avoid
// a flash of unstyled content
Semantle.checkMedia();
// Semantle.setSnowMode();
    
window.addEventListener('load', async () => { Semantle.init() });
