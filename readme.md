# 꼬맨틀 — 단어 유사도 추측 게임

이 레포지터리는 Johannes Gätjen의 [Semantlich](http://semantlich.johannesgaetjen.de/)
([소스코드](https://github.com/gaetjen/semantle-de))를 포크하여,
한국어로 플레이할 수 있도록 수정한 것입니다.

### Setup
create virtualenv:
```bash
python3.10 -m venv semantle-ko
source semantle-ko/bin/activate
```

install requirements
```bash
pip install -r requirements.txt
```

Download Word2Vec and dictionary data:
```bash
cd data
wget https://dl.fbaipublicfiles.com/fasttext/vectors-crawl/cc.ko.300.vec.gz
gzip -d cc.ko.300.vec.gz
wget https://github.com/acidsound/korean_wordlist/raw/master/wordslistUnique.txt
```

save word2vec in db
```bash
cd ..
python process_vecs.py
```

(optional) Regenerate secrets
```bash
python generate_secrets.py
```
