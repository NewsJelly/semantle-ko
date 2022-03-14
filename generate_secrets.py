import json
from random import Random

import numpy as np
import spacy

from process_vecs import load_dic

rnd = Random(133742069)
n_most_frequent_words = 8500
# need to download data with 'python -m spacy download de_core_news_sm'
nlp = spacy.load('de_core_news_sm')


def word_to_lemma(word: str) -> str:
    return [x.lemma_ for x in nlp(word)][0]


if __name__ == '__main__':
    with open('data/dictionary.json', 'r', encoding='utf-8') as f:
        dic = json.load(f)
    words, counts = np.array([[k, v] for k, v in dic.items()]).T
    counts = np.array([int(c) for c in counts])
    frequent_idxs = np.argpartition(counts, -n_most_frequent_words)[-n_most_frequent_words:]
    print(f"{n_most_frequent_words}th count:", counts[frequent_idxs[0]])
    frequent_counts = counts[frequent_idxs]
    frequent_idxs = frequent_idxs[np.argsort(frequent_counts)]
    frequent_words = words[frequent_idxs]
    known_words = load_dic('data/de.dic', True)
    frequent_with_capital = set()
    for w in frequent_words:
        if w in known_words:
            frequent_with_capital.add(w)
        if w.capitalize() in known_words:
            frequent_with_capital.add(w.capitalize())
    print("# valid (frequent + capitalized):", len(frequent_with_capital))
    lemmatized_words = set(word_to_lemma(str(w)).lower() for w in frequent_with_capital)
    lemmatized_words.remove("blaß")
    lemmatized_words.remove("naß")
    lemmatized_words.remove("gewiß")
    print("# valid base words:", len(lemmatized_words))
    shuffle_list = list(lemmatized_words)
    shuffle_list.sort()
    rnd.shuffle(shuffle_list)
    # are there any names i should remove? other words?
    with open('data/secrets.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(shuffle_list))
