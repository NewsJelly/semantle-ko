### Setup
create virtualenv:
```bash
python3.10 -m venv semantle-de
source semantle-de/bin/activate
```

install requirements
̀´´´bash
pip install -r requirements.txt
´´´

Download spacy model (optional, if you want to regenerate secrets)
´´´bash
pip install spacy~=3.2.3
python -m spacy download de_core_news_sm
´´´

Download Word2Vec data:
´´´bash
cd data
wget http://www.texttechnologylab.org/files/embeddings-icmla2018/COW.lower.zip
unzip COW.lower.zip
rm COW.lower.zip
´´´

save word2vec in db
´´´bash

´´´


