import pickle
import sqlite3
from typing import Optional

from numpy import array
from numpy.linalg import norm


def similarity(word1: str, word2: str) -> float:
    return cosine_similarity(get_word_vec(word1), get_word_vec(word2))


def get_word_vec(word: str) -> Optional[array]:
    cur = sqlite3.connect('data/valid_guesses.db').cursor()
    cur.execute('SELECT vec FROM guesses WHERE word == ?', (word,))
    if (fetched := cur.fetchone()) is not None:
        return pickle.loads(fetched[0])
    else:
        raise KeyError(f'word {word} not found in DB')


def cosine_similarity(vec1: array, vec2: array) -> float:
    return vec1.dot(vec2) / (norm(vec1) * norm(vec2))
