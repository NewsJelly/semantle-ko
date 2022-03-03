import json
import numpy as np
from random import Random

from process_vecs import load_dic

rnd = Random(133742069)
n_most_frequent_words = 6500

if __name__ == '__main__':
    with open('data/dictionary.json', 'r', encoding='utf-8') as f:
        dic = json.load(f)
    words, counts = np.array([[k, v] for k, v in dic.items()]).T
    counts = np.array([int(c) for c in counts])
    frequent_idxs = np.argpartition(counts, -n_most_frequent_words)[-n_most_frequent_words:]
    print(f"{n_most_frequent_words}th count:", frequent_idxs[0])
    frequent_idxs = frequent_idxs[np.argsort(counts[frequent_idxs])]
    frequent_words = words[frequent_idxs]
    known_words = load_dic('data/de.dic')
    frequent_words = [w for w in frequent_words if w in known_words]
    # todo: lemmatize
    rnd.shuffle(frequent_words)
    print("# valid frequent words:", len(frequent_words))
    # todo: write to js
    with open('data/secrets.txt', 'w', encoding='utf-8') as f:
        f.write("\n".join(frequent_words))
