function $(id) {
    if (id.charAt(0) !== '#') return false;
    return document.getElementById(id.substring(1));
}

function init() {

    const now = Date.now();
    const today = Math.floor(Date.now() / 86400000);
    const initialDay = new Date('2022-03-18') / 86400000;
    const numPuzzles = 4817;
    const puzzleNumber = (today - initialDay) % numPuzzles;

    const day = parseInt($('#day').innerHTML.substring(1))
    if (day != puzzleNumber && day != (puzzleNumber + 1) % numPuzzles) {
        $('#nearest').style="display:block;";
    } else {
        if (day == puzzleNumber) {
            $('#spoiler').innerHTML = '<b>heutige</b>'
        } else {
            $('#spoiler').innerHTML = '<b>morgige</b>'
        }
        $('#warning').style="display:block";
        $('#warning').addEventListener('click', function(event) {
            $('#warning').style="display:none";
            $('#nearest').style="display:block";
        });
    }
}

window.addEventListener('load', init);
