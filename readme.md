### Setup
create virtualenv:
```bash
python3.10 -m venv semantle-de
source semantle-de/bin/activate
```

install requirements
```bash
pip install -r requirements.txt
```

Download Word2Vec and dictionary data:
```bash
cd data
wget https://dl.fbaipublicfiles.com/fasttext/vectors-crawl/cc.de.300.vec.gz
gzip -d cc.de.300.vec.gz
wget https://www.winedt.org/dict/German.zip
unzip German.zip
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
