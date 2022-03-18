from random import Random

rnd = Random(133742069)
n_most_frequent_words = 5000
manual_multiples = {'jede', 'linker', 'erstes', 'letzte', 'äußerer', 'viertes', 'fünfte', 'vorderer', 'einiges',
                    'dritte', 'zweiter', 'jegliches', 'jene', 'kein', 'sämtliche', 'irgendeiner', 'dies', 'solche',
                    'äußerster', 'welches', 'irgendwelche', 'siebter', 'manches', 'sechste', 'neunter', 'zehntes',
                    'derselbe', 'die', 'dasjenige', 'eine', 'ein'}

if __name__ == '__main__':
    with open('data/derewo-v-ww-bll-320000g-2012-12-31-1.0.txt', 'r') as f:
        file_content = f.readlines()
    words = [line.split()[0].lower() for line in file_content if line[0] != '#'][:n_most_frequent_words]
    words = set(w for w in words if all(c in 'abcdefghijklmnopqrstuvwxyzäöüß' for c in w)).union(manual_multiples)
    print('# words:', len(words))
    shuffle_list = list(words)
    shuffle_list.sort()
    rnd.shuffle(shuffle_list)
    with open('data/secrets.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(shuffle_list))
