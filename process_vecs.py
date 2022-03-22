import pickle
import sqlite3
from typing import Set

import numpy as np
from numpy import array


def valid_guess(s: str) -> bool:
    if all(c.isalpha() or c in '.-' for c in s):
        return any(c.isalpha() for c in s)
    else:
        return False


def only_normal_letters(word: str, allow_capitalization:bool = False) -> bool:
    lowers = set(c for c in 'abcdefghijklmnopqrstuvwxyzäöǘß')
    uppers = set(c for c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜẞ')
    both = lowers.union(uppers)
    if allow_capitalization:
        return all(c in both for c in word)
    else:
        return all(c in lowers for c in word)


def load_dic(path: str, allow_capitalization: bool = False) -> Set[str]:
    rtn = set()
    with open(path, 'r', encoding='utf-16') as f:
        for line in f.readlines():
            word = line.strip()
            if only_normal_letters(word, allow_capitalization):
               rtn.add(word)
    return rtn


if __name__ == '__main__':
    connection = sqlite3.connect('data/valid_guesses.db')
    cursor = connection.cursor()
    cursor.execute("""CREATE TABLE IF NOT EXISTS guesses (word text PRIMARY KEY, vec blob)""")
    print("created table")
    normal_words = load_dic('data/de.dic', True)
    print("# words in dictionary:", len(normal_words))
    valid_nearest = []
    valid_nearest_mat = None
    eliminated = 0
    with open('data/cc.de.300.vec', 'r', encoding='utf-8') as w2v_file:
        _ = w2v_file.readline()
        for n, line in enumerate(w2v_file):
            # careful! some data sets (e.g. dewiki100.txt) have non-breaking spaces, which get split
            # others have trailing spaces (e.g. COW.token.wang2vec), meaning an empty string is included with split(' ')
            words = line.rstrip().split(' ')
            word = words[0]
            vec = array([float(w1) for w1 in words[1:]])
            if word in normal_words:
                valid_nearest.append(word)
                if valid_nearest_mat is None:
                    valid_nearest_mat = [vec]
                else:
                    valid_nearest_mat.append(vec)
            if valid_guess(word):
                cursor.execute("""INSERT INTO guesses values (?, ?)""", (word, pickle.dumps(vec)))
            else:
                eliminated += 1
            if n % 100000 == 0:
                print(f"processed {n} (+1) lines")
                connection.commit()
    connection.commit()
    connection.close()
    print("invalid:", eliminated)
    valid_nearest_mat = np.array(valid_nearest_mat)
    print("valid nearest shape:", valid_nearest_mat.shape)
    with open('data/valid_nearest.dat', 'wb') as f:
        pickle.dump((valid_nearest, valid_nearest_mat), f)
    print("done pickling matrix")
