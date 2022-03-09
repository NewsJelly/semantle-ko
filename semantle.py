import pickle
import waitress
from flask import (
    Flask,
    send_file,
    send_from_directory,
    jsonify
)

import word2vec
from process_similar import dump_nearest

app = Flask(__name__)
# todo: dependent on current day / check if already exists / start job every 24 h
app.start_idx = 1002
print("loading valid nearest")
with open('data/valid_nearest.dat', 'rb') as f:
    valid_nearest_words, valid_nearest_vecs = pickle.load(f)
with open('data/secrets.txt', 'r', encoding='utf-8') as f:
    secrets = [l.strip() for l in f.readlines()]
app.secret = secrets[app.start_idx]
print("dumping nearest")
app.nearest = dump_nearest(app.secret, valid_nearest_words, valid_nearest_vecs)


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
    if word in app.nearest:
        rtn["sim"] = app.nearest[word][1]
        rtn["rank"] = app.nearest[word][0]
    else:
        try:
            rtn["sim"] = word2vec.similarity(app.secret, word)
            rtn["rank"] = "(kalt)"
        except KeyError:
            return 'Word unknown', 404
    return jsonify(rtn)


@app.route('/similarity/<int:day>')
def get_similarity(day: int):
    nearest_dists = sorted([v[1] for v in app.nearest.values()])
    return jsonify({"top": nearest_dists[-2], "top10": nearest_dists[-12], "rest": nearest_dists[0]})


print("starting waitress")
waitress.serve(app, host='0.0.0.0', port=5000, threads=1)
