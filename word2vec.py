import heapq
from typing import Dict, List, Tuple, Optional

from numpy import array
from numpy.linalg import norm


class Word2VecDb:
    def __init__(self, path: str):
        self.dict = load_db(path)

    # todo: replace with numpy matrix stuff
    # dists = vecmat.dot(example_vec) / (np.linalg.norm(vecmat, axis = 1) * np.linalg.norm(example_vec))
    def most_similar(self, word: str, n: int) -> List[Tuple[str, float]]:
        vec = self.dict[word]
        sims = [(k, cosine_similarity(vec, self.dict[k])) for k, v in self.dict.items()]
        return heapq.nlargest(n, sims, key=lambda x: x[1])

    def similarity(self, word1: str, word2: str) -> Optional[float]:
        try:
            return cosine_similarity(self.dict[word1], self.dict[word2])
        except KeyError:
            return None


def load_db(path: str) -> Dict[str, array]:
    rtn = dict()
    with open(path, 'r', encoding='utf-8') as f:
        _ = f.readline()
        for line in f.readlines():
            # careful! some data sets (e.g. dewiki100.txt) have non-breaking spaces, which get split
            # others have trailing spaces (e.g. COW.token.wang2vec), meaning an empty string is included with split(' ')
            words = line.split()
            rtn[words[0]] = array([float(w) for w in words[1:]])
    return rtn


def cosine_similarity(vec1: array, vec2: array) -> float:
    return vec1.dot(vec2) / (norm(vec1) * norm(vec2))
