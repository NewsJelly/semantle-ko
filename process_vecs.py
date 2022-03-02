import json
import pickle

import numpy as np

from word2vec import Word2VecDb


def valid_guess(s: str) -> bool:
    if all(c.isalpha() or c in '.-' for c in s):
        if all(c in '.-' for c in s):
            return False
        else:
            return True
    else:
        return False


if __name__ == '__main__':
    original_data = Word2VecDb('data/COW.token.wang2vec')
    print("original # words:", len(original_data.dict))
    known_words = set(json.load(open('data/dictionary.json')).keys())
    print("# words in dictionary:", len(known_words))
    valid_nearest = [w for w in original_data.dict.keys() if w in known_words]
    valid_nearest_mat = np.array([original_data.dict[w] for w in valid_nearest])
    print("valid nearest shape:", valid_nearest_mat.shape)
    with open('data/valid_nearest.dat', 'wb') as f:
        pickle.dump((valid_nearest, valid_nearest_mat), f)
    print("done pickling matrix")

    invalids = set()
    for k in original_data.dict:
        if not valid_guess(k):
            invalids.add(k)
    for i in invalids:
        del original_data.dict[i]

    print("# all valid guesses:", len(original_data.dict))
    with open('data/all_valid_guesses.dat', 'wb') as f:
        pickle.dump(original_data, f)
