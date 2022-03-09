import pickle

from flask import (
    Flask,
    send_file,
    send_from_directory,
    jsonify
)

import word2vec
from process_similar import dump_nearest

app = Flask(__name__)


@app.route('/')
def get_index():
    return send_file('static/index.html')


@app.route("/favicon.ico")
def send_favicon():
    return send_file("static/assets/favicon.ico")


@app.route("/assets/<path:path>")
def send_static(path):
    return send_from_directory("static/assets", path)


# todo: change with day
@app.route('/guess/<int:day>/<string:word>')
def get_guess(day: int, word: str):
    rtn = {"guess": word}
    # check most similar
    if word in nearest:
        rtn["sim"] = nearest[word][1]
        rtn["rank"] = nearest[word][0]
    else:
        try:
            rtn["sim"] = word2vec.similarity(secret, word)
            rtn["rank"] = "(kalt)"
        except KeyError:
            return 'Word unknown', 404
    return jsonify(rtn)



@app.route('/similarity/<int:day>')
def get_similarity(day: int):
    nearest_dists = sorted([v[1] for v in nearest.values()])
    print(nearest_dists)
    return jsonify({"top": nearest_dists[-2], "top10": nearest_dists[-12], "rest": nearest_dists[0]})


if __name__ == '__main__':
    # todo: dependent on current day / check if already exists / start job every 24 h
    start_idx = 1001
    print("loading valid nearest")
    with open('data/valid_nearest.dat', 'rb') as f:
        valid_nearest_words, valid_nearest_vecs = pickle.load(f)
    with open('data/secrets.txt', 'r', encoding='utf-8') as f:
        secrets = [l.strip() for l in f.readlines()]
    secret = secrets[start_idx]
    print("dumping nearest")
    nearest = dump_nearest(secret, valid_nearest_words, valid_nearest_vecs)
    print("launching app")
    app.run(host='0.0.0.0', port=5000)
