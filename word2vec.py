from typing import Dict, Optional

from numpy import array
from numpy.linalg import norm


class Word2VecDb:
    def __init__(self, path: str):
        self.dict = load_db(path)

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
