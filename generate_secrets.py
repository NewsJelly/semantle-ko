from random import Random
import pickle
import unicodedata
from process_vecs import is_hangul

rnd = Random(67543233)

early_solutions = [
    '찌르다',
    '비빔밥',
    '생일',
    '미팅',
    '도서관',
    '경비',
    '주식',
    '쏘다',
    '넷째',
    '좌석',
    '스치다',
    '온통',
    '왼손',
    '흑인',
    '혹은',
    '진행',
    '운동장',
]

if __name__ == '__main__':
    with open('data/valid_nearest.dat', 'rb') as f:
        valid_nearest_words, _ = pickle.load(f)
    with open('data/filtered_frequent_words.txt', 'r', encoding='UTF-8') as f:
        file_content = f.readlines()
    words = set()
    removed = set()
    for line in file_content:
        word = unicodedata.normalize('NFC', line.strip())
        if is_hangul(word) and len(word) >= 2 and word in valid_nearest_words:
            words.add(word)
        else:
            removed.add(word)
    words = words.difference(early_solutions)
    print('removed:', len(removed), removed)
    shuffle_list = list(words)
    shuffle_list.sort()
    rnd.shuffle(shuffle_list)
    shuffle_list = early_solutions + shuffle_list
    print('# words:', len(shuffle_list))
    with open('data/secrets.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(shuffle_list))
