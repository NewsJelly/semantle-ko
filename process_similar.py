import pickle
from typing import Tuple, List, Dict

import numpy as np
from numpy import array


def most_similar(mat: array, idx: int, k: int) -> Tuple[array, array]:
    vec = mat[idx]
    dists = mat.dot(vec) / (np.linalg.norm(mat, axis=1) * np.linalg.norm(vec))
    top_idxs = np.argpartition(dists, -k)[-k:]
    dist_sort_args = dists[top_idxs].argsort()[::-1]
    return top_idxs[dist_sort_args], dists[top_idxs][dist_sort_args]


# Todo: type?
def dump_nearest(word: str, words: List[str], mat: array, k: int = 1000) -> Dict[str, Tuple]:
    word_idx = words.index(word)
    sim_idxs, sim_dists = most_similar(mat, word_idx, k + 1)
    words_a = np.array(words)
    sort_args = np.argsort(sim_dists)[::-1]
    words_sorted = words_a[sim_idxs[sort_args]]
    dists_sorted = sim_dists[sort_args]
    result = np.array([words_sorted, dists_sorted]).T
    closeness = {word: ("Gefunden!", 1)}
    for idx, (w, d) in enumerate(result[1:]):
        closeness[w] = (k - idx, d)
    with open(f'data/near/{word}.dat', 'wb') as f:
        pickle.dump(closeness, f)
    return closeness


if __name__ == '__main__':
    top_k = 1001
    with open('data/valid_nearest.dat', 'rb') as f:
        words, mat = pickle.load(f)
    word = 'ewig'
    word_idx = words.index(word)
    sim_idxs, sim_dists = most_similar(mat, word_idx, top_k)
    words_a = np.array(words)
    sort_args = np.argsort(sim_dists)[::-1]
    words_sorted = words_a[sim_idxs[sort_args]]
    dists_sorted = sim_dists[sort_args]
    result = np.array([words_sorted, dists_sorted]).T
    # todo: proper formatting
    with open('data/' + word + '_nearest.txt', 'w', encoding='utf-8') as f:
        for line in result:
            f.write(str(line) + "\n")
