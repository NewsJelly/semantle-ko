import pickle

from flask import (
    Flask,
    send_file
)

import word2vec
from process_similar import dump_nearest

app = Flask(__name__)


@app.route('/')
def get_index():
    return send_file('static/index.html')


# todo: change with day
@app.route('/guess/<int:day>/<string:word>')
def get_guess(day: int, word: str):
    # check most similar
    if word in nearest:
        return word + repr(nearest[word])
    try:
        return f"{word}\t{word2vec.similarity(secret, word)}"
    except KeyError:
        return 'Word unknown', 404


if __name__ == '__main__':
    # todo: dependent on current day / check if already exists / start job every 24 h
    start_idx = 1000
    print("loading valid nearest")
    with open('data/valid_nearest.dat', 'rb') as f:
        valid_nearest_words, valid_nearest_vecs = pickle.load(f)
    secret = valid_nearest_words[start_idx]
    print("dumping nearest")
    nearest = dump_nearest(secret, valid_nearest_words, valid_nearest_vecs)
    print("launching app")
    app.run(host='0.0.0.0', port=5000)
