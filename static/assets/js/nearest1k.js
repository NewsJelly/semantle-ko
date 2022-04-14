function $(id) {
    if (id.charAt(0) !== '#') return false;
    return document.getElementById(id.substring(1));
}

function init() {
    const initialDate = new Date('2022-04-01T00:00:00+09:00');
    const numPuzzles = 4650;
    const puzzleNumber = Math.floor((new Date() - initialDate) / 86400000) % numPuzzles;

    const day = parseInt($('#day').innerHTML.substring(1))
    if (day != puzzleNumber && day != (puzzleNumber + 1) % numPuzzles) {
        $('#nearest').style="display:block;";
    } else {
        if (day == puzzleNumber) {
            $('#spoiler').innerHTML = '<b>오늘</b>'
        } else {
            $('#spoiler').innerHTML = '<b>내일</b>'
        }
        $('#warning').style="display:block";
        $('#warning').addEventListener('click', function(event) {
            $('#warning').style="display:none";
            $('#nearest').style="display:block";
        });
    }
}

window.addEventListener('load', init);
