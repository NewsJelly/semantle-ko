from transformers import TextClassificationPipeline, BertForSequenceClassification, AutoTokenizer
import tqdm
import unicodedata

def get_predicated_label(output_labels, min_score):
    for label in output_labels:
        if label['score'] > min_score:
            return label
    return {
        'label': 'unknown',
        'score': 0,
    }
            

if __name__ == '__main__':
    model_name = 'smilegate-ai/kor_unsmile'

    model = BertForSequenceClassification.from_pretrained(model_name)
    tokenizer = AutoTokenizer.from_pretrained(model_name)

    pipe = TextClassificationPipeline(
        model=model,
        tokenizer=tokenizer,
        device=-1,
        return_all_scores=True,
        function_to_apply='sigmoid'
    )

    # frequent_words
    with open('data/frequent_words.txt', 'r', encoding='UTF-8') as f:
        words = list(unicodedata.normalize('NFC', line.strip()) for line in tqdm.tqdm(f))
    filtered_words = []

    for index, out in enumerate(tqdm.tqdm(pipe(x for x in words), total=len(words))):
        label = get_predicated_label(out, 0.5)
        try:
            if label['label'] == 'clean':
                filtered_words.append(words[index])
            else:
                print(f'filtered: {words[index]} - {label["label"]}/{label["score"]}')
        except:
            print(f'unknown: {words[index]}')

    with open('data/filtered_frequent_words.txt', 'w', encoding='UTF-8') as f:
        f.write('\n'.join(tqdm.tqdm(filtered_words)))

    # dictionary
    with open('data/ko-aff-dic-0.7.92/ko.dic', 'r', encoding='UTF-8') as f:
        words = list(unicodedata.normalize('NFC', line.strip().split('/')[0]) for line in tqdm.tqdm(f))
    filtered_words = []

    for index, out in enumerate(tqdm.tqdm(pipe(x for x in words), total=len(words))):
        label = get_predicated_label(out, 0.5)
        try:
            if label['label'] == 'clean':
                filtered_words.append(words[index])
            else:
                print(f'filtered: {words[index]} - {label["label"]}/{label["score"]}')
        except:
            print(f'unknown: {words[index]}')

    with open('data/ko-aff-dic-0.7.92/ko_filtered.txt', 'w', encoding='UTF-8') as f:
        f.write('\n'.join(tqdm.tqdm(filtered_words)))