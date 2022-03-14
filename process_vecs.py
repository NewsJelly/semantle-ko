import pickle
import sqlite3
from typing import Set

import numpy as np
from numpy import array


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
    connection = sqlite3.connect('data/valid_guesses.db')
    cursor = connection.cursor()
    cursor.execute("""CREATE TABLE IF NOT EXISTS guesses (word text PRIMARY KEY, vec blob)""")
    print("created table")
    known_words = load_dic('data/de.dic')
    print("# words in dictionary:", len(known_words))
    valid_nearest = []
    valid_nearest_mat = None
    with open('data/COW.token.wang2vec', 'r', encoding='utf-8') as w2v_file:
        _ = w2v_file.readline()
        for n, line in enumerate(w2v_file):
            # careful! some data sets (e.g. dewiki100.txt) have non-breaking spaces, which get split
            # others have trailing spaces (e.g. COW.token.wang2vec), meaning an empty string is included with split(' ')
            words = line.split()
            word = words[0]
            vec = array([float(w1) for w1 in words[1:]])
            if word in known_words:
                valid_nearest.append(word)
                if valid_nearest_mat is None:
                    valid_nearest_mat = np.array([vec])
                else:
                    np.append(valid_nearest_mat, [vec], axis=0)
            if valid_guess(word):
                cursor.execute("""INSERT INTO guesses values (?, ?)""", (word, pickle.dumps(vec)))
            if n % 100000 == 0:
                print(f"processed {n} (+1) lines")
                connection.commit()
    connection.commit()
    connection.close()
    print("valid nearest shape:", valid_nearest_mat.shape)
    with open('data/valid_nearest.dat', 'wb') as f:
        pickle.dump((valid_nearest, valid_nearest_mat), f)
    print("done pickling matrix")
