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
wget http://www.texttechnologylab.org/files/embeddings-icmla2018/COW.lower.zip
unzip COW.lower.zip
wget https://www.winedt.org/dict/German.zip
unzip German.zip
rm COW.lower.zip
rm readme.txt
rm German.zip
```

save word2vec in db
```bash
cd ..
python process_vecs.py
```

(optional) Regenerate secrets
```bash
cd data
wget http://www.ids-mannheim.de/fileadmin/kl/derewo/derewo-v-ww-bll-320000g-2012-12-31-1.0.zip
unzip derewo-v-ww-bll-320000g-2012-12-31-1.0.zip
python generate_secrets.py
```
