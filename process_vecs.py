import pickle
from typing import Set
import sqlite3

import numpy as np

from word2vec import load_db


def valid_guess(s: str) -> bool:
    if all(c.isalpha() or c in '.-' for c in s):
        if all(c in '.-' for c in s):
            return False
        else:
            return True
    else:
        return False


def load_dic(path: str, allow_capitalization: bool = False) -> Set[str]:
    rtn = set()
    letters = set(c for c in 'abcdefghijklmnopqrstuvwxyzäöǘß')
    start_idx = 1 if allow_capitalization else 0
    with open(path, 'r', encoding='utf-16') as f:
        for line in f.readlines():
            word = line.strip().lower() if not allow_capitalization else line.strip()
            if all(c in letters for c in word[start_idx:]):
                rtn.add(word)
    return rtn


if __name__ == '__main__':
    original_data = load_db('data/COW.token.wang2vec')
    print("original # words:", len(original_data))
    known_words = load_dic('data/de.dic')
    print("# words in dictionary:", len(known_words))
    valid_nearest = [w for w in original_data.keys() if w in known_words]
    valid_nearest_mat = np.array([original_data[w] for w in valid_nearest])
    print("valid nearest shape:", valid_nearest_mat.shape)
    with open('data/valid_nearest.dat', 'wb') as f:
        pickle.dump((valid_nearest, valid_nearest_mat), f)
    print("done pickling matrix")

    connection = sqlite3.connect('data/valid_guesses.db')
    cursor = connection.cursor()
    cursor.execute("""CREATE TABLE IF NOT EXISTS guesses (word text PRIMARY KEY, vec blob)""")
    print("created table")
    with connection:
        for k, v in original_data.items():
            if valid_guess(k):
                cursor.execute("""INSERT INTO guesses values (?, ?)""", (k, pickle.dumps(v)))
    connection.close()